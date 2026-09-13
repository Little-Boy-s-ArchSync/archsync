# REL-102 Research Release Dry-Run

## Status and scope

This repository contains the machine-executable preparation for `REL-102`. It
does not claim that `P7-101` is complete, that research results exist, that an
independent reproduction passed, or that a release was approved or published.
The committed `research-release-candidate.template.json` is deliberately empty,
blocked by `P7-101`, and rejected by the candidate verifier.

The ordinary product release gate proves package integrity, SBOM and license
generation, secret scanning, immutable assets, and rollback. The REL-102 gate
adds a separate research boundary: the exact paper, benchmark, claim, P7, and
independent-reproduction records must be frozen and attributable before a
research release candidate verification log can be emitted.

## Required immutable inputs

A real candidate manifest uses schema `1.0.0` and lists these seven inputs in
the governed order. Every input has a canonical repository-relative path,
SHA-256 digest, source repository, and full source commit.

| Input ID | Contract |
| --- | --- |
| `p7-results` | Approved `P7-101` release-evidence manifest |
| `paper-results` | Generated EVAL-111/ANALYSIS-101 paper-results manifest |
| `claim-evidence` | Non-empty paper claim-to-evidence ledger |
| `benchmark-results` | Frozen, non-provisional benchmark-results manifest |
| `reproduction-audit` | Passed audit by a person other than the result producer |
| `product-release` | Exact immutable package release manifest |
| `rollback-drill` | Successful immutable rollback-drill evidence |

The candidate also binds eight passed validator records to the exact input
digests: P7 freeze, paper schema, paper claim links, citations, benchmark schema,
independent reproduction, product bundle, and rollback. A validator name alone
is insufficient; each record pins the validator commit and its own evidence
digest.

Four named human approvals are required: P7 owner, research-release owner,
independent reproducer, and Lead. The independent reproducer must differ from
the recorded result producer. These records are never synthesized by the tool.

Retain the original bytes referenced by every validator and approval
`evidence_sha256` at
`artifacts/research-release/evidence/<64-character-sha256>` (no extension).
The checker requires a nonempty regular file, rejects symbolic links and path
escape, and verifies its exact digest before emitting a candidate log. A shared
receipt containing several governed records may be referenced more than once;
its bytes are checked once. A digest string without its retained evidence file
is insufficient. Keep the original file format and bytes; do not generate
placeholder approvals or substitute a summary for its source receipt.

Evidence-byte verification proves correspondence to supplied digest pins. It
does not authenticate a human identity, verify a validator's execution, inspect
the receipt's meaning or replace independent review of the original source.
Use an owner-controlled, quiescent staging directory during the check; path
checks do not provide atomic confinement against a concurrent hostile process
replacing ancestor directories. The checker snapshots the candidate manifest
before asynchronous reads so later caller mutations cannot change its output
identity or recorded decisions.

## Fail-closed execution

CI runs the following safe preparatory check on every operating system and in
the supply-chain job:

```text
pnpm run research-release:validate-template
```

That command succeeds only when the committed template remains the exact empty,
blocked, non-evidence document and the release validator still rejects it.

After all governed inputs and approvals genuinely exist, copy the template to a
new untracked candidate file, populate only observed values, and run:

```text
pnpm run research-release:check -- research-release-candidate.json --write-log artifacts/research-release/release-candidate-verification.json
```

The checker rejects missing or extra records, placeholders, malformed versions
or timestamps, reordered contracts, duplicate identities, unsafe/absolute
paths, symbolic links, path escape, non-regular files, digest mismatch,
provisional or empty result artifacts, self-reproduction, incomplete checks,
missing approvals, and missing, empty or altered validator/approval evidence
bytes. The output uses exclusive creation and cannot overwrite
an existing verification log. It is deterministic for the same manifest and
input bytes.

The emitted log says `verified-candidate-not-published` and always records
`publication_authorized: false`. The log belongs under ignored
`artifacts/research-release/`; it is attached to the governed review/release
workflow only after independent inspection.

## Human gates preserved

Automation cannot perform any of these steps:

1. approve or freeze `P7-101` results;
2. convert paper or benchmark templates into empirical evidence;
3. act as the independent reproducer or create their decision;
4. provide the P7 owner, release owner, or Lead approval;
5. merge the pull requests, tag a version, or publish a GitHub Release.

Until those gates are real, `REL-102` remains formally blocked even though its
validation, provenance, path-containment, and deterministic-log machinery is
prepared and continuously tested.
