# Supply-Chain and Release Evidence

## Deterministic offline gate

`pnpm run release:pack` creates the two package tarballs and then runs the release
security writer/verifier. The verifier fails when:

- the release directory has a missing or extra file;
- a SHA-256 digest or checksum member differs;
- an npm tarball contains an unsafe path, link, unexpected content root, or a
  high-confidence secret;
- SBOM, license inventory, source commit, or package provenance is stale;
- a third-party production dependency has a license outside
  `release-policy.json`;
- a tracked text file contains a private key or a high-confidence provider token.

The SBOM is CycloneDX 1.5 and is generated from the installed production graph of
Core and Guardian. Duplicate transitive packages are normalized by package URL.
First-party package manifests currently do not declare a repository license, so
their inventory value is `NOASSERTION`; this is allowed only for first-party
components and must be resolved before a public licensing claim.

## Online dependency audit

`pnpm run security:audit -- --output artifacts/security/dependency-audit.json`
runs `pnpm audit --prod --audit-level high --json` for Core and Guardian. High or
critical advisories block release. Moderate/low findings remain in the timestamped
CI evidence for triage. The online report is intentionally not checksummed into
the deterministic release payload because registry advisories can change without
source changes.

An exception to a high/critical advisory requires a private risk record with
owner, rationale, compensating control, expiry, and Lead approval; until the
policy is amended to consume that signed record, the automated gate remains
fail-closed.

## Secret handling

The scanner reports only file, line, and credential class; it never prints the
matched value. It covers tracked text and unpacked release tar entries. This is a
release gate, not a replacement for credential hygiene or repository-host secret
scanning. A suspected credential is revoked/rotated before sanitized evidence is
collected.
