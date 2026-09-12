# RACI and Reviewer Matrix Proposal (GOV-104)

Status: **PROPOSED - three-member responsibility mapping prepared; human
acceptance pending**.

This document is the prepared artifact for `GOV-104`. It proposes decision
ownership and reviewer requirements; it is not a record that any person accepted
a role or approved a change. The named assignments below are the GOV-104
candidate for the three-member core team. Every GOV-104 acceptance field remains
**UNFILLED** until the exact candidate is reviewed and accepted.

## RACI meanings and constraints

- **R — Responsible:** prepares the change and evidence. There may be multiple
  responsible contributors.
- **A — Accountable:** makes the governed decision. There is exactly one
  accountable role for a particular decision.
- **C — Consulted:** reviews before the decision and supplies relevant domain
  evidence.
- **I — Informed:** receives the retained outcome; being informed is not
  approval.

An account that operates work for Võ Đức Hiếu, Trần Minh Hoàng or Lê Văn Kiệt
under [`ACCOUNT-DELEGATION.md`](ACCOUNT-DELEGATION.md) stays the operator. It
does not inherit three human identities, the Accountable role, or an
independent-review status. `SLR-REV-101` assigns Trần Minh Hoàng only to that
named SLR review; it is not a general reviewer assignment for the decisions
below.

The core team has three members:

- Võ Đức Hiếu - Repository Lead, Research Lead and final high-risk approver;
- Trần Minh Hoàng - Guardian/AI owner, data tooling and technical validation;
- Lê Văn Kiệt - Core/CLI/release owner, evaluation execution and independent
  reproducibility.

Hà Hoàng Bách is an External Support Consultant. Bach may be consulted for
Information Assurance, data or formal-analysis support, but is not a core task
owner, default approver or mandatory reviewer. A candidate that uses Bach's
work must retain the exact contribution and source like any other external
evidence; Bach's absence does not block the default workflow.

## Decision and reviewer matrix

The current risk level is determined by [`GOVERNANCE.md`](GOVERNANCE.md).
The source `GOV-103-r1` policy has completed its independent review, Repository
Lead acceptance and append-only closure in Core, and the accepted source is
imported at `archsync-core@f7b145df7c4cc8c03b6b7449c12cfc5438c975db`.
The immutable P < E < C evidence is recorded in the governance document; the
source ADR retains its original `Proposed` text to preserve the reviewed bytes.
That completed dependency does not accept this `GOV-104` matrix, assign its open
reviewer slots or fill its separate acceptance record. A conditional row has
one Accountable role only after its actual risk is classified.

The rows are cumulative with active governance and task-specific Definitions of
Done. In particular, every medium-risk path still requires Repository Lead
(Hiếu) review even when a component owner is the proposed `A`; accepting this
matrix cannot remove or substitute that existing review.

| Decision boundary | Risk | R - preparer | A - decision role | C - required consultation | I | Minimum reviewer boundary | Proposed A identity | Acceptance state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Research question (RQ) or research protocol | High | Hiếu or named research task owner | Repository Lead | Hoàng for AI/provider/human-review effects; Kiệt for reproducibility/evaluation execution; a qualified specialist when the protocol explicitly requires one | Hoàng, Kiệt and affected owners | Non-author protocol reviewer; statistics/domain review when the protocol requires it | Võ Đức Hiếu | **PENDING - no GOV-104 acceptance record** |
| Architecture Model schema or semantics | High for semantic/incompatible change; medium only for a proven non-semantic compatible output change | Kiệt as Core/schema owner | Repository Lead for high; Core/schema owner for medium | Hiếu for medium; Hoàng for Guardian and benchmark impact; release owner | Hoàng and affected owners | Hoàng reviews when he is not an author; otherwise another named non-author core member; compatibility and benchmark-impact replay remain required | Hiếu for high; Lê Văn Kiệt for medium | **PENDING** |
| Ground truth, adjudication or freeze | High | One named evidence producer, normally Hoàng or Kiệt | Repository Lead | The other non-author technical member, two blind annotators and a domain/statistics reviewer when required by protocol | Core team after freeze | The exact producer cannot be the sole independent reviewer; Hoàng and Kiệt split preparation and verification, while Hiếu approves the gate | Võ Đức Hiếu | **PENDING** |
| Hard rule, conformance decision or merge severity | High | Hoàng for Guardian or Kiệt for Core | Repository Lead | The other technical owner; a qualified Security reviewer when a protection boundary changes | Remaining core member | Non-author rule reviewer and replay against frozen ground truth with retained failures | Võ Đức Hiếu | **PENDING** |
| Repair proposal or repair execution | Medium while it remains offline, disposable and `PROPOSED`; high if it can apply, execute outside approved isolation, alter authority or update a baseline | Hoàng as Guardian/AI repair owner | Guardian/AI owner for medium; Repository Lead for high | Hiếu for medium; Kiệt for component tests and reproducibility; a qualified Security/privacy reviewer when required | Remaining core member | Hiếu review for medium; Kiệt performs non-author code/reproduction review when eligible; high-risk review when elevated | Trần Minh Hoàng for medium; Võ Đức Hiếu for high | **PENDING** |
| High-risk architecture evolution or baseline update | High | Hoàng or Kiệt as the affected component owner | Repository Lead | The other technical owner plus architecture/schema, benchmark, runtime/IaC, privacy/Security and release expertise as affected | Remaining core member | Non-author technical review, exact before/after digests, rollback rehearsal and any task-required independent validation | Võ Đức Hiếu | **PENDING** |
| Empirical paper claim or claim-to-evidence link | High; editorial wording with no scope/result change may be low | Hiếu as paper owner plus the named evidence producer | Repository Lead | Hoàng for technical/model evidence; Kiệt for reproduction; a qualified statistics or citation reviewer when required | Remaining core member | A non-author reviewer traces numerator, denominator, artifact digest and limitations; the evidence producer cannot satisfy required independence | Võ Đức Hiếu | **PENDING** |
| Product or research release | High | Kiệt as release/reproducibility owner | Repository Lead | Hoàng for implementation/provider validation; affected owners; a qualified Security reviewer when required | Entire core team | Hoàng performs non-author release review when eligible; exact commit/version checks, immutable artifacts, rollback drill and all research-release approvals remain required | Võ Đức Hiếu | **PENDING** |

The matrix never reduces a task-specific Definition of Done. Where another
policy requires two annotators, an adjudicator, a Security sign-off, a statistician,
an independent reproducer or multiple named approvals, all of them remain
required even though RACI has one `A`.

## Reviewer roster to complete

The candidate assigns each normal reviewer slot to a core member and records a
fallback rule when that person authored the exact artifact. The assignments do
not become accepted until the named people confirm their scope and the
Repository Lead accepts the exact matrix revision.

| Reviewer slot | Needed for | Human identity | Independence/eligibility evidence | Acceptance reference |
| --- | --- | --- | --- | --- |
| Core/schema reviewer | Schema semantics and compatibility | Trần Minh Hoàng; fallback: a named non-author core member | Primary reviewer is not the Core/schema candidate author; compatibility replay is retained | **UNFILLED** |
| Guardian/hard-rule reviewer | Analyzer, conformance and merge decision | Lê Văn Kiệt; fallback: a named non-author core member | Primary reviewer is outside Guardian implementation for the exact candidate | **UNFILLED** |
| Ground-truth/adjudication reviewer | Annotation, leakage and freeze | Lê Văn Kiệt or Trần Minh Hoàng, whichever did not produce the exact artifact | Producer/reviewer separation and leakage declaration are recorded per candidate | **UNFILLED** |
| Statistics reviewer | Metrics, estimands and empirical claims | Võ Đức Hiếu for methodology; qualified non-author specialist when Hiếu is the author or the protocol requires specialist review | Competence, non-authorship and reviewed estimand are recorded per candidate | **UNFILLED** |
| Repair isolation/Security reviewer | Repair execution, provider, privacy and sandbox boundary | Lê Văn Kiệt for reproduction; qualified Security/privacy specialist when the gate requires that expertise | Hoàng cannot independently approve his own repair; specialist evidence is task-scoped | **UNFILLED** |
| Independent reproducer | Required experimental and research-release checks | Lê Văn Kiệt; fallback: Trần Minh Hoàng when he is not the producer | Reproducer did not create the exact pipeline/output under review | **UNFILLED** |
| Release reviewer | Candidate, artifact, install and rollback evidence | Trần Minh Hoàng; fallback: Lê Văn Kiệt when he is not the producer | Reviewer is not the release candidate author and checks immutable artifacts plus rollback | **UNFILLED** |

The pull-request author, delegated operator, CODEOWNER request, CI actor or person
who generated an artifact is not automatically eligible for any slot.

## Decision routing

1. The preparer classifies the change and fills the evidence/rollback fields.
2. If classification is uncertain, route it as high risk and set
   `PENDING_HUMAN`.
3. Resolve the single Accountable role from the matrix. If the candidate does
   not name an eligible human, stop at `READY_FOR_REVIEW`; do not substitute the
   operator or External Support Consultant.
4. Obtain every specialist and independence review required by the row and the
   task Definition of Done.
5. The named Accountable human decides on the exact candidate after those
   reviews. Record the identity, decision, UTC time, candidate digest, evidence
   digest and authorization reference.
6. Inform the listed roles only after retaining the decision. A notification or
   lack of objection does not complete step 5.

## Holiday-safe operation

When Hiếu, Hoàng or Kiệt cannot interact, already assigned technical work may
continue through inspection, drafting, implementation, deterministic tests,
synthetic fixture checks, evidence collection and preparation of a review
packet. The maximum honest states are `DRAFT`, `READY_FOR_REVIEW` and
`PENDING_HUMAN`.

Absence does not transfer `A`, waive a consultation, establish reviewer
independence or authorize a merge, ground-truth freeze/change, baseline update,
provider disclosure, accepted paper claim, tag, publication or release. Resume
packets should contain the exact candidate revision, concise diff/impact summary,
risk rationale, commands/results, evidence hashes, known limitations, rollback
steps and the specific pending human decisions so no synchronous reconstruction
is needed.

## GOV-104 acceptance record

The proposal bytes must not be edited after review to fill an approval table.
A human acceptance, if granted, must be retained as a separate append-only
record or immutable PR review bound to the exact candidate commit and SHA-256,
with human identity, accountable role, decision, UTC time, authorization URL and
record digest. Any candidate change requires a new review and acceptance record.
Until that external record exists and is verified, every value below remains
open and this document remains `PROPOSED`.

| Field | Value |
| --- | --- |
| Accountable role | Repository Lead |
| Existing authoritative identity | Hiếu (from `GOVERNANCE.md` and `ONBOARDING.md`) |
| Proposed matrix revision/digest | **UNFILLED** |
| Accountable role/person confirmations | **UNFILLED** |
| Approval decision/reference | **UNFILLED** |
| Accepted version/date | **UNFILLED** |

This table describes the fields required in the external record; it is not a
form to fill in place. No automated process may infer their values or change a
row's acceptance state to accepted.
