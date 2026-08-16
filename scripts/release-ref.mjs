import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assertReleaseRef } from "./lib/release-contract.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const result = assertReleaseRef(manifest, process.env.GITHUB_REF_TYPE ?? "branch", process.env.GITHUB_REF_NAME ?? "local");

if (result.mode === "release") {
  console.log(`RELEASE REF VERIFIED: ${result.expectedTag}`);
} else {
  console.log(`RELEASE CANDIDATE VERIFIED: package version ${manifest.version}; publish only from ${result.expectedTag}`);
}
