import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  acceptanceRecordSemanticIssues,
  approvalEvidenceSemanticIssues,
  CANONICAL_GITHUB_REPOSITORY,
  createSchemaValidator,
  parseImmutableEvidenceUrl,
  policyDocumentIssues,
  sha256,
} from "../archsync-core/scripts/architecture-change-policy.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const prefix = "archsync-core";
const coreRoot = join(root, prefix);
const expectedRepository = `https://github.com/${CANONICAL_GITHUB_REPOSITORY}.git`;

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  }
  return result;
}

function sourceTree(text) {
  return new Map(text.trim().split(/\r?\n/u).filter(Boolean).map((line) => {
    const match = /^(\d+) blob ([0-9a-f]{40})\t(.+)$/u.exec(line);
    if (!match) throw new Error(`unexpected source tree entry: ${line}`);
    return [match[3], `${match[1]}:${match[2]}`];
  }));
}

function importedIndex(text) {
  return new Map(text.trim().split(/\r?\n/u).filter(Boolean).map((line) => {
    const match = /^(\d+) ([0-9a-f]{40}) 0\tarchsync-core\/(.+)$/u.exec(line);
    if (!match) throw new Error(`unexpected imported index entry: ${line}`);
    return [match[3], `${match[1]}:${match[2]}`];
  }));
}

function compareTrees(expected, actual) {
  const issues = [];
  for (const [path, identity] of expected) {
    if (!actual.has(path)) issues.push(`imported snapshot is missing ${path}`);
    else if (actual.get(path) !== identity) issues.push(`imported snapshot differs at ${path}`);
  }
  for (const path of actual.keys()) {
    if (!expected.has(path)) issues.push(`imported snapshot has unpinned file ${path}`);
  }
  return issues;
}

function validationIssues(validate, value, label) {
  if (validate(value)) return [];
  return (validate.errors ?? []).map(
    (error) => `${label}${error.instancePath || "/"}: ${error.message}`,
  );
}

function fileEvidenceIssues(entry, expectedFile, expectedSha256, label) {
  if (!entry || entry.file !== expectedFile || entry.sha256 !== expectedSha256) {
    return [`phase-1 evidence does not bind the imported ${label} bytes`];
  }
  return [];
}

const manifest = JSON.parse(await readFile(join(root, "repos.lock.json"), "utf8"));
const source = manifest.repositories?.find(({ path }) => path === prefix);
const issues = [];

if (source?.repository !== expectedRepository || source?.branch !== "main"
    || !/^[0-9a-f]{40}$/u.test(source?.commit ?? "")) {
  issues.push(`repos.lock.json must pin ${expectedRepository} main by a full commit`);
}

const subtreeCommitResult = git([
  "log",
  "--format=%H",
  `--grep=git-subtree-dir: ${prefix}`,
  "-n",
  "1",
]);
const subtreeCommit = subtreeCommitResult.stdout.trim();
if (!/^[0-9a-f]{40}$/u.test(subtreeCommit)) {
  issues.push("cannot resolve the latest Core subtree source snapshot");
} else {
  const message = git(["show", "-s", "--format=%B", subtreeCommit]).stdout;
  const split = message.match(/git-subtree-split:\s*([0-9a-f]{40})/iu)?.[1];
  if (split !== source?.commit) {
    issues.push(`Core subtree split ${split ?? "missing"} does not match source pin ${source?.commit ?? "missing"}`);
  }

  const expected = sourceTree(git(["ls-tree", "-r", subtreeCommit]).stdout);
  const actual = importedIndex(git(["ls-files", "-s", "--", prefix]).stdout);
  issues.push(...compareTrees(expected, actual));
}

if (git(["diff", "--quiet", "--", prefix], { allowFailure: true }).status !== 0) {
  issues.push("Core subtree working tree differs from its pinned index snapshot");
}

const [
  policy,
  procedure,
  evidenceProcedure,
  ciWorkflow,
  recordFiles,
  evidenceFiles,
  recordSchema,
  evidenceSchema,
  phase1Evidence,
] = await Promise.all([
  readFile(join(coreRoot, "docs", "adr", "0004-architecture-change-policy-proposed.md"), "utf8"),
  readFile(join(coreRoot, "docs", "adr", "acceptance-records", "README.md"), "utf8"),
  readFile(join(coreRoot, "docs", "adr", "acceptance-evidence", "README.md"), "utf8"),
  readFile(join(coreRoot, ".github", "workflows", "ci.yml"), "utf8"),
  readdir(join(coreRoot, "docs", "adr", "acceptance-records")),
  readdir(join(coreRoot, "docs", "adr", "acceptance-evidence")),
  readFile(join(coreRoot, "specs", "gov103-acceptance-record.schema.json"), "utf8").then(JSON.parse),
  readFile(join(coreRoot, "specs", "gov103-approval-evidence.schema.json"), "utf8").then(JSON.parse),
  readFile(join(coreRoot, "evidence", "phase-1-evidence.json"), "utf8").then(JSON.parse),
]);

issues.push(...policyDocumentIssues(policy, procedure, evidenceProcedure, ciWorkflow));

const recordJson = recordFiles.filter((name) => name.endsWith(".json"));
const evidenceJson = evidenceFiles.filter((name) => name.endsWith(".json"));
let status = "PROPOSED_PENDING_HUMAN";

if (recordJson.length === 0 && evidenceJson.length === 0) {
  // A policy-only source pin is valid, but it cannot represent human acceptance.
} else if (recordJson.length !== 1 || evidenceJson.length !== 1) {
  issues.push(
    `closed GOV-103 import requires exactly one evidence and one closure JSON; found ${evidenceJson.length} evidence and ${recordJson.length} closure`,
  );
} else {
  const evidencePath = `docs/adr/acceptance-evidence/${evidenceJson[0]}`;
  const recordPath = `docs/adr/acceptance-records/${recordJson[0]}`;
  const [evidenceBytes, recordBytes] = await Promise.all([
    readFile(join(coreRoot, evidencePath)),
    readFile(join(coreRoot, recordPath)),
  ]);
  let evidence;
  let record;
  try {
    evidence = JSON.parse(evidenceBytes.toString("utf8"));
    record = JSON.parse(recordBytes.toString("utf8"));
  } catch (error) {
    issues.push(`governed evidence/closure JSON is invalid: ${error.message}`);
  }

  if (evidence && record) {
    const validateEvidence = createSchemaValidator(evidenceSchema);
    const validateRecord = createSchemaValidator(recordSchema);
    issues.push(...validationIssues(validateEvidence, evidence, "approval evidence"));
    issues.push(...validationIssues(validateRecord, record, "closure record"));
    issues.push(...approvalEvidenceSemanticIssues(evidence).map((issue) => `approval evidence: ${issue}`));
    issues.push(...acceptanceRecordSemanticIssues(record).map((issue) => `closure record: ${issue}`));

    const policySha256 = sha256(Buffer.from(policy, "utf8"));
    if (evidence.policy_sha256 !== policySha256 || record.policy_sha256 !== policySha256) {
      issues.push("approval evidence and closure must bind the exact imported policy bytes");
    }
    for (const field of [
      "policy_id",
      "policy_revision",
      "policy_commit",
      "policy_sha256",
      "actor_type",
      "accepted_by",
      "accountable_role",
      "decision",
      "accepted_at_utc",
    ]) {
      if (evidence[field] !== record[field]) {
        issues.push(`approval evidence and closure differ at ${field}`);
      }
    }

    const evidenceLocation = parseImmutableEvidenceUrl(record.evidence_url);
    if (!evidenceLocation
        || evidenceLocation.owner !== "Little-Boy-s-ArchSync"
        || evidenceLocation.repository !== "archsync-core"
        || evidenceLocation.path !== evidencePath
        || evidenceLocation.commit !== record.evidence_commit) {
      issues.push("closure evidence_url must bind the imported Core evidence path and commit");
    }

    if (typeof record.accepted_at_utc === "string"
        && typeof record.policy_revision === "string"
        && typeof record.policy_sha256 === "string") {
      const expectedRecordName = `${record.accepted_at_utc.slice(0, 10).replaceAll("-", "")}-${record.policy_revision}-${record.policy_sha256.slice(0, 12)}.json`;
      if (recordJson[0] !== expectedRecordName) {
        issues.push(`closure filename must be ${expectedRecordName}`);
      }
    } else {
      issues.push("closure filename cannot be verified until its identity fields are valid");
    }

    const governanceEvidence = phase1Evidence.governance_policy;
    if (governanceEvidence?.status !== "closure-record-present-authenticity-review-required") {
      issues.push("phase-1 evidence must report the imported closure state without inferring human authenticity");
    }
    if (governanceEvidence?.file !== "docs/adr/0004-architecture-change-policy-proposed.md"
        || governanceEvidence?.sha256 !== policySha256) {
      issues.push("phase-1 evidence does not bind the imported policy bytes");
    }
    issues.push(...fileEvidenceIssues(
      governanceEvidence?.approval_evidence_files?.[0],
      evidencePath,
      sha256(evidenceBytes),
      "approval evidence",
    ));
    issues.push(...fileEvidenceIssues(
      governanceEvidence?.acceptance_record_files?.[0],
      recordPath,
      sha256(recordBytes),
      "closure record",
    ));
    if (governanceEvidence?.approval_evidence_files?.length !== 1
        || governanceEvidence?.acceptance_record_files?.length !== 1) {
      issues.push("phase-1 evidence must enumerate exactly one approval evidence and one closure record");
    }
    status = "CLOSURE_RECORD_VALIDATED_AUTHENTICITY_REVIEW_REQUIRED";
  }
}

for (const relative of [
  ["specs", "gov103-acceptance-record.schema.json"],
  ["specs", "gov103-approval-evidence.schema.json"],
]) {
  try {
    JSON.parse(await readFile(join(coreRoot, ...relative), "utf8"));
  } catch (error) {
    issues.push(`${relative.join("/")} is not valid JSON: ${error.message}`);
  }
}

if (issues.length > 0) {
  throw new Error(`IMPORTED CORE GOV-103 SNAPSHOT INVALID\n- ${issues.join("\n- ")}`);
}

console.log(`VALID IMPORTED CORE GOV-103 SNAPSHOT ${status} (${source.commit})`);
