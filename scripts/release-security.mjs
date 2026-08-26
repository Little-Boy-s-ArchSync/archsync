import { spawnSync } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertExactReleaseFiles,
  assertExactTarballs,
  checksumLine,
  packageTarballName,
} from "./lib/release-contract.mjs";
import {
  assertChecksumDocument,
  assertLicensePolicy,
  assertTarballPolicy,
  buildSupplyChainDocuments,
  findSecrets,
  readTarGzEntries,
  stableJson,
} from "./lib/security-contract.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const releaseDirectory = join(root, "release");
const operation = process.argv[2] ?? "verify";
const packageDirectories = ["archsync-core", "archsync-guardian"];

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", shell: false });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return result.stdout;
}

function runPnpm(directory, args) {
  const pnpmCli = process.env.npm_execpath?.includes("pnpm") ? process.env.npm_execpath : null;
  const command = pnpmCli ? process.execPath : process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const commandArgs = pnpmCli ? [pnpmCli, ...args] : args;
  return run(command, commandArgs, join(root, directory));
}

function packageManifestPaths(directory, node, name) {
  const paths = [join(root, directory, "node_modules", ...name.split("/"), "package.json")];
  if (node.path) {
    const packageRoot = isAbsolute(node.path) ? node.path : join(root, directory, "node_modules", node.path);
    paths.push(join(packageRoot, "package.json"));
  }
  return [...new Set(paths)];
}

async function enrichLicenses(directory, node, name = node.name) {
  const enriched = { ...node, name };
  let manifestFound = false;
  for (const manifestPath of packageManifestPaths(directory, node, name)) {
    try {
      const manifest = await readJson(manifestPath);
      enriched.license = manifest.license;
      manifestFound = true;
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  if (!manifestFound && name !== "@archsync/core" && name !== "@archsync/guardian") {
    throw new Error(`cannot locate installed package manifest for ${name}@${node.version}`);
  }
  enriched.dependencies = {};
  for (const [dependencyName, dependency] of Object.entries(node.dependencies ?? {})) {
    enriched.dependencies[dependencyName] = await enrichLicenses(directory, dependency, dependencyName);
  }
  return enriched;
}

async function dependencyRoots() {
  const roots = [];
  for (const directory of packageDirectories) {
    const output = runPnpm(directory, ["list", "--prod", "--depth", "Infinity", "--json"]);
    const [tree] = JSON.parse(output);
    if (!tree) throw new Error(`pnpm list returned no production tree for ${directory}`);
    roots.push(await enrichLicenses(directory, tree));
  }
  return roots;
}

async function inputs() {
  const [workspaceManifest, coreManifest, guardianManifest, sourceManifest, policy] = await Promise.all([
    readJson(join(root, "package.json")),
    readJson(join(root, "archsync-core", "package.json")),
    readJson(join(root, "archsync-guardian", "package.json")),
    readJson(join(root, "repos.lock.json")),
    readJson(join(root, "release-policy.json")),
  ]);
  const sourceCommit = (process.env.GITHUB_SHA?.match(/^[0-9a-f]{40}$/) && process.env.GITHUB_SHA)
    || run("git", ["rev-parse", "HEAD"]).trim();
  const manifests = [coreManifest, guardianManifest];
  const tarballs = manifests.map(packageTarballName).sort();
  const dependencyGraph = await dependencyRoots();
  const documents = buildSupplyChainDocuments({ workspaceManifest, dependencyRoots: dependencyGraph, sourceCommit });
  assertLicensePolicy(documents.licenses, policy.allowed_licenses);
  const repositories = new Map(sourceManifest.repositories.map((repository) => [repository.path, repository.commit]));
  const packageSources = manifests.map((manifest, index) => {
    const directory = packageDirectories[index];
    const source = repositories.get(directory);
    if (!source?.match(/^[0-9a-f]{40}$/)) throw new Error(`repos.lock.json has no full source commit for ${directory}`);
    return { name: manifest.name, version: manifest.version, artifact: packageTarballName(manifest), source_commit: source };
  });
  const exactFiles = [...tarballs, ...policy.static_payloads, "SHA256SUMS.txt"].sort();
  const releaseManifest = {
    schema_version: "1.0.0",
    release_version: workspaceManifest.version,
    source_commit: sourceCommit,
    immutable_assets: true,
    packages: packageSources.sort((left, right) => left.name.localeCompare(right.name)),
    exact_file_allowlist: exactFiles,
  };
  return { policy, tarballs, exactFiles, documents, releaseManifest };
}

async function writeEvidence() {
  const releaseName = basename(releaseDirectory);
  if (dirname(releaseDirectory) !== root || releaseName !== "release") {
    throw new Error(`refusing unsafe release directory '${releaseDirectory}'`);
  }
  await mkdir(releaseDirectory, { recursive: true });
  const data = await inputs();
  assertExactTarballs(await readdir(releaseDirectory), data.tarballs);
  await copyFile(join(root, "repos.lock.json"), join(releaseDirectory, "repos.lock.json"));
  await Promise.all([
    writeFile(join(releaseDirectory, "SBOM.cdx.json"), stableJson(data.documents.sbom), "utf8"),
    writeFile(join(releaseDirectory, "LICENSES.json"), stableJson(data.documents.licenses), "utf8"),
    writeFile(join(releaseDirectory, "RELEASE-MANIFEST.json"), stableJson(data.releaseManifest), "utf8"),
  ]);
  const payloads = data.exactFiles.filter((file) => file !== "SHA256SUMS.txt");
  const checksumLines = [];
  for (const file of payloads) checksumLines.push(checksumLine(file, await readFile(join(releaseDirectory, file))));
  await writeFile(join(releaseDirectory, "SHA256SUMS.txt"), `${checksumLines.sort().join("\n")}\n`, "utf8");
  await verifyRelease(data);
}

async function trackedTextFiles() {
  const names = run("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]).split("\0").filter(Boolean);
  const findings = [];
  for (const name of names) {
    const bytes = await readFile(join(root, name));
    if (bytes.subarray(0, Math.min(bytes.length, 8192)).includes(0)) continue;
    findings.push(...findSecrets(bytes.toString("utf8"), name));
  }
  if (findings.length) {
    throw new Error(`tracked secret scan failed: ${findings.map(({ file, kind, line }) => `${file}:${line}:${kind}`).join(", ")}`);
  }
}

async function verifyRelease(preloaded) {
  const data = preloaded ?? await inputs();
  const actualFiles = (await readdir(releaseDirectory)).sort();
  assertExactReleaseFiles(actualFiles, data.exactFiles.filter((file) => file !== "SHA256SUMS.txt"));
  const payloads = new Map();
  for (const file of data.exactFiles) {
    if (file !== "SHA256SUMS.txt") payloads.set(file, await readFile(join(releaseDirectory, file)));
  }
  assertChecksumDocument(payloads, await readFile(join(releaseDirectory, "SHA256SUMS.txt"), "utf8"));
  const expectedDocuments = new Map([
    ["SBOM.cdx.json", stableJson(data.documents.sbom)],
    ["LICENSES.json", stableJson(data.documents.licenses)],
    ["RELEASE-MANIFEST.json", stableJson(data.releaseManifest)],
  ]);
  for (const [file, expected] of expectedDocuments) {
    const actual = await readFile(join(releaseDirectory, file), "utf8");
    if (actual !== expected) throw new Error(`${file} is stale; rebuild the release bundle`);
  }
  for (const tarball of data.tarballs) {
    const packageRecord = data.releaseManifest.packages.find(({ artifact }) => artifact === tarball);
    const allowedPaths = data.policy.package_contents[packageRecord.name];
    if (!allowedPaths) throw new Error(`release policy has no package content allowlist for ${packageRecord.name}`);
    assertTarballPolicy(readTarGzEntries(await readFile(join(releaseDirectory, tarball))), allowedPaths, tarball);
  }
  await trackedTextFiles();
  console.log(`RELEASE SECURITY VERIFIED: ${actualFiles.length} exact files, checksums, SBOM, licenses, tar contents and secret scan`);
}

async function scanTrackedFilesOnly() {
  await trackedTextFiles();
  console.log("TRACKED SECRET SCAN VERIFIED");
}

if (operation === "write") await writeEvidence();
else if (operation === "verify") await verifyRelease();
else if (operation === "scan") await scanTrackedFilesOnly();
else {
  console.error("Usage: node scripts/release-security.mjs write|verify|scan");
  process.exitCode = 2;
}
