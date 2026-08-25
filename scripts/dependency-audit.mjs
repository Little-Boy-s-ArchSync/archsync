import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { assertNoHighRiskVulnerabilities, stableJson, summarizeAuditReports } from "./lib/security-contract.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packageDirectories = ["archsync-core", "archsync-guardian"];
const outputIndex = process.argv.indexOf("--output");
const outputArgument = outputIndex === -1 ? null : process.argv[outputIndex + 1];

function runAudit(directory) {
  const pnpmCli = process.env.npm_execpath?.includes("pnpm") ? process.env.npm_execpath : null;
  const command = pnpmCli ? process.execPath : process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const args = pnpmCli
    ? [pnpmCli, "audit", "--prod", "--audit-level", "high", "--json"]
    : ["audit", "--prod", "--audit-level", "high", "--json"];
  const result = spawnSync(command, args, { cwd: join(root, directory), encoding: "utf8", shell: false });
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error(`pnpm audit for ${directory} did not return JSON: ${(result.stderr || result.stdout).trim()}`);
  }
  return { directory, report };
}

const audits = packageDirectories.map(runAudit);
const summary = summarizeAuditReports(audits.map(({ report }) => report));
const evidence = {
  schema_version: "1.0.0",
  generated_at: new Date().toISOString(),
  command: "pnpm audit --prod --audit-level high --json",
  packages: audits.map(({ directory, report }) => ({
    directory,
    dependencies: report.metadata.dependencies ?? report.metadata.totalDependencies ?? 0,
    vulnerabilities: report.metadata.vulnerabilities,
  })),
  summary,
};

if (outputArgument) {
  const output = isAbsolute(outputArgument) ? outputArgument : join(root, outputArgument);
  const outputRelative = relative(root, output);
  if (outputRelative.startsWith("..") || isAbsolute(outputRelative)) throw new Error("audit output must stay inside the repository workspace");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, stableJson(evidence), "utf8");
}

assertNoHighRiskVulnerabilities(summary);
console.log(
  `DEPENDENCY AUDIT VERIFIED: ${summary.dependencies} production dependencies; ${summary.vulnerabilities.high} high; ${summary.vulnerabilities.critical} critical`,
);
