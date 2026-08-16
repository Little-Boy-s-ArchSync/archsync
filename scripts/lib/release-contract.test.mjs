import assert from "node:assert/strict";
import test from "node:test";

import {
  assertExactTarballs,
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
