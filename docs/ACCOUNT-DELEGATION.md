# Delegated Cross-Role GitHub Operations

## Registered operator

The GitHub login `an1dee3301` is an authorized Delegated Technical Operator for
tasks assigned to TV1, TV2, and TV3. The operator may perform the technical
workflow for any of those roles, including creating branches, implementing
code or documentation, running local verification, collecting real source
output, producing evidence artifacts, committing, pushing, opening or updating
pull requests, and invoking approved automation.

This authorization exists so that repository access and Git metadata do not
artificially prevent cross-role implementation. It does not turn one GitHub
login into evidence that three different people performed a review.

## Required attribution

For governed work, the pull request or evidence record must distinguish:

- `operator_login`: the account that performed the repository or tool action;
- `accountable_role`: the functional role responsible for the task;
- `accountable_person`: the person who checked and accepted the result;
- `authorization_reference`: the retained task, comment, review, or signed
  attestation authorizing the operation; and
- `independent_verifier`: the different eligible person when the Definition of
  Done requires independent review.

Git author, committer, pull-request author, or automation metadata proves which
account performed an action. It does not by itself prove the identity of the
accountable reviewer or satisfy an independence requirement.

## Independent review boundary

`SLR-REV-101` is formally assigned to Tran Minh Hoang. `an1dee3301` may prepare
and operate the complete technical workflow, and Ha Hoang Bach approval is not
required for this task. The signed record must name Hoang, bind his ORCID and
operator login, and affirm that he is not an author of the protocol being
reviewed. If that non-author condition is false, another eligible reviewer must
be assigned before the task can satisfy its Definition of Done.

Real evidence, reviewer independence, key ownership, and final approval remain
subject to the task Definition of Done and research evidence policy.
