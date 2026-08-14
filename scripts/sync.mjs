import { readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const remoteMode = process.argv.includes("--remote");
const manifest = JSON.parse(await readFile(join(root, "repos.lock.json"), "utf8"));
const failures = [];

function git(args) {
  return spawnSync("git", args, { cwd: root, encoding: "utf8", shell: false });
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

if (manifest.schema_version !== 1 || manifest.repositories.length !== 5) {
  failures.push("repos.lock.json must contain exactly five schema-v1 repository pins");
}

for (const repository of manifest.repositories) {
  const directoryExists = await exists(join(root, repository.path));
  if (!directoryExists) {
    failures.push(`${repository.path}: directory is missing`);
    continue;
  }

  const history = git([
    "log",
    "--format=%B",
    `--grep=git-subtree-dir: ${repository.path}`,
    "-n",
    "1",
  ]);
  const split = history.stdout.match(/git-subtree-split:\s*([0-9a-f]{40})/i)?.[1];
  const localMatch = history.status === 0 && split === repository.commit;
  console.log(`[${localMatch ? "PASS" : "FAIL"}] ${repository.path} local pin ${split ?? "missing"}`);
  if (!localMatch) failures.push(`${repository.path}: subtree history does not match ${repository.commit}`);

  if (remoteMode) {
    const remote = git(["ls-remote", repository.repository, `refs/heads/${repository.branch}`]);
    const remoteCommit = remote.status === 0 ? remote.stdout.trim().split(/\s+/)[0] : undefined;
    const remoteMatch = remoteCommit === repository.commit;
    console.log(`[${remoteMatch ? "PASS" : "FAIL"}] ${repository.path} remote ${repository.branch} ${remoteCommit ?? "unavailable"}`);
    if (!remoteMatch) failures.push(`${repository.path}: remote ${repository.branch} differs from the imported pin`);
  }
}

if (failures.length > 0) {
  console.error("\nSOURCE SYNC FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`\nSOURCE SYNC VERIFIED (${remoteMode ? "local history and remote heads" : "local history"}).`);
}

