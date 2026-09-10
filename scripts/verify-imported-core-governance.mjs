import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CANONICAL_GITHUB_REPOSITORY,
  policyDocumentIssues,
} from "../archsync-core/scripts/architecture-change-policy.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const prefix = "archsync-core";
const coreRoot = join(root, prefix);
const expectedRepository = `https://github.com/${CANONICAL_GITHUB_REPOSITORY}.git`;

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  }
  return result;
}

function sourceTree(text) {
  return new Map(text.trim().split(/\r?\n/u).filter(Boolean).map((line) => {
    const match = /^(\d+) blob ([0-9a-f]{40})\t(.+)$/u.exec(line);
    if (!match) throw new Error(`unexpected source tree entry: ${line}`);
    return [match[3], `${match[1]}:${match[2]}`];
  }));
}

function importedIndex(text) {
  return new Map(text.trim().split(/\r?\n/u).filter(Boolean).map((line) => {
    const match = /^(\d+) ([0-9a-f]{40}) 0\tarchsync-core\/(.+)$/u.exec(line);
    if (!match) throw new Error(`unexpected imported index entry: ${line}`);
    return [match[3], `${match[1]}:${match[2]}`];
  }));
}

function compareTrees(expected, actual) {
  const issues = [];
  for (const [path, identity] of expected) {
    if (!actual.has(path)) issues.push(`imported snapshot is missing ${path}`);
    else if (actual.get(path) !== identity) issues.push(`imported snapshot differs at ${path}`);
  }
  for (const path of actual.keys()) {
    if (!expected.has(path)) issues.push(`imported snapshot has unpinned file ${path}`);
  }
  return issues;
}

const manifest = JSON.parse(await readFile(join(root, "repos.lock.json"), "utf8"));
const source = manifest.repositories?.find(({ path }) => path === prefix);
const issues = [];

if (source?.repository !== expectedRepository || source?.branch !== "main"
    || !/^[0-9a-f]{40}$/u.test(source?.commit ?? "")) {
  issues.push(`repos.lock.json must pin ${expectedRepository} main by a full commit`);
}

const subtreeCommitResult = git([
  "log",
  "--format=%H",
  `--grep=git-subtree-dir: ${prefix}`,
  "-n",
  "1",
]);
const subtreeCommit = subtreeCommitResult.stdout.trim();
if (!/^[0-9a-f]{40}$/u.test(subtreeCommit)) {
  issues.push("cannot resolve the latest Core subtree source snapshot");
} else {
  const message = git(["show", "-s", "--format=%B", subtreeCommit]).stdout;
  const split = message.match(/git-subtree-split:\s*([0-9a-f]{40})/iu)?.[1];
  if (split !== source?.commit) {
    issues.push(`Core subtree split ${split ?? "missing"} does not match source pin ${source?.commit ?? "missing"}`);
  }

  const expected = sourceTree(git(["ls-tree", "-r", subtreeCommit]).stdout);
  const actual = importedIndex(git(["ls-files", "-s", "--", prefix]).stdout);
  issues.push(...compareTrees(expected, actual));
}

if (git(["diff", "--quiet", "--", prefix], { allowFailure: true }).status !== 0) {
  issues.push("Core subtree working tree differs from its pinned index snapshot");
}

const [policy, procedure, evidenceProcedure, ciWorkflow, recordFiles, evidenceFiles] = await Promise.all([
  readFile(join(coreRoot, "docs", "adr", "0004-architecture-change-policy-proposed.md"), "utf8"),
  readFile(join(coreRoot, "docs", "adr", "acceptance-records", "README.md"), "utf8"),
  readFile(join(coreRoot, "docs", "adr", "acceptance-evidence", "README.md"), "utf8"),
  readFile(join(coreRoot, ".github", "workflows", "ci.yml"), "utf8"),
  readdir(join(coreRoot, "docs", "adr", "acceptance-records")),
  readdir(join(coreRoot, "docs", "adr", "acceptance-evidence")),
]);

issues.push(...policyDocumentIssues(policy, procedure, evidenceProcedure, ciWorkflow));

const governedJson = [...recordFiles, ...evidenceFiles].filter((name) => name.endsWith(".json"));
if (governedJson.length > 0) {
  issues.push("imported snapshot contains governed evidence/closure JSON; verify it in archsync-core before import");
}

for (const relative of [
  ["specs", "gov103-acceptance-record.schema.json"],
  ["specs", "gov103-approval-evidence.schema.json"],
]) {
  try {
    JSON.parse(await readFile(join(coreRoot, ...relative), "utf8"));
  } catch (error) {
    issues.push(`${relative.join("/")} is not valid JSON: ${error.message}`);
  }
}

if (issues.length > 0) {
  throw new Error(`IMPORTED CORE GOV-103 SNAPSHOT INVALID\n- ${issues.join("\n- ")}`);
}

console.log(`VALID IMPORTED CORE GOV-103 SNAPSHOT PROPOSED_PENDING_HUMAN (${source.commit})`);
