import assert from "node:assert/strict";
import test from "node:test";
import { gzipSync } from "node:zlib";

import {
  assertChecksumDocument,
  assertLicensePolicy,
  assertNoHighRiskVulnerabilities,
  assertTarballPolicy,
  buildSupplyChainDocuments,
  findSecrets,
  readTarGzEntries,
  sha256,
  stableJson,
  summarizeAuditReports,
} from "./security-contract.mjs";

const commit = "a".repeat(40);

test("builds stable CycloneDX and license documents from duplicate dependency roots", () => {
  const roots = [
    {
      name: "@archsync/core",
      version: "0.1.1",
      dependencies: { yaml: { version: "2.9.0", license: "ISC" } },
    },
    {
      name: "@archsync/guardian",
      version: "0.3.3",
      dependencies: { yaml: { version: "2.9.0", license: "ISC" } },
    },
  ];
  const result = buildSupplyChainDocuments({
    workspaceManifest: { name: "archsync-monorepo", version: "0.3.3" },
    dependencyRoots: roots,
    sourceCommit: commit,
  });
  assert.equal(result.sbom.components.filter(({ name }) => name === "yaml").length, 1);
  assert.equal(result.licenses.components.find(({ name }) => name === "yaml").license, "ISC");
  assert.equal(stableJson(result.sbom), stableJson(result.sbom));
});

test("rejects unknown third-party licenses but permits first-party NOASSERTION", () => {
  assert.doesNotThrow(() =>
    assertLicensePolicy(
      { components: [{ name: "@archsync/core", version: "0.1.1", license: "NOASSERTION", first_party: true }] },
      ["MIT"],
    ),
  );
  assert.throws(
    () =>
      assertLicensePolicy(
        { components: [{ name: "unknown", version: "1.0.0", license: "NOASSERTION", first_party: false }] },
        ["MIT"],
      ),
    /license policy violation/,
  );
});

test("finds high-confidence credentials without returning their values", () => {
  const token = "ghp_" + "A".repeat(36);
  assert.deepEqual(findSecrets(`safe\n${token}\n`, "fixture.txt"), [
    { file: "fixture.txt", kind: "github-token", line: 2 },
  ]);
  assert.deepEqual(findSecrets("token=placeholder", "fixture.txt"), []);
});

function tarEntry(path, content) {
  const bytes = Buffer.from(content);
  const header = Buffer.alloc(512);
  header.write(path, 0, 100, "utf8");
  header.write("0000644\0", 100, 8, "ascii");
  header.write("0000000\0", 108, 8, "ascii");
  header.write("0000000\0", 116, 8, "ascii");
  header.write(`${bytes.length.toString(8).padStart(11, "0")}\0`, 124, 12, "ascii");
  header.write("00000000000\0", 136, 12, "ascii");
  header.fill(" ", 148, 156);
  header.write("0", 156, 1, "ascii");
  header.write("ustar\0", 257, 6, "ascii");
  let checksum = 0;
  for (const byte of header) checksum += byte;
  header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
  const padding = Buffer.alloc((512 - (bytes.length % 512)) % 512);
  return Buffer.concat([header, bytes, padding]);
}

test("reads package tarballs and enforces content roots", () => {
  const archive = gzipSync(Buffer.concat([tarEntry("package/dist/index.js", "export {};"), Buffer.alloc(1024)]));
  const entries = readTarGzEntries(archive);
  assert.equal(entries.length, 1);
  assert.doesNotThrow(() => assertTarballPolicy(entries, ["dist/"], "package.tgz"));
  assert.throws(() => assertTarballPolicy(entries, ["README.md"], "package.tgz"), /non-allowlisted/);
});

test("rejects unsafe tar paths and secrets inside allowlisted package files", () => {
  const unsafeArchive = gzipSync(Buffer.concat([tarEntry("package/../escape", "unsafe"), Buffer.alloc(1024)]));
  assert.throws(
    () => assertTarballPolicy(readTarGzEntries(unsafeArchive), ["dist/"], "package.tgz"),
    /unsafe path/,
  );
  const token = "ghp_" + "B".repeat(36);
  const secretArchive = gzipSync(Buffer.concat([tarEntry("package/dist/index.js", token), Buffer.alloc(1024)]));
  assert.throws(
    () => assertTarballPolicy(readTarGzEntries(secretArchive), ["dist/"], "package.tgz"),
    /release secret scan failed/,
  );
});

test("verifies checksum membership and digest", () => {
  const files = new Map([["artifact.tgz", Buffer.from("archsync")]]);
  assert.doesNotThrow(() => assertChecksumDocument(files, `${sha256(Buffer.from("archsync"))}  artifact.tgz\n`));
  assert.throws(() => assertChecksumDocument(files, `${"0".repeat(64)}  artifact.tgz\n`), /checksum mismatch/);
});

test("blocks high and critical dependency advisories", () => {
  const summary = summarizeAuditReports([
    { metadata: { dependencies: 4, vulnerabilities: { low: 1, high: 0, critical: 0 } } },
    { metadata: { dependencies: 2, vulnerabilities: { moderate: 1, high: 0, critical: 0 } } },
  ]);
  assert.equal(summary.dependencies, 6);
  assert.doesNotThrow(() => assertNoHighRiskVulnerabilities(summary));
  assert.throws(
    () => assertNoHighRiskVulnerabilities({ vulnerabilities: { high: 1, critical: 0 } }),
    /blocks release/,
  );
});
