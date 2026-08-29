# ArchSync Repository and Research Governance

## Trạng thái enforcement

Trạng thái remote được kiểm tra ngày 2026-08-30: branch `main` đang được bảo vệ
trên cả bảy repository `archsync`, `archsync-core`, `archsync-guardian`,
`archsync-benchmark`, `archsync-mcp`, `archsync-examples` và `archsync-paper`.
Visibility của repository không được dùng làm bằng chứng cho hoặc chống lại các
kiểm soát này.

Mỗi repository hiện cưỡng chế:

- pull request trước khi merge;
- các CI status context hiện được cấu hình ở chế độ strict, nên branch phải cập
  nhật với base trước khi merge;
- tối thiểu một approving review;
- dismiss approval cũ khi có commit mới;
- approval cho most recent reviewable push từ người khác người push;
- giải quyết toàn bộ review conversation;
- áp dụng protection cho administrator;
- chặn force push và chặn xóa branch `main`.

Ngoài ra, `archsync`, `archsync-benchmark` và `archsync-paper` yêu cầu
CODEOWNERS review. Mọi thay đổi remote setting sau ngày kiểm tra phải được audit
lại; tài liệu này không suy diễn trạng thái tương lai từ visibility, plan hoặc
trạng thái CI của một commit.

Branch protection, CODEOWNERS và CI chứng minh một phần quy trình repository.
Chúng không chứng minh research claim đúng, không thay chữ ký/approval nghiệp vụ,
không xác nhận reviewer độc lập và không cho phép automation quyết định thay
người chịu trách nhiệm.

## Repository controls

1. Không push trực tiếp lên `main`; mọi thay đổi dùng branch và pull request.
2. CI phải pass trên toàn bộ operating-system matrix hoặc verification provider
   được task cho phép.
3. Ít nhất một reviewer không phải tác giả chính phải review nội dung thay đổi,
   evidence, rollback và paper impact.
4. Hiếu thực hiện final merge và kiểm tra evidence/phase gate.
5. RQ, protocol, ground truth, metric, architecture contract, security boundary,
   baseline, paper claim và release cần explicit approval theo risk.
6. Merge ngoại lệ, nếu một policy riêng cho phép, phải ghi lý do, phạm vi,
   reviewer, rollback và follow-up task trong decision log; không ngoại lệ nào
   được bỏ qua required host protection hoặc high-risk human gate.
7. Một green status, CODEOWNERS approval hoặc quyền merge không được tái sử dụng
   như research approval nếu record không bind đúng người, vai trò, candidate và
   evidence.

Tài khoản `an1dee3301` được đăng ký làm Delegated Technical Operator và có thể
thực hiện phần kỹ thuật của nhiệm vụ TV1, TV2 và TV3. Quyền này bao gồm code,
test, evidence collection, commit, push, pull request và automation, nhưng không
cho phép tài khoản tự tạo bằng chứng rằng một người khác đã review. Quy tắc tách
operator, accountable person và independent verifier nằm trong
[`ACCOUNT-DELEGATION.md`](ACCOUNT-DELEGATION.md).

## Quyền quyết định

- Low risk: tài liệu không thay scope, refactor không đổi behavior, test cleanup.
  Owner và một reviewer có thể đề nghị merge.
- Medium risk: public CLI contract, schema-compatible output, benchmark tooling,
  paper wording liên quan kết quả. Hiếu phải review.
- High risk: Architecture Model semantics, ground truth, RQ/metric, security,
  release, provider data, baseline evolution. Cần Hiếu approve, evidence snapshot
  và rollback trước merge.

`GOV-103` yêu cầu một ADR nguồn trong repository độc lập `archsync-core`, approval
matrix và human acceptance bind đúng candidate. ADR đó chưa được merge/import;
không được tạo một policy song song trong umbrella để vượt quy trình source-first
của [`REPOSITORY-SYNC.md`](REPOSITORY-SYNC.md). Cho tới khi source PR được review,
merge và subtree pin được cập nhật, các quy tắc hiện hành trong tài liệu này vẫn
là authority. RACI/reviewer mapping được chuẩn bị trong
[`RACI-REVIEWER-MATRIX.md`](RACI-REVIEWER-MATRIX.md) và chưa được coi là accepted
`GOV-104`.

## Holiday-safe autonomous preparation

Khi Hiếu hoặc TV1–TV3 không thể tương tác, technical work đã có scope có thể
tiếp tục ở các phần không cần human decision: đọc/audit, draft, implementation,
deterministic test, synthetic fixture check, evidence collection và chuẩn bị
review packet. Trạng thái tối đa mà automation/operator có thể tự ghi là
`DRAFT`, `READY_FOR_REVIEW` hoặc `PENDING_HUMAN`.

Không được suy diễn approval từ im lặng, thời gian nghỉ, access của operator,
green CI hoặc một reviewer chưa đúng vai trò. Nếu thiếu accountable identity,
reviewer độc lập, evidence thật, chữ ký hoặc decision record, giữ nguyên baseline
và gate. Không tự merge thay required human ở bất kỳ risk nào trong thời gian
người đó không sẵn sàng. Đặc biệt, không merge high-risk change, đổi/freeze
ground truth, update baseline, mở provider data flow, nhận paper claim, tag,
publish hoặc release.

Review packet để xử lý sau kỳ nghỉ phải có exact revision, risk/rationale,
commands và exit codes, evidence hashes, known limitations, rollback và danh sách
human decision còn thiếu. Việc chuẩn bị packet không đổi task sang Done.

## Phase gates

- Phase 1--3: deterministic engine, evidence, benchmark và Git-diff gate phải giữ
  toàn bộ verifier hiện có ở trạng thái pass.
- Phase 4: AI chỉ giải thích/đề xuất; deterministic engine quyết định. Provider
  run cần security sign-off và frozen protocol.
- Phase 5: model/code/IaC conflict phải giữ provenance từng nguồn và Unknown.
- Phase 6: runtime evidence không tự approve high-risk evolution. Gate hiện tại
  trên source pin chỉ kiểm tra cờ completion và digest, chưa đủ xác minh một
  human acceptance record của `GOV-103`; vì vậy `gov103_satisfied` phải giữ
  `null` và Phase 6 giữ `PREPARATORY` cho tới khi source contract mạnh hơn được
  review, merge và import.
- Phase 7: mọi claim phải truy về frozen evidence bundle và independent rerun.

## Rà soát

Hiếu kiểm tra hàng tuần hoặc ngay khi trở lại sau một khoảng nghỉ:

- branch-protection settings của cả bảy repository vẫn khớp trạng thái đã ghi;
- pull request không review, CI fail hoặc review bị invalidated bởi push mới;
- direct push/force push/delete attempt vào `main`;
- task Done nhưng thiếu evidence hoặc human acceptance;
- thay đổi dataset/ground truth sau freeze;
- generated output ngoài ignored workspace;
- số paper không khớp claim-evidence matrix;
- secret/PII hoặc private URL trong artifact; và
- role `UNASSIGNED`, approval `UNFILLED` hoặc pending decision bị coi nhầm là đã
  hoàn tất.

Nếu remote settings thay đổi, lưu evidence có repository, branch, UTC time và
người kiểm tra; khôi phục required pull request, strict status checks, approval,
last-push approval, stale-review dismissal, conversation resolution, admin
enforcement, force-push/delete blocks và CODEOWNERS requirement nơi áp dụng.
Không hạ research/human gate để bù cho thiếu host enforcement.
