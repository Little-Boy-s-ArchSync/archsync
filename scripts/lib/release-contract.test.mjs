import assert from "node:assert/strict";
import test from "node:test";

import {
  assertExactReleaseFiles,
  assertExactTarballs,
  assertReleaseRef,
  checksumLine,
  packageTarballName,
} from "./release-contract.mjs";

test("derives npm-compatible tarball names for scoped packages", () => {
  assert.equal(packageTarballName({ name: "@archsync/guardian", version: "0.3.2" }), "archsync-guardian-0.3.2.tgz");
  assert.equal(packageTarballName({ name: "plain", version: "1.0.0" }), "plain-1.0.0.tgz");
  assert.throws(() => packageTarballName({ name: "", version: "1.0.0" }), /must not be empty/);
  assert.throws(() => packageTarballName({ name: "plain" }), /must contain string/);
});

test("accepts exactly the expected release tarballs independent of order", () => {
  assert.deepEqual(
    assertExactTarballs(
      ["archsync-guardian-0.3.2.tgz", "README.txt", "archsync-core-0.1.0.tgz"],
      ["archsync-core-0.1.0.tgz", "archsync-guardian-0.3.2.tgz"],
    ),
    ["archsync-core-0.1.0.tgz", "archsync-guardian-0.3.2.tgz"],
  );
});

test("rejects missing, unexpected and stale tarballs", () => {
  const expected = ["archsync-core-0.1.0.tgz", "archsync-guardian-0.3.2.tgz"];
  assert.throws(() => assertExactTarballs([expected[0]], expected), /release tarballs differ/);
  assert.throws(
    () => assertExactTarballs([...expected, "archsync-guardian-0.3.1.tgz"], expected),
    /archsync-guardian-0\.3\.1\.tgz/,
  );
});

test("produces deterministic SHA-256 checksum lines", () => {
  assert.equal(
    checksumLine("artifact.tgz", Buffer.from("archsync", "utf8")),
    "a893deea994b23af1402bced14e6cfa84a305460e70dadf05b80bf9a1795a6b4  artifact.tgz",
  );
});

test("requires an exact release payload including the checksum manifest", () => {
  const payloads = [
    "archsync-core-0.1.0.tgz",
    "archsync-guardian-0.3.2.tgz",
    "repos.lock.json",
  ];
  assert.deepEqual(
    assertExactReleaseFiles(["SHA256SUMS.txt", ...payloads], payloads),
    ["SHA256SUMS.txt", ...payloads].sort(),
  );
  assert.throws(
    () => assertExactReleaseFiles(["SHA256SUMS.txt", ...payloads, "stale.tgz"], payloads),
    /release files differ/,
  );
});

test("binds release tags to the workspace SemVer", () => {
  assert.deepEqual(assertReleaseRef({ version: "0.3.2" }, "tag", "v0.3.2"), {
    mode: "release",
    expectedTag: "v0.3.2",
  });
  assert.throws(
    () => assertReleaseRef({ version: "0.3.2" }, "tag", "v0.3.1"),
    /does not match package version/,
  );
});

test("allows branch workflow runs only as release candidates", () => {
  assert.deepEqual(assertReleaseRef({ version: "0.3.2" }, "branch", "main"), {
    mode: "candidate",
    expectedTag: "v0.3.2",
  });
  assert.throws(() => assertReleaseRef({ version: "latest" }, "branch", "main"), /invalid SemVer/);
});
