import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  assertResearchReleaseTemplate,
  buildResearchReleaseVerificationLog,
  canonicalJson,
  safeResearchArtifactPath,
  sha256,
  validateResearchReleaseManifest,
} from "./lib/research-release-contract.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function isInside(root, target) {
  const rel = relative(root, target);
  return rel !== "" && !rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel);
}

async function readJson(path, label) {
  let bytes;
  try {
    bytes = await readFile(path);
  } catch (error) {
    throw new Error(`${label} is unreadable: ${error.message}`);
  }
  try {
    return { bytes, value: JSON.parse(bytes.toString("utf8")) };
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

async function assertRegularUnsymbolicPath(root, relativePath) {
  if (!safeResearchArtifactPath(relativePath)) throw new Error(`${relativePath}: unsafe research artifact path`);
  const lexical = resolve(root, relativePath);
  if (!isInside(root, lexical)) throw new Error(`${relativePath}: artifact escapes repository root`);
  let cursor = root;
  for (const segment of relativePath.split("/")) {
    cursor = join(cursor, segment);
    const stat = await lstat(cursor);
    if (stat.isSymbolicLink()) throw new Error(`${relativePath}: symbolic links are forbidden in research release evidence`);
  }
  const rootReal = await realpath(root);
  const targetReal = await realpath(lexical);
  if (!isInside(rootReal, targetReal)) throw new Error(`${relativePath}: resolved artifact escapes repository root`);
  const stat = await lstat(lexical);
  if (!stat.isFile()) throw new Error(`${relativePath}: artifact must be a regular file`);
  return lexical;
}

async function prepareUnsymbolicOutputDirectory(root, relativePath) {
  const directorySegments = relativePath.split("/").slice(0, -1);
  let cursor = root;
  for (const segment of directorySegments) {
    cursor = join(cursor, segment);
    try {
      const stat = await lstat(cursor);
      if (stat.isSymbolicLink()) throw new Error(`${relativePath}: symbolic links are forbidden in the verification-log path`);
      if (!stat.isDirectory()) throw new Error(`${relativePath}: verification-log parent must be a directory`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await mkdir(cursor);
    }
  }
  const rootReal = await realpath(root);
  const directoryReal = await realpath(dirname(resolve(root, relativePath)));
  if (!isInside(rootReal, directoryReal)) throw new Error("verification log directory escapes repository root");
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label}: JSON object is required`);
}

function assertSemanticArtifact(id, bytes, manifest) {
  const text = bytes.toString("utf8");
  if (id === "claim-evidence") {
    const lines = text.trim().split(/\r?\n/u);
    const headers = lines[0]?.split(",") ?? [];
    for (const required of ["claim_id", "status", "evidence_artifact", "verification"]) {
      if (!headers.includes(required)) throw new Error(`${id}: missing governed CSV column ${required}`);
    }
    if (lines.length < 2) throw new Error(`${id}: claim-evidence ledger has no claim rows`);
    return;
  }

  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`${id}: invalid JSON: ${error.message}`);
  }
  requireObject(value, id);
  if (id === "p7-results") {
    if (value.task_id !== "P7-101" || value.status !== "approved-release-evidence") {
      throw new Error(`${id}: P7-101 approved-release-evidence state is required`);
    }
  } else if (id === "paper-results") {
    if (value.schema_version !== "0.1.0" || value.status !== "generated-evidence") {
      throw new Error(`${id}: generated paper-results schema 0.1.0 is required`);
    }
    if (!Array.isArray(value.tables) || value.tables.length === 0
      || !Array.isArray(value.figures) || value.figures.length === 0
      || !value.report || typeof value.report !== "object") {
      throw new Error(`${id}: generated tables, figures, and report provenance are required`);
    }
  } else if (id === "benchmark-results") {
    if (value.status !== "frozen-evidence" || value.provisional !== false
      || !Number.isInteger(value.result_count) || value.result_count < 1) {
      throw new Error(`${id}: non-provisional frozen evidence with results is required`);
    }
  } else if (id === "reproduction-audit") {
    const independent = manifest.approvals.find(({ role }) => role === "independent-reproducer")?.actor;
    if (value.status !== "passed" || value.independent !== true
      || value.auditor !== independent || value.result_producer !== manifest.result_producer
      || !Number.isInteger(value.checks_passed) || value.checks_passed < 1
      || value.checks_passed !== value.checks_total) {
      throw new Error(`${id}: complete independent reproduction pass is required`);
    }
  } else if (id === "product-release") {
    if (value.schema_version !== "1.0.0" || value.release_version !== manifest.release_version
      || value.immutable_assets !== true || !Array.isArray(value.packages) || value.packages.length === 0) {
      throw new Error(`${id}: exact immutable product release manifest is required`);
    }
  } else if (id === "rollback-drill") {
    if (value.schema_version !== "1.0.0" || value.current_version !== `v${manifest.release_version}`
      || value.immutable_overwrite_blocked !== true || value.active_after_drill !== value.rollback_version
      || !value.current_snapshot || !value.rollback_snapshot) {
      throw new Error(`${id}: successful immutable rollback drill evidence is required`);
    }
  }
}

export async function verifyResearchReleaseArtifacts(manifest, root = repositoryRoot) {
  // Bind the eventual log to the same candidate whose bytes are checked below.
  const candidate = structuredClone(manifest);
  const issues = validateResearchReleaseManifest(candidate);
  if (issues.length > 0) throw new Error(`REL-102 blocked:\n- ${issues.join("\n- ")}`);
  for (const artifact of candidate.artifacts) {
    const path = await assertRegularUnsymbolicPath(root, artifact.path);
    const bytes = await readFile(path);
    const digest = sha256(bytes);
    if (digest !== artifact.sha256) throw new Error(`${artifact.id}: SHA-256 mismatch for ${artifact.path}`);
    assertSemanticArtifact(artifact.id, bytes, candidate);
  }
  const checkedEvidence = new Set();
  for (const record of [...candidate.verification, ...candidate.approvals]) {
    if (checkedEvidence.has(record.evidence_sha256)) continue;
    const relativePath = `artifacts/research-release/evidence/${record.evidence_sha256}`;
    const path = await assertRegularUnsymbolicPath(root, relativePath);
    const bytes = await readFile(path);
    const label = `${record.id ?? record.role} evidence`;
    if (bytes.length === 0) throw new Error(`${label}: empty evidence is not a retained receipt`);
    if (sha256(bytes) !== record.evidence_sha256) throw new Error(`${label}: SHA-256 mismatch for ${relativePath}`);
    checkedEvidence.add(record.evidence_sha256);
  }
  return buildResearchReleaseVerificationLog(candidate);
}

function usage() {
  return "Usage: node scripts/research-release-dry-run.mjs validate-template [template.json] | check <manifest.json> [--write-log <artifacts/research-release/file.json>]";
}

export async function main({
  args = process.argv.slice(2),
  root = repositoryRoot,
  log = console.log,
  error = console.error,
  setExitCode = (code) => { process.exitCode = code; },
} = {}) {
  try {
    const [operation] = args;
    if (operation === "validate-template" && args.length <= 2) {
      const templateArgument = args[1] ?? "research-release-candidate.template.json";
      const templatePath = await assertRegularUnsymbolicPath(root, templateArgument);
      const { value } = await readJson(templatePath, "REL-102 template");
      const blocked = assertResearchReleaseTemplate(value);
      log(`VALID REL-102 BLOCKED TEMPLATE (${blocked.length} fail-closed release gates remain explicit)`);
      return;
    }
    if (operation !== "check" || args.length < 2) {
      error(usage());
      setExitCode(2);
      return;
    }
    const outputIndex = args.indexOf("--write-log");
    if ((outputIndex !== -1 && outputIndex !== 2) || args.length !== (outputIndex === -1 ? 2 : 4)) {
      error(usage());
      setExitCode(2);
      return;
    }
    const manifestPath = await assertRegularUnsymbolicPath(root, args[1]);
    const { value: manifest } = await readJson(manifestPath, "REL-102 manifest");
    const verificationLog = await verifyResearchReleaseArtifacts(manifest, root);
    if (outputIndex !== -1) {
      const outputArgument = args[3];
      if (!safeResearchArtifactPath(outputArgument) || !outputArgument.startsWith("artifacts/research-release/")) {
        throw new Error("verification log must use a canonical relative path under artifacts/research-release/");
      }
      const outputPath = resolve(root, outputArgument);
      if (!isInside(root, outputPath)) throw new Error("verification log path escapes repository root");
      await prepareUnsymbolicOutputDirectory(root, outputArgument);
      await writeFile(outputPath, canonicalJson(verificationLog), { encoding: "utf8", flag: "wx" });
      log(`WROTE REL-102 RELEASE CANDIDATE VERIFICATION LOG: ${outputArgument}`);
    }
    log(`REL-102 RESEARCH RELEASE DRY RUN VERIFIED: ${manifest.release_version} (${manifest.artifacts.length} immutable inputs; publication not authorized)`);
  } catch (operationError) {
    error(`REL-102 BLOCKED: ${operationError.message}`);
    setExitCode(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
