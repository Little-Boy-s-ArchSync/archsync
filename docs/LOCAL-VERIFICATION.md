# Local Verification

Local verification is the default integration gate while GitHub-hosted runner
quota is unavailable. It executes the same deterministic product gates from a
clean tracked worktree and records a provenance bundle for the exact commit.

## Run

From the monorepo root:

```powershell
pnpm run verify:local
```

The command performs the following operations in order:

1. installs the root lockfile without modification;
2. bootstraps the component packages;
3. runs the environment doctor;
4. runs policy, security, sync, Core, Guardian, Benchmark, Examples and MCP
   boundary gates;
5. runs the PASS, BLOCK and REVIEW demo; and
6. rejects generated source differences.

The default bundle is written under ignored
`artifacts/local-verification/`. It contains `summary.json`, a concise
`README.md` and one raw log per command. Every log has a SHA-256 digest.

After the target commit has been reviewed, an owner may create a tracked bundle
for a task or milestone:

```powershell
pnpm run verify:local:publish
```

The tracked path is `evidence/local-verification/<commit>/`. Do not edit a
published bundle. A later code commit requires a new bundle.

## Meaning of PASS

A local `PASS` is valid verification evidence when all of these conditions
hold:

- the tracked worktree was clean before execution;
- the bundle identifies the full commit, branch, remote, UTC interval and
  toolchain;
- every required command exited with code zero;
- raw logs and their hashes are retained; and
- no task-specific evidence requirement is missing.

Local verification replaces only the hosted execution provider. It does not
replace a required reviewer, approval, signature, database query, real model
run, holdout annotation, frozen protocol or external integration check.

## When remote CI is still required

Run remote CI at release, submission or another declared milestone when hosted
capacity is available. A task may be marked Done earlier with a valid local
bundle if its Definition of Done does not explicitly require a GitHub-only
behavior such as branch protection, Codespaces or release publication.
