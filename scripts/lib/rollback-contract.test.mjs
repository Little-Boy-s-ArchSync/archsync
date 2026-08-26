import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  activateVersion,
  activeVersion,
  assertSnapshotUnchanged,
  snapshotVersion,
  stageImmutableVersion,
} from "./rollback-contract.mjs";

test("rolls back by moving an active pointer without overwriting versioned assets", async () => {
  const store = await mkdtemp(join(tmpdir(), "archsync-rollback-test-"));
  try {
    await stageImmutableVersion(store, "v0.3.2", new Map([["artifact.tgz", Buffer.from("previous")]]));
    await stageImmutableVersion(store, "v0.3.3", new Map([["artifact.tgz", Buffer.from("current")]]));
    const previousBefore = await snapshotVersion(store, "v0.3.2");
    const currentBefore = await snapshotVersion(store, "v0.3.3");
    await activateVersion(store, "v0.3.3");
    assert.equal(await activeVersion(store), "v0.3.3");
    await activateVersion(store, "v0.3.2");
    assert.equal(await activeVersion(store), "v0.3.2");
    assertSnapshotUnchanged(previousBefore, await snapshotVersion(store, "v0.3.2"), "v0.3.2");
    assertSnapshotUnchanged(currentBefore, await snapshotVersion(store, "v0.3.3"), "v0.3.3");
    await assert.rejects(
      stageImmutableVersion(store, "v0.3.2", new Map([["artifact.tgz", Buffer.from("overwrite")]])),
      /already exists/,
    );
  } finally {
    await rm(store, { recursive: true, force: true });
  }
});

test("rejects unsafe versions and artifact paths", async () => {
  const store = await mkdtemp(join(tmpdir(), "archsync-rollback-test-"));
  try {
    await assert.rejects(stageImmutableVersion(store, "latest", new Map()), /invalid immutable/);
    await assert.rejects(
      stageImmutableVersion(store, "v1.0.0", new Map([["../escape", Buffer.from("unsafe")]])),
      /unsafe release artifact/,
    );
  } finally {
    await rm(store, { recursive: true, force: true });
  }
});
