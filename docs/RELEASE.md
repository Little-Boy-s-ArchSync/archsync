# Release, SemVer, and Rollback Policy

## Release authority

The TV1 release owner prepares the candidate and evidence. Because release and
security are high-risk boundaries under `docs/GOVERNANCE.md`, the repository Lead
must approve the exact commit and version before a tag is created. Only the
GitHub Actions release workflow may publish assets. A local build or a manual
workflow run is a candidate, not a release.

## Semantic Versioning

The root package version is the release-train version and must be valid SemVer.
The Core and Guardian packages keep their own SemVer versions. Version changes
follow these rules:

- MAJOR: incompatible CLI JSON, architecture, graph, finding, or evidence contract.
- MINOR: backward-compatible capability or new supported detector/command.
- PATCH: backward-compatible fix, evidence correction, documentation, or security
  hardening that does not change a public contract.
- Pre-release identifiers are allowed for test candidates but are never described
  as stable.

Every release PR updates `CHANGELOG.md`. A tag must be exactly `v<root version>`,
must identify a commit reachable from `main`, and must map to one immutable GitHub
Release. Reusing a tag or publishing different bytes under an existing version is
forbidden.

## Candidate checklist

1. Start from a clean checkout of the proposed commit.
2. Run `pnpm install --frozen-lockfile` and `pnpm run bootstrap`.
3. Run `pnpm run verify:all`, `pnpm run demo`, and `pnpm run release:pack`.
4. Run `pnpm run security:audit` and `pnpm run release:rollback-drill`.
5. Review `release/RELEASE-MANIFEST.json`, `SBOM.cdx.json`, `LICENSES.json`, and
   `SHA256SUMS.txt`; confirm the release directory has no extra file.
6. Obtain the required independent review and Lead approval for the exact commit.
7. Create the matching tag. The workflow repeats every gate before publishing.

The release workflow has read-only repository permission while building. A
separate publish job receives `contents: write` only for a matching tag after the
build job passes.

## Artifact retention and immutability

Workflow candidates are retained for 14 days. Published GitHub Release assets are
versioned records and must not be overwritten or deleted during ordinary release
work. `gh release upload --clobber`, tag force updates, and reuse of an existing
version are prohibited. The exact release allowlist is:

- Core and Guardian tarballs derived from their package names and versions;
- `repos.lock.json`;
- `RELEASE-MANIFEST.json`;
- `SBOM.cdx.json`;
- `LICENSES.json`;
- `SHA256SUMS.txt`.

## Rollback

Rollback changes the recommended/active version; it never mutates old assets.

1. Stop new publication and record the affected version, commit, and incident.
2. Verify the previous release checksums and install it in a clean environment.
3. Run `archsync version`, `archsync doctor`, and the three-scenario demo.
4. Point users to the verified previous tag and document the reason in release
   notes/security advisory as appropriate.
5. Fix forward under a new SemVer version. Never rebuild the affected version.

`pnpm run release:rollback-drill` stages current and previous version records in a
temporary immutable store, moves only the active pointer, proves both snapshots
are unchanged, and proves that restaging the old version is rejected.
