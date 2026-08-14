import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  analyzeConformance,
  generateConformanceDrawio,
  generateConformanceMermaid,
  generateDrawio,
  generateMermaid,
  loadArchitecture,
} from "@archsync/core";

async function requiredModel(relativePath) {
  const result = await loadArchitecture(new URL(`../${relativePath}`, import.meta.url));
  assert.equal(result.valid, true, `${relativePath} must be valid`);
  assert.ok(result.value);
  return result.value;
}

const model = await requiredModel("models/order-platform.architecture.yaml");
const violation = await requiredModel("models/order-platform.violation.architecture.yaml");
const evolution = await requiredModel("models/order-platform.evolution.architecture.yaml");
const violationResult = analyzeConformance(model, violation);
const evolutionResult = analyzeConformance(model, evolution);
assert.equal(violationResult.classification, "violation");
assert.deepEqual(
  violationResult.findings
    .filter(({ kind }) => kind !== "architecture-evolution")
    .map(({ id }) => id),
  ["ARCH-001", "ARCH-004"],
);
assert.equal(evolutionResult.classification, "evolution");

const expected = {
  "docs/generated/order-platform.mmd": generateMermaid(model),
  "docs/generated/order-platform.drawio": generateDrawio(model),
  "docs/generated/order-platform-violation-report.mmd": generateConformanceMermaid(model, violation, violationResult),
  "docs/generated/order-platform-violation-report.drawio": generateConformanceDrawio(model, violation, violationResult),
  "docs/generated/order-platform-evolution-report.mmd": generateConformanceMermaid(model, evolution, evolutionResult),
  "docs/generated/order-platform-evolution-report.drawio": generateConformanceDrawio(model, evolution, evolutionResult),
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

for (const [relativePath, generated] of Object.entries(expected)) {
  const fileUrl = new URL(`../${relativePath}`, import.meta.url);
  const committed = await readFile(fileUrl, "utf8");
  assert.equal(
    committed,
    generated,
    `${relativePath} is stale; run 'pnpm diagram:update' and commit the result`,
  );
  console.log(`VALID GENERATED VIEW ${relativePath} sha256:${sha256(committed)}`);
}
