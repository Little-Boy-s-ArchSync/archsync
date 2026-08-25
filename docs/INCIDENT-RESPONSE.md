# Security Incident and Tabletop Runbook

## Severity and response targets

| Severity | Example | Acknowledge | Contain | Release effect |
| --- | --- | ---: | ---: | --- |
| P0 critical | active credential abuse, malicious release, evidence tampering | 1 hour | 4 hours | stop publication immediately |
| P1 high | exploitable package issue, private data exposure, decision bypass | 4 hours | 1 business day | block release |
| P2 medium | limited exposure with compensating control | 1 business day | 3 business days | Lead decides with record |
| P3 low | hardening or non-exploitable defect | 3 business days | planned milestone | no automatic block |

Targets are team operating objectives, not promises to external reporters.

## Roles

- Reporter: uses the private reporting channel in `SECURITY.md` and sends no live
  credential.
- Incident lead: repository Lead; assigns severity and stop/go decision.
- Technical owner: TV1 for release/supply chain, relevant component owner for code.
- Evidence recorder: a person other than the person applying the emergency fix
  when possible.
- Release reviewer: verifies clean install, checksums, rollback, and regression.

## Response procedure

1. **Receive and sanitize:** acknowledge privately; create an immutable incident
   ID; remove secret/PII from logs before sharing.
2. **Contain:** disable the affected workflow/provider, revoke tokens, rotate
   credentials, quarantine suspect assets, and stop new releases.
3. **Preserve evidence:** record UTC time, repository, commit/tag, workflow run,
   checksums, affected versions, and sanitized reproduction. Do not edit original
   evidence.
4. **Assess:** assign severity, blast radius, data classes, and whether an
   architecture decision or research result may be invalid.
5. **Eradicate and recover:** fix on a branch, add a regression test, run all
   security/release gates, and roll back by selecting an older immutable version
   when needed.
6. **Disclose:** coordinate a private advisory and affected-user notice before
   publishing exploit detail. Credit is agreed with the reporter.
7. **Close:** document root cause, timeline, decisions, remaining risk, credential
   rotation, and follow-up owner/expiry.

## Credential and provider incident

Revoke first; do not wait for root-cause confirmation. Rotate repository, package,
cloud, model-provider, and institutional tokens independently. Review workflow
logs and artifacts for the old credential class, invalidate cached credentials,
and verify the replacement has minimum scope. Never paste a replacement token in
an issue, PR, artifact, or chat transcript.

## Package compromise and rollback tabletop

Run this tabletop before a stable release and after changing delivery logic:

1. Assume the current Guardian tarball hash differs from `SHA256SUMS.txt`.
2. TV1 stops publication and the Lead declares P0.
3. Verify the previous GitHub Release checksum in a clean environment.
4. Run `pnpm run release:rollback-drill`; confirm active version moves backward,
   both version snapshots remain byte-identical, and overwrite is rejected.
5. Record the selected prior tag, decision owner, user guidance, fix-forward
   version, and disclosure decision.

Expected decision: quarantine the mismatched asset, recommend the verified prior
version, preserve evidence, and publish a new version only after all gates and
independent review pass. Passing the automated drill proves mechanics, not that a
human incident review occurred.
