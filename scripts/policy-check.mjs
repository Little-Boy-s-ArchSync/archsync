import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const requiredMarkers = new Map([
  ["CHANGELOG.md", ["# Changelog", "## [Unreleased]", "Semantic Versioning"]],
  ["SECURITY.md", ["## Supported versions", "## Private reporting", "docs/INCIDENT-RESPONSE.md"]],
  ["docs/RELEASE.md", ["# Release, SemVer, and Rollback Policy", "## Semantic Versioning", "## Rollback", "immutable"]],
  ["docs/SUPPLY-CHAIN.md", ["# Supply-Chain and Release Evidence", "CycloneDX", "pnpm audit", "secret"]],
  ["docs/INCIDENT-RESPONSE.md", ["# Security Incident and Tabletop Runbook", "## Severity and response targets", "## Package compromise and rollback tabletop"]],
  ["docs/SUPPORT-MATRIX.md", ["# Support Matrix and Known Limitations", "## Supported environment", "## Known limitations"]],
  ["docs/UPGRADE.md", ["# Upgrade and Downgrade Guide", "## Upgrade from the previous release", "## Downgrade"]],
  ["docs/PRIVACY.md", ["# Offline, Privacy, and Diagnostic Contract", "## Network behavior", "## Temporary files and retention"]],
  ["docs/RESEARCH-RELEASE.md", ["# REL-102 Research Release Dry-Run", "## Required immutable inputs", "## Fail-closed execution", "## Human gates preserved"]],
  ["docs/GOVERNANCE.md", ["# ArchSync Repository and Research Governance", "## Trạng thái enforcement", "strict", "most recent reviewable push", "administrator", "CODEOWNERS review", "## Holiday-safe autonomous preparation", "PENDING_HUMAN"]],
  ["docs/RACI-REVIEWER-MATRIX.md", ["# RACI and Reviewer Matrix Proposal (GOV-104)", "## Decision and reviewer matrix", "Research question (RQ) or research protocol", "Architecture Model schema or semantics", "Ground truth, adjudication or freeze", "Hard rule, conformance decision or merge severity", "Repair proposal or repair execution", "High-risk architecture evolution or baseline update", "Empirical paper claim or claim-to-evidence link", "Product or research release", "Võ Đức Hiếu", "Trần Minh Hoàng", "Lê Văn Kiệt", "External Support Consultant", "UNFILLED"]],
  [".github/PULL_REQUEST_TEMPLATE.md", ["## Governance", "Risk level: low / medium / high", "PENDING_HUMAN", "Approval reference bound to this exact candidate", "Rollback trigger"]],
]);

for (const [file, markers] of requiredMarkers) {
  const text = await readFile(join(root, file), "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`${file} is missing required policy marker '${marker}'`);
  }
}

const activeRepositoryGuidance = await Promise.all(
  ["README.md", "CONTRIBUTING.md", "docs/GOVERNANCE.md", "docs/ONBOARDING.md"].map(async (file) => ({
    file,
    text: await readFile(join(root, file), "utf8"),
  })),
);
const obsoleteEnforcementClaims = [
  "Các repository đang private",
  "private repository theo gói đang dùng",
  "GitHub chưa hỗ trợ branch protection",
  "GitHub hiện không cưỡng chế branch protection",
];
for (const { file, text } of activeRepositoryGuidance) {
  for (const claim of obsoleteEnforcementClaims) {
    if (text.includes(claim)) throw new Error(`${file} contains obsolete enforcement claim '${claim}'`);
  }
}

const releasePolicy = JSON.parse(await readFile(join(root, "release-policy.json"), "utf8"));
if (releasePolicy.schema_version !== "1.0.0") throw new Error("release-policy.json schema_version must be 1.0.0");
for (const payload of ["LICENSES.json", "RELEASE-MANIFEST.json", "SBOM.cdx.json", "repos.lock.json"]) {
  if (!releasePolicy.static_payloads.includes(payload)) throw new Error(`release policy is missing '${payload}'`);
}
for (const packageName of ["@archsync/core", "@archsync/guardian"]) {
  if (!Array.isArray(releasePolicy.package_contents[packageName])) {
    throw new Error(`release policy has no content allowlist for '${packageName}'`);
  }
}

const workflowDirectory = join(root, ".github", "workflows");
const workflowFiles = (await readdir(workflowDirectory)).filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"));
for (const file of workflowFiles) {
  const text = await readFile(join(workflowDirectory, file), "utf8");
  if (text.includes("pull_request_target:")) throw new Error(`${file} must not use pull_request_target`);
  for (const match of text.matchAll(/^\s*uses:\s*([^\s@]+)@([^\s#]+).*$/gm)) {
    if (!/^[0-9a-f]{40}$/.test(match[2])) throw new Error(`${file} action '${match[1]}' is not pinned to a full commit SHA`);
  }
  const uploads = [...text.matchAll(/^\s*uses:\s*actions\/upload-artifact@([0-9a-f]{40}).*$/gm)];
  if (uploads.length && !text.includes("retention-days:")) throw new Error(`${file} uploads artifacts without an explicit retention period`);
}

const releaseWorkflow = await readFile(join(workflowDirectory, "release.yml"), "utf8");
if (!/permissions:\s*\n\s*contents:\s*read/.test(releaseWorkflow)) {
  throw new Error("release workflow must default to contents: read");
}
if ((releaseWorkflow.match(/contents:\s*write/g) ?? []).length !== 1) {
  throw new Error("release workflow must grant contents: write to exactly one job");
}
if (!releaseWorkflow.includes("gh release create") || releaseWorkflow.includes("--clobber")) {
  throw new Error("release workflow must create immutable GitHub Release assets without --clobber");
}

console.log(`POLICY VERIFIED: ${requiredMarkers.size} documents, release allowlist, and ${workflowFiles.length} pinned workflows`);
