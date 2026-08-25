# Security Policy

## Supported versions

| Version | Support status |
| --- | --- |
| `v0.3.2` | latest published research prototype release |
| `main` / `0.3.3` | candidate only; security fixes are developed here |
| older tags | no routine fixes; use only for a documented rollback |

This table does not make the prototype production-ready. See
`docs/SUPPORT-MATRIX.md` for the empirical boundary.

## Private reporting

Do not open a public issue containing a secret, token, private source, personal
data, or exploitable detail. Report privately to the repository Lead through the
team's authenticated internal channel. Include repository, commit/tag, impact,
minimal sanitized reproduction, and containment already performed. If that route
is unavailable, contact an organization owner privately through GitHub before
sharing detail. The project does not publish a security mailbox and will not
invent one in documentation.

Never send a live credential. If exposure is possible, revoke/rotate first and
then collect redacted logs. Response targets, roles, evidence preservation,
credential rotation, coordinated disclosure, and the package-compromise tabletop
are defined in `docs/INCIDENT-RESPONSE.md`.

## Release and research baseline

The supported source baseline is the latest reviewed `main` commit with green CI
and the source pins in `repos.lock.json`. An artifact outside the exact release
manifest or local output in `.archsync/` is not a supported release.

## Research data and provider boundary

- Do not commit secrets, PII, private telemetry, or provider credentials.
- Do not send private code/evidence to a provider before the Phase 4 security gate.
- Public artifacts require license/provenance and double-blind review.
- Prompt/tool output cannot merge itself, edit ground truth, or update a baseline.

A security finding affecting deterministic decisions, evidence integrity, or
artifact provenance is high risk and blocks release until a regression test,
independent review, and rollback plan exist. See `docs/SUPPLY-CHAIN.md`,
`docs/RELEASE.md`, and `docs/PRIVACY.md` for mechanical gates and operating rules.
