import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const operation = process.argv[2];
const packageDirectories = [
  "archsync-core",
  "archsync-guardian",
  "archsync-benchmark",
  "archsync-examples",
];

function runPnpm(directory, args) {
  const cwd = join(root, directory);
  const pnpmCli = process.env.npm_execpath;
  const command = pnpmCli ? process.execPath : process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const commandArgs = pnpmCli ? [pnpmCli, ...args] : args;
  console.log(`\n==> ${directory}: pnpm ${args.join(" ")}`);
  const result = spawnSync(command, commandArgs, { cwd, stdio: "inherit", shell: false });
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
  await mkdir(release, { recursive: true });
  runPnpm("archsync-core", ["pack", "--pack-destination", release]);
  runPnpm("archsync-guardian", ["pack", "--pack-destination", release]);
  const files = (await readdir(release)).filter((file) => file.endsWith(".tgz")).sort();
  const checksums = [];
  for (const file of files) {
    const bytes = await readFile(join(release, file));
    checksums.push(`${createHash("sha256").update(bytes).digest("hex")}  ${file}`);
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
