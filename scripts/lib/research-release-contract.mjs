import { createHash } from "node:crypto";
import { posix } from "node:path";

export const RESEARCH_RELEASE_SCHEMA_VERSION = "1.0.0";

export const REQUIRED_RESEARCH_ARTIFACTS = Object.freeze([
  ["p7-results", "p7-results-manifest"],
  ["paper-results", "paper-results-manifest"],
  ["claim-evidence", "claim-evidence-ledger"],
  ["benchmark-results", "benchmark-results-manifest"],
  ["reproduction-audit", "independent-reproduction-audit"],
  ["product-release", "product-release-manifest"],
  ["rollback-drill", "rollback-drill-evidence"],
]);

export const REQUIRED_RESEARCH_CHECKS = Object.freeze([
  ["p7-results-frozen", "p7-results"],
  ["paper-results-schema", "paper-results"],
  ["paper-claim-links", "claim-evidence"],
  ["paper-citations", "paper-results"],
  ["benchmark-results-schema", "benchmark-results"],
  ["independent-reproduction", "reproduction-audit"],
  ["product-release-bundle", "product-release"],
  ["rollback-drill", "rollback-drill"],
]);

export const REQUIRED_RESEARCH_APPROVALS = Object.freeze([
  "p7-owner",
  "research-release-owner",
  "independent-reproducer",
  "lead",
]);

export const RESEARCH_RELEASE_TEMPLATE = Object.freeze({
  schema_version: RESEARCH_RELEASE_SCHEMA_VERSION,
  task_id: "REL-102",
  status: "blocked-p7-101",
  release_version: null,
  source_commit: null,
  created_at: null,
  result_producer: null,
  artifacts: [],
  verification: [],
  approvals: [],
});

const SHA256 = /^[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;
const UTC_SECOND = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const REPOSITORY = /^Little-Boy-s-ArchSync\/[A-Za-z0-9._-]+$/u;
const VALIDATOR = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{1,159}$/u;

const TOP_LEVEL_KEYS = Object.keys(RESEARCH_RELEASE_TEMPLATE).sort();
const ARTIFACT_KEYS = ["id", "kind", "path", "sha256", "source_repository", "source_commit"].sort();
const CHECK_KEYS = ["id", "status", "validator", "validator_commit", "input_sha256", "evidence_sha256"].sort();
const APPROVAL_KEYS = ["role", "actor", "decision", "decided_at", "evidence_sha256"].sort();

function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify(keys);
}

function validUtcSecond(value) {
  if (typeof value !== "string" || !UTC_SECOND.test(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value.replace("Z", ".000Z");
}

export function safeResearchArtifactPath(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\") || value.includes("\0")) return false;
  if (value.startsWith("/") || /^[A-Za-z]:/u.test(value) || value.startsWith("//")) return false;
  const normalized = posix.normalize(value);
  return normalized === value && value !== "." && !value.startsWith("../")
    && !value.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
}

function artifactIssue(record, expectedId, expectedKind) {
  if (!exactKeys(record, ARTIFACT_KEYS)) return `${expectedId}: artifact fields must match schema exactly`;
  if (record.id !== expectedId || record.kind !== expectedKind) return `${expectedId}: artifact identity or kind is invalid`;
  if (!safeResearchArtifactPath(record.path)) return `${expectedId}: artifact path must be canonical, relative, and symlink-free at load time`;
  if (!SHA256.test(record.sha256)) return `${expectedId}: artifact SHA-256 is invalid`;
  if (!REPOSITORY.test(record.source_repository)) return `${expectedId}: source repository is invalid`;
  if (!COMMIT.test(record.source_commit)) return `${expectedId}: source commit must be a full Git SHA`;
  return null;
}

function checkIssue(record, expectedId, inputArtifact) {
  if (!exactKeys(record, CHECK_KEYS)) return `${expectedId}: verification fields must match schema exactly`;
  if (record.id !== expectedId || record.status !== "passed") return `${expectedId}: verification must have exact identity and passed status`;
  if (!VALIDATOR.test(record.validator)) return `${expectedId}: validator identity is invalid`;
  if (!COMMIT.test(record.validator_commit)) return `${expectedId}: validator commit must be a full Git SHA`;
  if (record.input_sha256 !== inputArtifact.sha256) return `${expectedId}: input digest does not match ${inputArtifact.id}`;
  if (!SHA256.test(record.evidence_sha256)) return `${expectedId}: verification evidence SHA-256 is invalid`;
  return null;
}

function approvalIssue(record, expectedRole) {
  if (!exactKeys(record, APPROVAL_KEYS)) return `${expectedRole}: approval fields must match schema exactly`;
  if (record.role !== expectedRole || record.decision !== "approved") return `${expectedRole}: exact approved decision is required`;
  if (typeof record.actor !== "string" || record.actor.trim().length < 2) return `${expectedRole}: named human actor is required`;
  if (!validUtcSecond(record.decided_at)) return `${expectedRole}: decision time must be canonical UTC to the second`;
  if (!SHA256.test(record.evidence_sha256)) return `${expectedRole}: approval evidence SHA-256 is invalid`;
  return null;
}

export function validateResearchReleaseManifest(value) {
  if (!exactKeys(value, TOP_LEVEL_KEYS)) return ["manifest top-level fields must match REL-102 schema 1.0.0 exactly"];
  const issues = [];
  if (value.schema_version !== RESEARCH_RELEASE_SCHEMA_VERSION) issues.push("schema_version must be 1.0.0");
  if (value.task_id !== "REL-102") issues.push("task_id must be REL-102");
  if (value.status !== "candidate") issues.push("status must be candidate; blocked templates are not release evidence");
  if (typeof value.release_version !== "string" || !SEMVER.test(value.release_version)) issues.push("release_version must be valid SemVer");
  if (typeof value.source_commit !== "string" || !COMMIT.test(value.source_commit)) issues.push("source_commit must be a full Git SHA");
  if (!validUtcSecond(value.created_at)) issues.push("created_at must be canonical UTC to the second");
  if (typeof value.result_producer !== "string" || value.result_producer.trim().length < 2) issues.push("result_producer must name the accountable result producer");

  const artifacts = new Map();
  if (!Array.isArray(value.artifacts) || value.artifacts.length !== REQUIRED_RESEARCH_ARTIFACTS.length) {
    issues.push(`artifacts must contain exactly ${REQUIRED_RESEARCH_ARTIFACTS.length} governed records`);
  } else {
    value.artifacts.forEach((record, index) => {
      const [expectedId, expectedKind] = REQUIRED_RESEARCH_ARTIFACTS[index];
      const issue = artifactIssue(record, expectedId, expectedKind);
      if (issue) issues.push(issue);
      if (record && typeof record.id === "string") {
        if (artifacts.has(record.id)) issues.push(`${record.id}: duplicate artifact identity`);
        artifacts.set(record.id, record);
      }
    });
  }

  if (!Array.isArray(value.verification) || value.verification.length !== REQUIRED_RESEARCH_CHECKS.length) {
    issues.push(`verification must contain exactly ${REQUIRED_RESEARCH_CHECKS.length} passed checks`);
  } else {
    const seen = new Set();
    value.verification.forEach((record, index) => {
      const [expectedId, artifactId] = REQUIRED_RESEARCH_CHECKS[index];
      if (record && typeof record.id === "string") {
        if (seen.has(record.id)) issues.push(`${record.id}: duplicate verification identity`);
        seen.add(record.id);
      }
      const artifact = artifacts.get(artifactId);
      if (!artifact) issues.push(`${expectedId}: required input artifact ${artifactId} is unavailable`);
      else {
        const issue = checkIssue(record, expectedId, artifact);
        if (issue) issues.push(issue);
      }
    });
  }

  if (!Array.isArray(value.approvals) || value.approvals.length !== REQUIRED_RESEARCH_APPROVALS.length) {
    issues.push(`approvals must contain exactly ${REQUIRED_RESEARCH_APPROVALS.length} named human decisions`);
  } else {
    const actors = new Map();
    value.approvals.forEach((record, index) => {
      const expectedRole = REQUIRED_RESEARCH_APPROVALS[index];
      const issue = approvalIssue(record, expectedRole);
      if (issue) issues.push(issue);
      if (record && typeof record.actor === "string") actors.set(expectedRole, record.actor.trim());
    });
    const independent = actors.get("independent-reproducer");
    if (independent && independent === value.result_producer.trim()) {
      issues.push("independent-reproducer must differ from result_producer");
    }
  }
  return issues;
}

export function assertResearchReleaseTemplate(value) {
  const actual = canonicalJson(value);
  const expected = canonicalJson(RESEARCH_RELEASE_TEMPLATE);
  if (actual !== expected) throw new Error("REL-102 template must remain the exact blocked, empty, non-evidence document");
  const issues = validateResearchReleaseManifest(value);
  if (!issues.some((issue) => issue.includes("blocked templates are not release evidence"))) {
    throw new Error("REL-102 template unexpectedly passed the release-status gate");
  }
  return issues;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return `${JSON.stringify(canonicalValue(value), null, 2)}\n`;
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function buildResearchReleaseVerificationLog(manifest) {
  const issues = validateResearchReleaseManifest(manifest);
  if (issues.length > 0) throw new Error(`REL-102 verification blocked: ${issues.join("; ")}`);
  return {
    schema_version: RESEARCH_RELEASE_SCHEMA_VERSION,
    task_id: "REL-102",
    status: "verified-candidate-not-published",
    release_version: manifest.release_version,
    source_commit: manifest.source_commit,
    verified_at: manifest.created_at,
    result_producer: manifest.result_producer,
    manifest_sha256: sha256(Buffer.from(canonicalJson(manifest), "utf8")),
    artifacts: manifest.artifacts.map(({ id, path, sha256: digest, source_repository, source_commit }) => ({
      id,
      path,
      sha256: digest,
      source_repository,
      source_commit,
    })),
    verification: manifest.verification.map(({ id, validator, validator_commit, evidence_sha256 }) => ({
      id,
      validator,
      validator_commit,
      evidence_sha256,
    })),
    approvals: manifest.approvals.map(({ role, actor, decided_at, evidence_sha256 }) => ({
      role,
      actor,
      decided_at,
      evidence_sha256,
    })),
    publication_authorized: false,
    warning: "Technical dry-run evidence only; publishing still requires the governed release workflow.",
  };
}
