# Offline, Privacy, and Diagnostic Contract

## Network behavior

After dependencies are installed, `archsync model`, `scan`, `check`, `demo`, and
the local verification logic do not require telemetry or provider calls. The
following explicit maintenance commands use the network:

- dependency installation and `pnpm run security:audit`;
- `pnpm run verify:remote`;
- Git/GitHub release operations.

There is no opt-out telemetry because the current CLI sends no product telemetry.
Future telemetry/provider work is opt-in and blocked until its separate security
and research protocol is approved.

Repair-candidate test commands may run only through a caller-selected isolation
policy whose mechanism is explicitly approved and available. The verifier fails
closed when that boundary is missing; it must not silently fall back to an
unisolated host process.

## Data and logs

Inputs remain in the selected workspace. Diagnostics may contain repository paths,
file/line evidence, command versions, exit codes, and sanitized errors. They must
not contain source bodies beyond the evidence needed for the command, credentials,
emails, private URLs, provider request bodies, or PII.

Use ordinary output for users and `--json` for automation. Debug/verbose collection
is opt-in. Before sharing a log, redact user names, absolute paths, tokens, private
repository names, and research participant identifiers.

## Temporary files and retention

Package/install verification and rollback drills use an operating-system temporary
directory and remove it after success or failure. Local `release/`, `artifacts/`,
coverage, and logs are ignored workspace outputs. CI verification/security evidence
is retained for 14 days; GitHub Release assets follow the immutable release policy.

A failed cleanup is an operational failure to report; it must not be hidden as a
successful run. Never place secrets in temporary filenames or command arguments.
