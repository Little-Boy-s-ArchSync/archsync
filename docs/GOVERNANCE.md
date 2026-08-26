# ArchSync Repository and Research Governance

## Trạng thái enforcement

Các repository đang private để bảo vệ quy trình double-blind. GitHub API hiện
không cho organization bật branch protection hoặc ruleset với gói đang dùng.
Nhóm áp dụng các kiểm soát thủ công dưới đây cho đến khi gói hoặc visibility thay
đổi. Không chuyển repository public chỉ để bật protection trước khi venue cho
phép.

## Compensating controls

1. Không push trực tiếp lên `main`.
2. Mọi thay đổi dùng branch và pull request.
3. CI phải pass trên toàn bộ operating-system matrix liên quan.
4. Ít nhất một reviewer không phải tác giả chính phải review.
5. Hiếu thực hiện final merge và kiểm tra evidence/phase gate.
6. RQ, ground truth, metric, architecture contract, security boundary và release
   cần explicit approval.
7. Merge ngoại lệ phải ghi lý do, phạm vi, reviewer, rollback và follow-up task
   trong decision log.

Tài khoản `an1dee3301` được đăng ký làm Delegated Technical Operator và có thể
thực hiện phần kỹ thuật của nhiệm vụ TV1, TV2 và TV3. Quyền này bao gồm code,
test, evidence collection, commit, push, pull request và automation, nhưng không
cho phép tài khoản tự tạo bằng chứng rằng một người khác đã review. Quy tắc tách
operator, accountable person và independent verifier nằm trong
`docs/ACCOUNT-DELEGATION.md`.

CODEOWNERS giúp tự động yêu cầu Hiếu review nhưng không thay thế review thực tế
hoặc enforcement. Trạng thái CI xanh không tự chứng minh research claim đúng.

## Quyền quyết định

- Low risk: tài liệu không thay scope, refactor không đổi behavior, test cleanup.
  Owner và một reviewer có thể đề nghị merge.
- Medium risk: public CLI contract, schema-compatible output, benchmark tooling,
  paper wording liên quan kết quả. Hiếu phải review.
- High risk: Architecture Model semantics, ground truth, RQ/metric, security,
  release, provider data, baseline evolution. Cần Hiếu approve, evidence snapshot
  và rollback trước merge.

## Phase gates

- Phase 1--3: deterministic engine, evidence, benchmark và Git-diff gate phải giữ
  toàn bộ verifier hiện có ở trạng thái pass.
- Phase 4: AI chỉ giải thích/đề xuất; deterministic engine quyết định. Provider
  run cần security sign-off và frozen protocol.
- Phase 5: model/code/IaC conflict phải giữ provenance từng nguồn và Unknown.
- Phase 6: runtime evidence không tự approve high-risk evolution.
- Phase 7: mọi claim phải truy về frozen evidence bundle và independent rerun.

## Rà soát

Hiếu kiểm tra hàng tuần:

- pull request không review hoặc CI fail;
- direct push/force push vào `main`;
- task Done nhưng thiếu evidence;
- thay đổi dataset sau freeze;
- generated output ngoài ignored workspace;
- số paper không khớp claim-evidence matrix;
- secret/PII hoặc private URL trong artifact.

Khi GitHub plan cho phép, bật required pull request, required status checks,
CODEOWNERS review, conversation resolution, signed commits nếu phù hợp và chặn
force push/delete cho `main`. Sau đó cập nhật tài liệu này và decision log.
