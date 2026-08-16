import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertExactTarballs,
  checksumLine,
  packageTarballName,
} from "./lib/release-contract.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const operation = process.argv[2];
const packageDirectories = [
  "archsync-core",
  "archsync-guardian",
  "archsync-benchmark",
  "archsync-examples",
];

function runPnpm(directory, args, environment = process.env) {
  const cwd = join(root, directory);
  const pnpmCli = process.env.npm_execpath;
  const command = pnpmCli ? process.execPath : process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const commandArgs = pnpmCli ? [pnpmCli, ...args] : args;
  console.log(`\n==> ${directory}: pnpm ${args.join(" ")}`);
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: environment,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function verifyMcpBoundary() {
  const required = [
    "archsync-mcp/README.md",
    "archsync-mcp/docs/BOUNDARY.md",
  ];
  for (const file of required) {
    const result = spawnSync("git", ["ls-files", "--error-unmatch", file], {
      cwd: root,
      stdio: "ignore",
      shell: false,
    });
    if (result.status !== 0) {
      console.error(`Missing tracked MCP boundary document: ${file}`);
      process.exit(1);
    }
  }
  console.log("\n==> archsync-mcp: documentation boundary verified");
}

async function packRelease() {
  const release = join(root, "release");
  if (dirname(release) !== root || basename(release) !== "release") {
    throw new Error(`refusing to clean unsafe release path: ${release}`);
  }
  const [coreManifest, guardianManifest, sourceManifest] = await Promise.all([
    readFile(join(root, "archsync-core", "package.json"), "utf8").then(JSON.parse),
    readFile(join(root, "archsync-guardian", "package.json"), "utf8").then(JSON.parse),
    readFile(join(root, "repos.lock.json"), "utf8").then(JSON.parse),
  ]);
  const guardianSource = sourceManifest.repositories.find(({ path }) => path === "archsync-guardian");
  if (!guardianSource?.commit?.match(/^[0-9a-f]{40}$/)) {
    throw new Error("repos.lock.json does not contain a valid Guardian source commit");
  }
  const expectedFiles = [coreManifest, guardianManifest].map(packageTarballName);

  await rm(release, { recursive: true, force: true });
  await mkdir(release, { recursive: true });
  runPnpm("archsync-core", ["pack", "--pack-destination", release]);
  runPnpm("archsync-guardian", ["pack", "--pack-destination", release], {
    ...process.env,
    ARCHSYNC_SOURCE_COMMIT: guardianSource.commit,
  });
  const files = assertExactTarballs(await readdir(release), expectedFiles);
  const checksums = [];
  for (const file of files) {
    const bytes = await readFile(join(release, file));
    checksums.push(checksumLine(file, bytes));
  }
  await writeFile(join(release, "SHA256SUMS.txt"), `${checksums.join("\n")}\n`, "utf8");
  console.log(`\nPACKED ${files.length} package(s) in ${release}`);
}

if (operation === "bootstrap") {
  for (const directory of packageDirectories) runPnpm(directory, ["install", "--frozen-lockfile"]);
  runPnpm("archsync-core", ["build"]);
  runPnpm("archsync-guardian", ["build"]);
} else if (operation === "build") {
  runPnpm("archsync-core", ["build"]);
  runPnpm("archsync-guardian", ["build"]);
} else if (operation === "verify") {
  runPnpm("archsync-core", ["phase1:verify"]);
  runPnpm("archsync-guardian", ["phase3:verify"]);
  runPnpm("archsync-benchmark", ["verify"]);
  runPnpm("archsync-examples", ["verify"]);
  verifyMcpBoundary();
} else if (operation === "cli-install") {
  runPnpm("archsync-guardian", ["add", "--global", "."]);
} else if (operation === "pack") {
  await packRelease();
} else {
  console.error("Usage: node scripts/workspace.mjs bootstrap|build|verify|cli-install|pack");
  process.exitCode = 2;
}
