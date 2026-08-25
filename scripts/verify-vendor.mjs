import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(join(root, "vendor", "manifest.json"), "utf8"));
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const lockfile = await readFile(join(root, "pnpm-lock.yaml"), "utf8");
const expected = Object.freeze({
  package: "@archsync/core",
  version: "0.1.1",
  repository: "https://github.com/Little-Boy-s-ArchSync/archsync-core",
  sourceCommit: "503b5fe97aa39a78d5e5de80b794a94508e106cc",
  file: "archsync-core-0.1.1.tgz",
  sha256: "7f6c2db24888d8e4bf6eb6dd2cc2d0abaaf2fc908e2b43937aec40d163b05fc9",
});

assert.equal(manifest.schema_version, 2);
assert.equal(manifest.status, "provisional-integration-candidate");
assert.equal(manifest.package, expected.package);
assert.equal(manifest.version, expected.version);
assert.equal(manifest.repository, expected.repository);
assert.equal(manifest.source_commit, expected.sourceCommit);
assert.equal(manifest.file, expected.file);
assert.equal(manifest.sha256, expected.sha256);
assert.deepEqual(manifest.reproducible_pack, {
  runs: 2,
  byte_identical: true,
  first_sha256: expected.sha256,
  second_sha256: expected.sha256,
});
assert.equal(
  packageJson.dependencies[manifest.package],
  `file:vendor/${manifest.file}`,
  "package.json must consume the verified vendor artifact",
);
assert.equal(basename(manifest.file), manifest.file, "vendor artifact must be a basename");

const vendorRoot = await realpath(join(root, "vendor"));
const artifactPath = join(vendorRoot, manifest.file);
const artifactStat = await lstat(artifactPath);
assert.equal(artifactStat.isSymbolicLink(), false, "vendor artifact must not be a symbolic link");
assert.equal(artifactStat.isFile(), true, "vendor artifact must be a regular file");
const artifactRealPath = await realpath(artifactPath);
const artifactRelativePath = relative(vendorRoot, artifactRealPath);
assert.equal(
  artifactRelativePath === ".." || artifactRelativePath.startsWith(`..${sep}`) || isAbsolute(artifactRelativePath),
  false,
  "vendor artifact must remain inside vendor/",
);
const bytes = await readFile(artifactRealPath);
assert.equal(createHash("sha256").update(bytes).digest("hex"), manifest.sha256);
const lockfileIntegrity = createHash("sha512").update(bytes).digest("base64");
assert.equal(
  lockfile.includes(`integrity: sha512-${lockfileIntegrity}, tarball: file:vendor/${manifest.file}`),
  true,
  "lockfile must bind the exact vendor artifact",
);

const installedPackagePath = join(root, "node_modules", "@archsync", "core", "package.json");
const installedPackageRealPath = await realpath(installedPackagePath);
const installedPackageRelativePath = relative(root, installedPackageRealPath);
assert.equal(
  installedPackageRelativePath === ".." ||
    installedPackageRelativePath.startsWith(`..${sep}`) ||
    isAbsolute(installedPackageRelativePath),
  false,
  "installed Core metadata must resolve inside the workspace",
);
const installedPackage = JSON.parse(await readFile(installedPackageRealPath, "utf8"));
assert.equal(installedPackage.name, manifest.package);
assert.equal(installedPackage.version, manifest.version);

console.log(
  `PASS VENDOR INTEGRITY (${manifest.package}@${manifest.version} ${manifest.source_commit.slice(0, 12)} ${manifest.sha256})`,
);
