import { readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const checks = [];

function record(name, ok, detail) {
  checks.push({ name, ok, detail });
}

function commandVersion(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
record("Node.js", nodeMajor >= 22, `${process.versions.node} (required: >=22)`);

const gitVersion = commandVersion("git", ["--version"]);
record("Git", Boolean(gitVersion), gitVersion ?? "not found");

const pnpmVersion = process.env.npm_execpath
  ? commandVersion(process.execPath, [process.env.npm_execpath, "--version"])
  : commandVersion(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["--version"]);
record("pnpm", pnpmVersion === "11.16.0", `${pnpmVersion ?? "not found"} (required: 11.16.0)`);

const expectedPackages = new Map([
  ["archsync-core", "@archsync/core"],
  ["archsync-guardian", "@archsync/guardian"],
  ["archsync-benchmark", "archsync-benchmark"],
  ["archsync-mcp", "@archsync/mcp"],
  ["archsync-examples", "archsync-examples"],
]);

for (const [directory, packageName] of expectedPackages) {
  const packagePath = join(root, directory, "package.json");
  if (!(await exists(packagePath))) {
    record(directory, false, "package.json is missing");
    continue;
  }
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  record(directory, packageJson.name === packageName, `${packageJson.name} ${packageJson.version}`);
}

record("Source lock", await exists(join(root, "repos.lock.json")), "repos.lock.json");
record("Core CLI", await exists(join(root, "archsync-core", "dist", "bin.js")), "dist/bin.js");
record("Guardian CLI", await exists(join(root, "archsync-guardian", "dist", "bin.js")), "dist/bin.js");

console.log("ARCHSYNC MONOREPO DOCTOR\n");
for (const check of checks) {
  console.log(`[${check.ok ? "PASS" : "FAIL"}] ${check.name.padEnd(20)} ${check.detail}`);
}

const failed = checks.filter(({ ok }) => !ok);
if (failed.length > 0) {
  console.error(`\nNOT READY: ${failed.length} check(s) failed.`);
  process.exitCode = 2;
} else {
  console.log("\nREADY: The monorepo can build, verify and run the ArchSync CLI.");
}
