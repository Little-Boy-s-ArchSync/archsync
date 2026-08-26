# Support Matrix and Known Limitations

## Supported environment

| Area | Supported and verified | Outside the current claim |
| --- | --- | --- |
| Operating system | current GitHub-hosted Windows, Ubuntu, and macOS runners | mobile/embedded OS; unsupported runner images |
| Runtime | Node.js 22.x; package metadata requires `>=22` | Node.js 21 and earlier; alternative JS runtimes |
| Package manager | pnpm 11.16.0 through Corepack | npm/yarn install flows for the monorepo |
| Language scope | TypeScript/Node.js fixtures represented in D1/D2 | cross-language static analysis |
| Inputs | tracked local source/model/benchmark files | arbitrary remote repositories or private telemetry |
| Network | deterministic model/scan/check/demo gates run offline after install | online audit and remote-pin checks require network |

The latest published release is `v0.3.2`. Root `0.3.3` is a release candidate
until a matching approved tag and GitHub Release exist.

## Supported observation patterns

The Phase 1--3 evidence covers direct, statically recognizable TypeScript uses of
HTTP/fetch, PostgreSQL, Redis, and AMQP patterns represented by the frozen D2
corpus. The CLI reports file/line evidence for supported findings and distinguishes
PASS, BLOCK, and REVIEW.

## Known limitations

- Dynamic module loading, runtime-generated endpoints, reflective access, custom
  wrappers, complex dependency injection, unresolved aliases, and generated code
  can be unsupported or uncertain.
- A missing observation is not proof that a relationship does not exist.
- Incremental analysis is checked against the full-scan oracle only for the frozen
  benchmark scope; performance/generalization outside it is not yet claimed.
- Phase 4 AI explanations/repairs, Phase 5 IaC, Phase 6 runtime evidence, and the
  independent D3 holdout are not stable product capabilities.
- The EVAL-102 candidate inventory and ANALYSIS-101 notebook are validated
  preparation artifacts, not sampled repositories, frozen ground truth, executed
  measurements, or research results.
- Repair test execution requires an explicitly approved filesystem-isolation
  mechanism. Importing the Guardian foundation does not grant sandbox authority
  or make an unavailable isolation mechanism safe.
- ArchSync does not auto-merge, auto-approve evolution, or update the architecture
  baseline from an AI/provider response.

## Exit codes and diagnostics

Use `archsync --help` for the current command surface and `archsync doctor` for
environment checks. Machine consumers must use `--json` and honor its versioned
contract; human output is not a parsing API. INVALID, BLOCK, REVIEW, and provider
or operational failure must not be coerced to PASS.
