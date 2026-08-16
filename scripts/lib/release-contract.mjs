import { createHash } from "node:crypto";

export function packageTarballName(manifest) {
  if (!manifest || typeof manifest.name !== "string" || typeof manifest.version !== "string") {
    throw new TypeError("package manifest must contain string name and version fields");
  }
  const normalizedName = manifest.name.replace(/^@/, "").replaceAll("/", "-");
  if (!normalizedName || !manifest.version) {
    throw new TypeError("package manifest name and version must not be empty");
  }
  return `${normalizedName}-${manifest.version}.tgz`;
}

export function assertExactTarballs(files, expectedFiles) {
  const actual = files.filter((file) => file.endsWith(".tgz")).sort();
  const expected = [...expectedFiles].sort();
  if (actual.length !== expected.length || actual.some((file, index) => file !== expected[index])) {
    throw new Error(`release tarballs differ: expected ${expected.join(", ")}; found ${actual.join(", ")}`);
  }
  return actual;
}

export function checksumLine(file, bytes) {
  return `${createHash("sha256").update(bytes).digest("hex")}  ${file}`;
}
