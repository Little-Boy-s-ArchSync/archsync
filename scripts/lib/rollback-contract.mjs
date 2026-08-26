import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

function assertVersion(version) {
  if (!/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`invalid immutable release version '${version}'`);
  }
}

function assertArtifactName(file) {
  if (!file || basename(file) !== file || file === "." || file === "..") {
    throw new Error(`unsafe release artifact name '${file}'`);
  }
}

export async function stageImmutableVersion(store, version, files) {
  assertVersion(version);
  const target = join(store, version);
  try {
    await mkdir(target, { recursive: false });
  } catch (error) {
    if (error.code === "EEXIST") throw new Error(`immutable release '${version}' already exists`);
    throw error;
  }
  for (const [file, bytes] of [...files.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    assertArtifactName(file);
    await writeFile(join(target, file), bytes, { flag: "wx" });
  }
  return target;
}

export async function snapshotVersion(store, version) {
  assertVersion(version);
  const directory = join(store, version);
  const snapshot = {};
  for (const file of (await readdir(directory)).sort()) {
    assertArtifactName(file);
    snapshot[file] = createHash("sha256").update(await readFile(join(directory, file))).digest("hex");
  }
  return snapshot;
}

export async function activateVersion(store, version) {
  assertVersion(version);
  await readdir(join(store, version));
  const temporary = join(store, `.ACTIVE-${process.pid}`);
  await writeFile(temporary, `${version}\n`, { flag: "wx" });
  await rename(temporary, join(store, "ACTIVE"));
}

export async function activeVersion(store) {
  return (await readFile(join(store, "ACTIVE"), "utf8")).trim();
}

export function assertSnapshotUnchanged(before, after, version) {
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(`immutable release '${version}' changed during rollback`);
  }
}
