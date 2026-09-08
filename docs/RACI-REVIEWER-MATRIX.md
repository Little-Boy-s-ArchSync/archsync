# RACI and Reviewer Matrix Proposal (GOV-104)

Status: **PROPOSED — responsibility mapping prepared; human acceptance and open
assignments pending**.

This document is the prepared artifact for `GOV-104`. It proposes decision
ownership and reviewer requirements; it is not a record that any person accepted
a role or approved a change. The existing assignments below are copied only from
tracked governance. All other accountable identities and every GOV-104
acceptance field remain **UNASSIGNED** or **UNFILLED**.

## RACI meanings and constraints

- **R — Responsible:** prepares the change and evidence. There may be multiple
  responsible contributors.
- **A — Accountable:** makes the governed decision. There is exactly one
  accountable role for a particular decision.
- **C — Consulted:** reviews before the decision and supplies relevant domain
  evidence.
- **I — Informed:** receives the retained outcome; being informed is not
  approval.

An account that operates TV1, TV2 or TV3 work under
[`ACCOUNT-DELEGATION.md`](ACCOUNT-DELEGATION.md) stays the operator. It does not
inherit three human identities, the Accountable role, or an independent-review
status. `SLR-REV-101` assigns Trần Minh Hoàng only to that named SLR review; it is
not a general reviewer assignment for the decisions below.

The Repository Lead is currently identified as Hiếu in tracked governance.
Tracked documentation names the TV1, TV2 and TV3 functional responsibilities but
does not authoritatively map those roles to human identities. This proposal does
not invent that mapping.

## Decision and reviewer matrix

The current risk level is determined by [`GOVERNANCE.md`](GOVERNANCE.md). The
source `GOV-103` ADR remains a pending dependency and may refine this matrix only
after its independent Core change is reviewed, merged and imported. A
conditional row has one Accountable role only after its actual risk is
classified.

The rows are cumulative with active governance and task-specific Definitions of
Done. In particular, every medium-risk path still requires Repository Lead
(Hiếu) review even when a component owner is the proposed `A`; accepting this
matrix cannot remove or substitute that existing review.

| Decision boundary | Risk | R — preparer | A — decision role | C — required consultation | I | Minimum reviewer boundary | Existing authoritative A identity | Acceptance state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Research question (RQ) or research protocol | High | Research Lead/task owner | Repository Lead | TV2 for AI/provider/human-review effects; TV3 for evaluation/statistics/reproduction; privacy/Security or ethics/data reviewer when applicable | TV1 and affected component owners | Non-author protocol reviewer; statistics/domain review when the protocol requires it | Hiếu (`ONBOARDING.md`) | **PENDING — no GOV-104 acceptance record** |
| Architecture Model schema or semantics | High for semantic/incompatible change; medium only for a proven non-semantic compatible output change | Core/schema owner | Repository Lead for high; component owner for medium | Repository Lead for medium; Guardian owner, benchmark/evaluation owner and release owner | TV1–TV3 | Repository Lead review for medium; non-author schema reviewer plus compatibility and benchmark-impact review | Hiếu for high; **UNASSIGNED** for medium component owner | **PENDING** |
| Ground truth, adjudication or freeze | High | TV3/evaluation owner | Repository Lead | Two blind annotators, adjudicator and statistics/domain reviewer as required by protocol | TV1 and TV2 after freeze | Reviewer independence and leakage checks; no prediction author may silently relabel after seeing output | Hiếu (`GOVERNANCE.md`) | **PENDING** |
| Hard rule, conformance decision or merge severity | High | Core/Guardian owner | Repository Lead | Benchmark/evaluation owner; Security reviewer when a protection boundary changes | TV1–TV3 | Non-author rule reviewer and replay against frozen ground truth with retained failures | Hiếu (architecture approval in `ONBOARDING.md`) | **PENDING** |
| Repair proposal or repair execution | Medium while it remains offline, disposable and `PROPOSED`; high if it can apply, execute outside approved isolation, alter authority or update a baseline | TV2/Guardian repair owner | Component owner for medium; Repository Lead for high | Repository Lead for medium; component/test owner; Security/privacy reviewer for isolation, provider or data effects; architecture owner for model impact | TV1 and TV3 | Repository Lead review for medium; non-author code reviewer; approved isolation evidence for project-test claims; high-risk review when elevated | **UNASSIGNED** for medium; Hiếu only when elevated to high | **PENDING** |
| High-risk architecture evolution or baseline update | High | Proposer and affected component owner | Repository Lead | Architecture/schema, Guardian, benchmark, runtime/IaC, privacy/Security and release roles as affected | TV1–TV3 | Non-author technical review, exact before/after digests, rollback rehearsal and any task-required independent validation | Hiếu (`GOVERNANCE.md`) | **PENDING** |
| Empirical paper claim or claim-to-evidence link | High; editorial wording with no scope/result change may be low | Paper/analysis owner | Repository Lead | Evidence producer, statistics reviewer, benchmark owner, citation reviewer and independent reproducer as applicable | TV1–TV3 | Reviewer must trace numerator, denominator, artifact digest and limitations; producer cannot satisfy required independence | Hiếu (paper responsibility in `ONBOARDING.md`) | **PENDING** |
| Product or research release | High | TV1 release owner | Repository Lead | Security reviewer, affected component owners; P7/research-release owner and independent reproducer for a research release | Entire team | Non-author release review, exact commit/version checks, immutable artifacts, rollback drill and all additional research-release approvals | Hiếu (final merge/Lead approval in tracked governance) | **PENDING** |

The matrix never reduces a task-specific Definition of Done. Where another
policy requires two annotators, an adjudicator, a Security sign-off, a statistician,
an independent reproducer or multiple named approvals, all of them remain
required even though RACI has one `A`.

## Reviewer roster to complete

These functional slots are deliberately not assigned to people by this
proposal. A human governance decision must name the eligible person, confirm
scope and independence, and retain an authorization or acceptance reference.

| Reviewer slot | Needed for | Human identity | Independence/eligibility evidence | Acceptance reference |
| --- | --- | --- | --- | --- |
| Core/schema reviewer | Schema semantics and compatibility | **UNASSIGNED** | **UNFILLED** | **UNFILLED** |
| Guardian/hard-rule reviewer | Analyzer, conformance and merge decision | **UNASSIGNED** | **UNFILLED** | **UNFILLED** |
| Ground-truth/adjudication reviewer | Annotation, leakage and freeze | **UNASSIGNED** | **UNFILLED** | **UNFILLED** |
| Statistics reviewer | Metrics, estimands and empirical claims | **UNASSIGNED** | **UNFILLED** | **UNFILLED** |
| Repair isolation/Security reviewer | Repair execution, provider, privacy and sandbox boundary | **UNASSIGNED** | **UNFILLED** | **UNFILLED** |
| Independent reproducer | Required experimental and research-release checks | **UNASSIGNED** | **UNFILLED** | **UNFILLED** |
| Release reviewer | Candidate, artifact, install and rollback evidence | **UNASSIGNED** | **UNFILLED** | **UNFILLED** |

The pull-request author, delegated operator, CODEOWNER request, CI actor or person
who generated an artifact is not automatically eligible for any slot.

## Decision routing

1. The preparer classifies the change and fills the evidence/rollback fields.
2. If classification is uncertain, route it as high risk and set
   `PENDING_HUMAN`.
3. Resolve the single Accountable role from the matrix. If its human identity is
   `UNASSIGNED`, stop at `READY_FOR_REVIEW`; do not substitute the operator.
4. Obtain every specialist and independence review required by the row and the
   task Definition of Done.
5. The named Accountable human decides on the exact candidate after those
   reviews. Record the identity, decision, UTC time, candidate digest, evidence
   digest and authorization reference.
6. Inform the listed roles only after retaining the decision. A notification or
   lack of objection does not complete step 5.

## Holiday-safe operation

When Hiếu or TV1–TV3 cannot interact, already assigned technical work may
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
