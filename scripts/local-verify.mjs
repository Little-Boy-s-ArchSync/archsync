import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { hostname, platform, release, arch } from "node:os";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const publish = process.argv.includes("--publish");
const startedAt = new Date();

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: options.env ?? process.env,
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
  });
}

function output(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function git(args) {
  const result = run("git", args);
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${output(result).trim()}`);
  }
  return result.stdout.trim();
}

function resolvePnpm() {
  if (process.env.npm_execpath) {
    return { command: process.execPath, prefix: [process.env.npm_execpath] };
  }
  return {
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    prefix: [],
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const targetCommit = git(["rev-parse", "HEAD"]);
const branch = git(["branch", "--show-current"]);
const remote = git(["remote", "get-url", "origin"]);
const trackedStatus = git(["status", "--porcelain", "--untracked-files=no"]);
if (trackedStatus) {
  console.error("LOCAL VERIFY REFUSED: tracked worktree changes are present.");
  console.error(trackedStatus);
  process.exit(2);
}

const safeTimestamp = startedAt.toISOString().replaceAll(":", "-");
const bundleRoot = publish
  ? join(root, "evidence", "local-verification", targetCommit)
  : join(root, "artifacts", "local-verification", `${targetCommit.slice(0, 12)}-${safeTimestamp}`);
const logRoot = join(bundleRoot, "logs");
await mkdir(logRoot, { recursive: true });

const pnpm = resolvePnpm();
const commands = [
  { id: "install", command: pnpm.command, args: [...pnpm.prefix, "install", "--frozen-lockfile"] },
  { id: "bootstrap", command: pnpm.command, args: [...pnpm.prefix, "run", "bootstrap"] },
  { id: "doctor", command: pnpm.command, args: [...pnpm.prefix, "run", "doctor"] },
  { id: "verify-all", command: pnpm.command, args: [...pnpm.prefix, "run", "verify:all"] },
  { id: "demo", command: pnpm.command, args: [...pnpm.prefix, "run", "demo"] },
  { id: "generated-diff", command: "git", args: ["diff", "--exit-code"] },
];

const records = [];
let failed = false;
for (const specification of commands) {
  const commandStartedAt = new Date();
  console.log(`\n==> ${specification.id}: ${specification.command} ${specification.args.join(" ")}`);
  const result = run(specification.command, specification.args);
  const rawLog = output(result);
  process.stdout.write(rawLog);
  const logPath = join(logRoot, `${specification.id}.log`);
  await writeFile(logPath, rawLog, "utf8");
  records.push({
    id: specification.id,
    command: [specification.command, ...specification.args].join(" "),
    cwd: ".",
    started_at_utc: commandStartedAt.toISOString(),
    finished_at_utc: new Date().toISOString(),
    duration_ms: Date.now() - commandStartedAt.getTime(),
    exit_code: result.status,
    status: result.status === 0 ? "PASS" : "FAIL",
    log: relative(bundleRoot, logPath).replaceAll("\\", "/"),
    log_sha256: sha256(rawLog),
  });
  if (result.status !== 0) {
    failed = true;
    break;
  }
}

const versionResult = run(pnpm.command, [...pnpm.prefix, "--version"]);
const gitVersion = run("git", ["--version"]);
const finishedAt = new Date();
const summary = {
  schema_version: "1.0.0",
  verification_provider: "local-clean-worktree",
  status: failed ? "FAIL" : "PASS",
  target: {
    repository: remote,
    branch,
    commit: targetCommit,
  },
  environment: {
    os: `${platform()} ${release()}`,
    architecture: arch(),
    node: process.versions.node,
    pnpm: versionResult.status === 0 ? versionResult.stdout.trim() : null,
    git: gitVersion.status === 0 ? gitVersion.stdout.trim() : null,
    hostname_sha256: sha256(hostname()),
  },
  started_at_utc: startedAt.toISOString(),
  finished_at_utc: finishedAt.toISOString(),
  duration_ms: finishedAt.getTime() - startedAt.getTime(),
  github_actions: "not-required-for-this-local-verification",
  commands: records,
};
await writeFile(join(bundleRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

const readme = `# ArchSync Local Verification\n\n- Status: ${summary.status}\n- Provider: local clean worktree\n- Target commit: \`${targetCommit}\`\n- Branch: \`${branch}\`\n- Started UTC: ${summary.started_at_utc}\n- Finished UTC: ${summary.finished_at_utc}\n- Node.js: ${summary.environment.node}\n- pnpm: ${summary.environment.pnpm ?? "unavailable"}\n- OS: ${summary.environment.os} (${summary.environment.architecture})\n\n| Gate | Status | Exit code | Log SHA-256 |\n| --- | --- | ---: | --- |\n${records.map((record) => `| ${record.id} | ${record.status} | ${record.exit_code ?? "null"} | \`${record.log_sha256}\` |`).join("\n")}\n\nThis bundle records a real local execution. It does not claim that GitHub Actions ran, and it does not replace human approval, independent review, or external research evidence required by a task.\n`;
await writeFile(join(bundleRoot, "README.md"), readme, "utf8");

const summaryBytes = await readFile(join(bundleRoot, "summary.json"));
console.log(`\nLOCAL VERIFICATION ${summary.status}`);
console.log(`Evidence: ${bundleRoot}`);
console.log(`summary.json SHA-256: ${sha256(summaryBytes)}`);
if (failed) process.exitCode = 1;
