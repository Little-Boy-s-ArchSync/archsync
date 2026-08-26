import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  activateVersion,
  activeVersion,
  assertSnapshotUnchanged,
  snapshotVersion,
  stageImmutableVersion,
} from "./lib/rollback-contract.mjs";
import { stableJson } from "./lib/security-contract.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const releaseDirectory = join(root, "release");
const outputIndex = process.argv.indexOf("--output");
const outputArgument = outputIndex === -1 ? null : process.argv[outputIndex + 1];
const workspaceManifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const currentVersion = `v${workspaceManifest.version}`;

function previousVersion() {
  const result = spawnSync("git", ["tag", "--list", "v*", "--sort=-v:refname"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) throw new Error(`cannot list prior releases: ${result.stderr.trim()}`);
  return result.stdout.split("\n").find((tag) => tag && tag !== currentVersion) ?? "v0.0.0-drill";
}

const priorVersion = previousVersion();
const store = await mkdtemp(join(tmpdir(), "archsync-rollback-drill-"));
try {
  const currentFiles = new Map();
  for (const file of await readdir(releaseDirectory)) currentFiles.set(file, await readFile(join(releaseDirectory, file)));
  const previousFiles = new Map([
    ["RELEASE-REFERENCE.txt", Buffer.from(`${priorVersion}\n`, "utf8")],
  ]);
  await stageImmutableVersion(store, priorVersion, previousFiles);
  await stageImmutableVersion(store, currentVersion, currentFiles);
  const priorBefore = await snapshotVersion(store, priorVersion);
  const currentBefore = await snapshotVersion(store, currentVersion);
  await activateVersion(store, currentVersion);
  await activateVersion(store, priorVersion);
  assertSnapshotUnchanged(priorBefore, await snapshotVersion(store, priorVersion), priorVersion);
  assertSnapshotUnchanged(currentBefore, await snapshotVersion(store, currentVersion), currentVersion);
  let overwriteBlocked = false;
  try {
    await stageImmutableVersion(store, priorVersion, previousFiles);
  } catch (error) {
    if (!/already exists/.test(error.message)) throw error;
    overwriteBlocked = true;
  }
  if (!overwriteBlocked) throw new Error("rollback drill did not block immutable asset overwrite");
  const evidence = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    current_version: currentVersion,
    rollback_version: priorVersion,
    active_after_drill: await activeVersion(store),
    immutable_overwrite_blocked: overwriteBlocked,
    current_snapshot: currentBefore,
    rollback_snapshot: priorBefore,
  };
  if (outputArgument) {
    const output = isAbsolute(outputArgument) ? outputArgument : join(root, outputArgument);
    const outputRelative = relative(root, output);
    if (outputRelative.startsWith("..") || isAbsolute(outputRelative)) throw new Error("rollback output must stay inside workspace");
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, stableJson(evidence), "utf8");
  }
  console.log(`ROLLBACK DRILL VERIFIED: ${currentVersion} -> ${priorVersion}; immutable assets unchanged; overwrite blocked`);
} finally {
  await rm(store, { recursive: true, force: true });
}
