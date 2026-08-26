# Upgrade and Downgrade Guide

## Before upgrading

1. Record `archsync version --json`, the installed artifact checksum, Node/pnpm
   versions, and the current architecture/graph/finding contract versions.
2. Read `CHANGELOG.md` and the target GitHub Release notes.
3. Back up configuration and generated evidence; never overwrite frozen research
   evidence.
4. Verify the target tarball against `SHA256SUMS.txt` before installation.

## Upgrade from the previous release

Install the new version in a clean prefix first. Run:

```text
archsync version
archsync doctor
archsync model validate <model>
archsync demo --benchmark <benchmark-path> --scenario all
```

Then replay the project gate and compare normalized JSON with the expected
contract. A breaking contract requires a MAJOR version and a documented migration;
an unknown version fails explicitly rather than being guessed.

The CI supply-chain job packages the current candidate, verifies its exact
contents/evidence, and performs the immutable rollback drill. This checks delivery
mechanics but does not turn the candidate into a published release.

## Downgrade

Select an already-published, checksum-verified older version. Do not replace the
current tag or assets. Re-run doctor, model validation, and the demo after
downgrade. Preserve outputs from both versions under different evidence IDs.

If downgrade crosses an incompatible contract version, restore the matching model,
configuration, and consumer together. Never silently reinterpret newer evidence
with an older reader.
