# ArchSync Examples

Every pull request has an independent `generated views and contracts` status check. CI verifies the SHA-bound vendored Core package, regenerates every Mermaid/draw.io view and conformance report, validates all models, and fails if committed output is stale. The vendored package avoids personal credentials or cross-repository private tokens; its exact source commit and SHA-256 live in `vendor/manifest.json`.

Ready-to-read Architecture Model examples and team-facing documentation for ArchSync.

The Vietnamese team roadmap is available at [`docs/roadmap/ArchSync_Roadmap.pdf`](docs/roadmap/ArchSync_Roadmap.pdf). It reflects the approved five-repository structure.

## Models

- `models/minimal.architecture.yaml`: smallest valid model.
- `models/order-platform.architecture.yaml`: five-component reference with all four rule types (`deny`, `allow`, `require`, `require-path`) and quality goals.
- `models/order-platform.violation.architecture.yaml`: schema-valid observed graph that violates `ARCH-001` and `ARCH-004`.
- `models/order-platform.evolution.architecture.yaml`: schema-valid observed graph that adds Redis and requires approval.
- `models/event-driven-orders.architecture.yaml`: queue-and-worker topology with ownership, rules and goals.

## Demo architecture errors

```bash
# Show actionable rule violations (exit 1)
pnpm exec archsync check models/order-platform.architecture.yaml models/order-platform.violation.architecture.yaml

# Open this editable report in draw.io
pnpm exec archsync report models/order-platform.architecture.yaml models/order-platform.violation.architecture.yaml docs/generated/order-platform-violation-report.drawio

# Show a non-violating architecture evolution that requires approval (exit 3)
pnpm exec archsync check models/order-platform.architecture.yaml models/order-platform.evolution.architecture.yaml
```

The violation report marks the forbidden and missing required edges in red. The evolution report marks Redis and its new relationship in orange. These observed graphs are explicit examples; automatic discovery from source code is implemented by Guardian in Phase 2.

## Verify generated views

```bash
pnpm install --frozen-lockfile
pnpm verify
```

Both Mermaid and editable draw.io views are checked byte-for-byte against the model. Update them after an intentional model change:

```bash
pnpm generated:update
pnpm verify
```

Generated normal views and annotated conformance reports are derived artifacts. They are not a source of truth.
