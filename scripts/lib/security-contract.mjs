import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

const SECRET_PATTERNS = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ["github-token", /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{36,255}\b/g],
  ["github-fine-grained-token", /\bgithub_pat_[A-Za-z0-9_]{60,255}\b/g],
  ["aws-access-key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ["slack-token", /\bxox[baprs]-[0-9A-Za-z-]{10,255}\b/g],
];

export function stableJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object" && value.constructor === Object) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function componentRef(name, version) {
  return `pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(version)}`;
}

function normalizeLicense(license) {
  if (typeof license === "string" && license.trim()) return license.trim();
  if (license && typeof license.type === "string" && license.type.trim()) return license.type.trim();
  return "NOASSERTION";
}

function visitDependency(name, dependency, components, edges, roots) {
  if (!dependency || typeof dependency.version !== "string") {
    throw new Error(`dependency '${name}' has no version`);
  }
  const ref = componentRef(name, dependency.version);
  const firstParty = name === "archsync-monorepo" || name.startsWith("@archsync/");
  const component = {
    type: "library",
    name,
    version: dependency.version,
    "bom-ref": ref,
    purl: ref,
    licenses: [{ license: { id: normalizeLicense(dependency.license) } }],
    properties: [
      { name: "archsync:first-party", value: String(firstParty) },
      { name: "archsync:roots", value: [...roots].sort().join(",") },
    ],
  };
  const existing = components.get(ref);
  if (existing) {
    const combinedRoots = new Set(
      [...existing.properties.find(({ name: property }) => property === "archsync:roots").value.split(","), ...roots]
        .filter(Boolean),
    );
    existing.properties.find(({ name: property }) => property === "archsync:roots").value = [...combinedRoots].sort().join(",");
  } else {
    components.set(ref, component);
  }

  const childRefs = [];
  for (const [childName, child] of Object.entries(dependency.dependencies ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
    const childRef = visitDependency(childName, child, components, edges, roots);
    childRefs.push(childRef);
  }
  const existingChildren = new Set(edges.get(ref) ?? []);
  for (const childRef of childRefs) existingChildren.add(childRef);
  edges.set(ref, [...existingChildren].sort());
  return ref;
}

export function buildSupplyChainDocuments({ workspaceManifest, dependencyRoots, sourceCommit }) {
  if (!workspaceManifest?.name || !workspaceManifest?.version) {
    throw new Error("workspace manifest must contain name and version");
  }
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) {
    throw new Error("source commit must be a full lowercase Git SHA");
  }
  const components = new Map();
  const edges = new Map();
  const rootRefs = [];
  for (const root of [...dependencyRoots].sort((left, right) => left.name.localeCompare(right.name))) {
    rootRefs.push(visitDependency(root.name, root, components, edges, new Set([root.name])));
  }
  const sortedComponents = [...components.values()].sort((left, right) => left["bom-ref"].localeCompare(right["bom-ref"]));
  const dependencies = [...edges.entries()]
    .map(([ref, dependsOn]) => ({ ref, dependsOn }))
    .sort((left, right) => left.ref.localeCompare(right.ref));
  const metadataRef = componentRef(workspaceManifest.name, workspaceManifest.version);
  const sbom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    version: 1,
    metadata: {
      component: {
        type: "application",
        name: workspaceManifest.name,
        version: workspaceManifest.version,
        "bom-ref": metadataRef,
        properties: [{ name: "archsync:source-commit", value: sourceCommit }],
      },
    },
    components: sortedComponents,
    dependencies: [{ ref: metadataRef, dependsOn: [...new Set(rootRefs)].sort() }, ...dependencies],
  };
  const licenses = {
    schema_version: "1.0.0",
    source_commit: sourceCommit,
    components: sortedComponents.map((component) => ({
      name: component.name,
      version: component.version,
      license: component.licenses[0].license.id,
      first_party: component.properties.find(({ name }) => name === "archsync:first-party").value === "true",
      purl: component.purl,
    })),
  };
  return { sbom, licenses };
}

export function assertLicensePolicy(licenseDocument, allowedLicenses) {
  const allowed = new Set(allowedLicenses);
  const violations = [];
  for (const component of licenseDocument.components ?? []) {
    if (!component.first_party && !allowed.has(component.license)) {
      violations.push(`${component.name}@${component.version}:${component.license}`);
    }
  }
  if (violations.length) {
    throw new Error(`third-party license policy violation: ${violations.sort().join(", ")}`);
  }
}

export function findSecrets(text, file = "<memory>") {
  const findings = [];
  for (const [kind, expression] of SECRET_PATTERNS) {
    expression.lastIndex = 0;
    for (const match of text.matchAll(expression)) {
      const line = text.slice(0, match.index).split("\n").length;
      findings.push({ file, kind, line });
    }
  }
  return findings;
}

function tarString(buffer, start, length) {
  const value = buffer.subarray(start, start + length);
  const nul = value.indexOf(0);
  return value.subarray(0, nul === -1 ? value.length : nul).toString("utf8").trim();
}

export function readTarGzEntries(bytes) {
  const tar = gunzipSync(bytes);
  const entries = [];
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = tarString(header, 0, 100);
    const prefix = tarString(header, 345, 155);
    const path = prefix ? `${prefix}/${name}` : name;
    const rawSize = tarString(header, 124, 12).replace(/\0/g, "");
    const size = rawSize ? Number.parseInt(rawSize, 8) : 0;
    if (!Number.isSafeInteger(size) || size < 0) throw new Error(`invalid tar entry size for '${path}'`);
    const type = tarString(header, 156, 1) || "0";
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    if (contentEnd > tar.length) throw new Error(`truncated tar entry '${path}'`);
    entries.push({ path, type, bytes: tar.subarray(contentStart, contentEnd) });
    offset = contentStart + Math.ceil(size / 512) * 512;
  }
  return entries;
}

export function assertTarballPolicy(entries, allowedPaths, artifactName) {
  const findings = [];
  for (const entry of entries) {
    if (["x", "g"].includes(entry.type)) continue;
    if (!entry.path.startsWith("package/") || entry.path.startsWith("/") || entry.path.split("/").includes("..")) {
      throw new Error(`${artifactName} contains unsafe path '${entry.path}'`);
    }
    if (!["0", "5"].includes(entry.type)) {
      throw new Error(`${artifactName} contains unsupported tar entry type '${entry.type}' at '${entry.path}'`);
    }
    if (entry.type === "5") continue;
    const packagePath = entry.path.slice("package/".length);
    const allowed = allowedPaths.some((candidate) =>
      candidate.endsWith("/") ? packagePath.startsWith(candidate) : packagePath === candidate,
    );
    if (!allowed) throw new Error(`${artifactName} contains non-allowlisted file '${packagePath}'`);
    const sample = entry.bytes.subarray(0, Math.min(entry.bytes.length, 8192));
    if (!sample.includes(0)) findings.push(...findSecrets(entry.bytes.toString("utf8"), `${artifactName}:${packagePath}`));
  }
  if (findings.length) {
    throw new Error(`release secret scan failed: ${findings.map(({ file, kind, line }) => `${file}:${line}:${kind}`).join(", ")}`);
  }
}

export function assertChecksumDocument(files, checksumText) {
  const expected = new Map();
  for (const line of checksumText.trimEnd().split("\n")) {
    const match = /^([0-9a-f]{64})  ([^/\\]+)$/.exec(line);
    if (!match) throw new Error(`invalid SHA256SUMS line '${line}'`);
    if (expected.has(match[2])) throw new Error(`duplicate checksum entry '${match[2]}'`);
    expected.set(match[2], match[1]);
  }
  const actualNames = [...files.keys()].sort();
  const expectedNames = [...expected.keys()].sort();
  if (actualNames.join("\n") !== expectedNames.join("\n")) {
    throw new Error(`checksum allowlist differs: expected ${actualNames.join(", ")}; found ${expectedNames.join(", ")}`);
  }
  for (const [name, bytes] of files) {
    if (sha256(bytes) !== expected.get(name)) throw new Error(`checksum mismatch for '${name}'`);
  }
}

export function summarizeAuditReports(reports) {
  const totals = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  let dependencies = 0;
  for (const report of reports) {
    const vulnerabilities = report?.metadata?.vulnerabilities;
    if (!vulnerabilities) throw new Error("pnpm audit report is missing vulnerability metadata");
    for (const severity of Object.keys(totals)) totals[severity] += Number(vulnerabilities[severity] ?? 0);
    dependencies += Number(report.metadata.dependencies ?? report.metadata.totalDependencies ?? 0);
  }
  return { vulnerabilities: totals, dependencies };
}

export function assertNoHighRiskVulnerabilities(summary) {
  if (summary.vulnerabilities.high > 0 || summary.vulnerabilities.critical > 0) {
    throw new Error(
      `dependency audit blocks release: ${summary.vulnerabilities.critical} critical and ${summary.vulnerabilities.high} high vulnerabilities`,
    );
  }
}
