import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  REQUIRED_RESEARCH_APPROVALS,
  REQUIRED_RESEARCH_ARTIFACTS,
  REQUIRED_RESEARCH_CHECKS,
  RESEARCH_RELEASE_TEMPLATE,
  assertResearchReleaseTemplate,
  buildResearchReleaseVerificationLog,
  canonicalJson,
  safeResearchArtifactPath,
  sha256,
  validateResearchReleaseManifest,
} from "./research-release-contract.mjs";
import { main, verifyResearchReleaseArtifacts } from "../research-release-dry-run.mjs";

const COMMIT = "a".repeat(40);
const EVIDENCE = "e".repeat(64);

const artifactValues = {
  "p7-results": { task_id: "P7-101", status: "approved-release-evidence" },
  "paper-results": {
    schema_version: "0.1.0",
    status: "generated-evidence",
    tables: [{ id: "table-1" }],
    figures: [{ id: "figure-1" }],
    report: { path: "report.md" },
  },
  "claim-evidence": "claim_id,status,evidence_artifact,verification\nC-001,verified,evidence.json,validator\n",
  "benchmark-results": { status: "frozen-evidence", provisional: false, result_count: 3 },
  "reproduction-audit": {
    status: "passed",
    independent: true,
    auditor: "Reviewer Three",
    result_producer: "Producer One",
    checks_passed: 5,
    checks_total: 5,
  },
  "product-release": {
    schema_version: "1.0.0",
    release_version: "0.3.3",
    immutable_assets: true,
    packages: [{ name: "@archsync/core" }],
  },
  "rollback-drill": {
    schema_version: "1.0.0",
    current_version: "v0.3.3",
    rollback_version: "v0.3.2",
    active_after_drill: "v0.3.2",
    immutable_overwrite_blocked: true,
    current_snapshot: { digest: "a" },
    rollback_snapshot: { digest: "b" },
  },
};

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "archsync-rel102-"));
  await mkdir(join(root, "inputs"), { recursive: true });
  const artifacts = [];
  for (const [id, kind] of REQUIRED_RESEARCH_ARTIFACTS) {
    const value = artifactValues[id];
    const bytes = Buffer.from(typeof value === "string" ? value : canonicalJson(value), "utf8");
    const path = `inputs/${id}${id === "claim-evidence" ? ".csv" : ".json"}`;
    await writeFile(join(root, path), bytes);
    artifacts.push({
      id,
      kind,
      path,
      sha256: sha256(bytes),
      source_repository: id === "paper-results" || id === "claim-evidence"
        ? "Little-Boy-s-ArchSync/archsync-paper"
        : id === "benchmark-results" || id === "reproduction-audit"
          ? "Little-Boy-s-ArchSync/archsync-benchmark"
          : "Little-Boy-s-ArchSync/archsync",
      source_commit: COMMIT,
    });
  }
  const artifactMap = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  const manifest = {
    schema_version: "1.0.0",
    task_id: "REL-102",
    status: "candidate",
    release_version: "0.3.3",
    source_commit: COMMIT,
    created_at: "2026-08-26T01:02:03Z",
    result_producer: "Producer One",
    artifacts,
    verification: REQUIRED_RESEARCH_CHECKS.map(([id, inputId]) => ({
      id,
      status: "passed",
      validator: `archsync:${id}@1.0.0`,
      validator_commit: COMMIT,
      input_sha256: artifactMap.get(inputId).sha256,
      evidence_sha256: EVIDENCE,
    })),
    approvals: REQUIRED_RESEARCH_APPROVALS.map((role) => ({
      role,
      actor: role === "independent-reproducer" ? "Reviewer Three" : `${role} actor`,
      decision: "approved",
      decided_at: "2026-08-26T02:03:04Z",
      evidence_sha256: EVIDENCE,
    })),
  };
  await writeFile(join(root, "candidate.json"), canonicalJson(manifest));
  await writeFile(join(root, "research-release-candidate.template.json"), canonicalJson(RESEARCH_RELEASE_TEMPLATE));
  return { root, manifest };
}

test("keeps the committed template empty, blocked and explicitly non-evidence", () => {
  const issues = assertResearchReleaseTemplate(RESEARCH_RELEASE_TEMPLATE);
  assert.ok(issues.length >= 6);
  assert.match(issues.join("\n"), /blocked templates are not release evidence/u);
  assert.throws(
    () => assertResearchReleaseTemplate({ ...RESEARCH_RELEASE_TEMPLATE, status: "candidate" }),
    /exact blocked, empty, non-evidence/u,
  );
});

test("accepts a complete provenance-bound research release candidate", async () => {
  const { root, manifest } = await createFixture();
  assert.deepEqual(validateResearchReleaseManifest(manifest), []);
  const log = await verifyResearchReleaseArtifacts(manifest, root);
  assert.equal(log.status, "verified-candidate-not-published");
  assert.equal(log.publication_authorized, false);
  assert.equal(log.artifacts.length, REQUIRED_RESEARCH_ARTIFACTS.length);
  assert.equal(log.verification.length, REQUIRED_RESEARCH_CHECKS.length);
  assert.equal(log.manifest_sha256, sha256(Buffer.from(canonicalJson(manifest), "utf8")));
  assert.equal(canonicalJson(log), canonicalJson(buildResearchReleaseVerificationLog(manifest)));
});

test("rejects missing results, verification, approvals and formal candidate identity", () => {
  const issues = validateResearchReleaseManifest(RESEARCH_RELEASE_TEMPLATE).join("\n");
  for (const expected of [
    "blocked templates are not release evidence",
    "release_version must be valid SemVer",
    "source_commit must be a full Git SHA",
    "canonical UTC",
    "result_producer",
    "artifacts must contain exactly 7",
    "verification must contain exactly 8",
    "approvals must contain exactly 4",
  ]) assert.match(issues, new RegExp(expected, "u"));
});

test("enforces exact ordering, hashes and independent reproduction", async () => {
  const { manifest } = await createFixture();
  const wrongArtifact = structuredClone(manifest);
  wrongArtifact.artifacts.reverse();
  assert.match(validateResearchReleaseManifest(wrongArtifact).join("\n"), /artifact identity or kind/u);

  const wrongCheck = structuredClone(manifest);
  wrongCheck.verification[0].input_sha256 = "0".repeat(64);
  assert.match(validateResearchReleaseManifest(wrongCheck).join("\n"), /input digest does not match/u);

  const selfAudit = structuredClone(manifest);
  selfAudit.approvals.find(({ role }) => role === "independent-reproducer").actor = selfAudit.result_producer;
  assert.match(validateResearchReleaseManifest(selfAudit).join("\n"), /must differ from result_producer/u);

  const extra = { ...manifest, unexpected: true };
  assert.deepEqual(validateResearchReleaseManifest(extra), ["manifest top-level fields must match REL-102 schema 1.0.0 exactly"]);
});

test("rejects absolute, traversing, platform-specific and noncanonical artifact paths", () => {
  for (const path of ["/tmp/result.json", "../result.json", "C:/result.json", "//server/share.json", "a\\b.json", "a/./b.json", "a//b.json", "."]) {
    assert.equal(safeResearchArtifactPath(path), false, path);
  }
  assert.equal(safeResearchArtifactPath("artifacts/research-release/result.json"), true);
});

test("fails closed on missing, tampered and symbolic-link evidence", async () => {
  const { root, manifest } = await createFixture();
  await writeFile(join(root, manifest.artifacts[0].path), "tampered\n");
  await assert.rejects(() => verifyResearchReleaseArtifacts(manifest, root), /SHA-256 mismatch/u);

  const missing = await createFixture();
  await unlink(join(missing.root, missing.manifest.artifacts[0].path));
  await assert.rejects(() => verifyResearchReleaseArtifacts(missing.manifest, missing.root), /ENOENT/u);

  const fresh = await createFixture();
  const artifact = fresh.manifest.artifacts[0];
  const target = join(fresh.root, artifact.path);
  const original = `${target}.original`;
  const bytes = await readFile(target);
  await writeFile(original, bytes);
  await unlink(target);
  try {
    await symlink(original, target, "file");
  } catch (error) {
    if (process.platform === "win32" && ["EPERM", "EACCES"].includes(error.code)) return;
    throw error;
  }
  await assert.rejects(() => verifyResearchReleaseArtifacts(fresh.manifest, fresh.root), /symbolic links are forbidden/u);
});

test("rejects semantically empty or provisional upstream artifacts even with valid hashes", async () => {
  for (const id of ["p7-results", "paper-results", "benchmark-results", "reproduction-audit", "product-release", "rollback-drill"]) {
    const { root, manifest } = await createFixture();
    const artifact = manifest.artifacts.find((entry) => entry.id === id);
    const bytes = Buffer.from(canonicalJson({ status: "template-not-evidence" }), "utf8");
    await writeFile(join(root, artifact.path), bytes);
    artifact.sha256 = sha256(bytes);
    for (const check of manifest.verification) {
      const expectedInput = REQUIRED_RESEARCH_CHECKS.find(([checkId]) => checkId === check.id)?.[1];
      if (expectedInput === id) check.input_sha256 = artifact.sha256;
    }
    await assert.rejects(() => verifyResearchReleaseArtifacts(manifest, root), new RegExp(id, "u"));
  }
});

test("CLI validates the blocked template and writes an immutable candidate log", async () => {
  const { root } = await createFixture();
  const output = [];
  const errors = [];
  let exitCode = 0;
  await main({
    args: ["validate-template", "research-release-candidate.template.json"],
    root,
    log: (value) => output.push(value),
    error: (value) => errors.push(value),
    setExitCode: (value) => { exitCode = value; },
  });
  assert.equal(exitCode, 0);
  assert.match(output[0], /VALID REL-102 BLOCKED TEMPLATE/u);

  await main({
    args: ["check", "candidate.json", "--write-log", "artifacts/research-release/verification.json"],
    root,
    log: (value) => output.push(value),
    error: (value) => errors.push(value),
    setExitCode: (value) => { exitCode = value; },
  });
  assert.equal(exitCode, 0);
  const written = JSON.parse(await readFile(join(root, "artifacts/research-release/verification.json"), "utf8"));
  assert.equal(written.publication_authorized, false);

  await main({
    args: ["check", "candidate.json", "--write-log", "artifacts/research-release/verification.json"],
    root,
    log: (value) => output.push(value),
    error: (value) => errors.push(value),
    setExitCode: (value) => { exitCode = value; },
  });
  assert.equal(exitCode, 1);
  assert.match(errors.at(-1), /EEXIST|file already exists/u);
});

test("CLI rejects invalid usage, escaped manifests and unsafe log destinations", async () => {
  const { root } = await createFixture();
  for (const args of [
    [],
    ["check"],
    ["check", "candidate.json", "--write-log", "release-log.json"],
    ["check", "../candidate.json"],
  ]) {
    const errors = [];
    let exitCode = 0;
    await main({
      args,
      root,
      log: () => {},
      error: (value) => errors.push(value),
      setExitCode: (value) => { exitCode = value; },
    });
    assert.notEqual(exitCode, 0, args.join(" "));
    assert.ok(errors.length > 0);
  }
});

test("CLI rejects symbolic template, manifest and verification-log parents", async () => {
  const { root } = await createFixture();
  const cases = [
    {
      link: join(root, "template-link.json"),
      target: join(root, "research-release-candidate.template.json"),
      args: ["validate-template", "template-link.json"],
    },
    {
      link: join(root, "candidate-link.json"),
      target: join(root, "candidate.json"),
      args: ["check", "candidate-link.json"],
    },
  ];
  for (const fixture of cases) {
    try {
      await symlink(fixture.target, fixture.link, "file");
    } catch (error) {
      if (process.platform === "win32" && ["EPERM", "EACCES"].includes(error.code)) return;
      throw error;
    }
    const errors = [];
    let exitCode = 0;
    await main({
      args: fixture.args,
      root,
      log: () => {},
      error: (value) => errors.push(value),
      setExitCode: (value) => { exitCode = value; },
    });
    assert.equal(exitCode, 1);
    assert.match(errors.at(-1), /symbolic links are forbidden/u);
  }

  await mkdir(join(root, "redirected-output"));
  try {
    await symlink(join(root, "redirected-output"), join(root, "artifacts"), "dir");
  } catch (error) {
    if (process.platform === "win32" && ["EPERM", "EACCES"].includes(error.code)) return;
    throw error;
  }
  const errors = [];
  let exitCode = 0;
  await main({
    args: ["check", "candidate.json", "--write-log", "artifacts/research-release/verification.json"],
    root,
    log: () => {},
    error: (value) => errors.push(value),
    setExitCode: (value) => { exitCode = value; },
  });
  assert.equal(exitCode, 1);
  assert.match(errors.at(-1), /symbolic links are forbidden/u);
});
