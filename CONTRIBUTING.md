# Contributing to ArchSync

ArchSync là prototype phục vụ nghiên cứu. Một thay đổi chỉ được coi là hoàn tất
khi code, kiểm thử, evidence và diễn giải research vẫn nhất quán.

## Trước khi nhận task

1. Hoàn tất `docs/ONBOARDING.md`.
2. Chạy `pnpm run onboard:verify` từ clean checkout.
3. Đọc `docs/GOVERNANCE.md`, repository boundary và task được giao trên Google
   Sheet.
4. Xác nhận owner, dependency, output bắt buộc và Definition of Done.

## Branch và pull request

- Không push trực tiếp lên `main`.
- Tạo branch theo dạng `<loai>/<ma-task>-<mo-ta>`, ví dụ
  `feat/P4-102-explanation-contract`.
- Một branch chỉ giải quyết một task hoặc một thay đổi có dependency chặt chẽ.
- Rebase hoặc merge `origin/main` trước khi yêu cầu review.
- Mọi thay đổi phải đi qua pull request và CI. Hiếu thực hiện merge cuối.
- Không gộp khi còn test fail, artifact chưa kiểm chứng, review unresolved hoặc
  evidence/paper không khớp.

GitHub hiện không cưỡng chế branch protection cho private repository theo gói
đang dùng. Quy tắc trên là compensating control bắt buộc của nhóm, không phải
khuyến nghị tùy chọn.

## Evidence trước trạng thái Done

Pull request phải ghi:

- task code và phase;
- behavior hoặc research claim bị ảnh hưởng;
- lệnh kiểm chứng và output tóm tắt;
- commit/package/data version;
- evidence artifact hoặc report path;
- hạn chế, failure hoặc dữ liệu chưa biết;
- paper impact: none, update required, hoặc future work only.

Không dùng mock result, số tự nhập, screenshot không có provenance hoặc một lần
chạy không lưu cấu hình làm research evidence. Generated output cục bộ phải ở
workspace bị ignore; chỉ chuyển vào evidence bundle khi có manifest, checksum,
generation command và verifier.

## Phạm vi repository

- `archsync-core`: schema, Architecture Model, graph và deterministic rules.
- `archsync-guardian`: source analyzer, Finding Contract, Git-diff gate và CLI.
- `archsync-benchmark`: ground truth, datasets, evaluation và evidence manifests.
- `archsync-examples`: models và generated views tái sinh được.
- `archsync-mcp`: thin local adapter dùng exact package Core/Guardian; không sao
  chép logic và không mở provider hoặc quyền human approval mặc định.

Thay đổi cross-repository phải cập nhật repository nguồn trước, chạy gate riêng,
merge, rồi import commit đã kiểm chứng vào monorepo bằng quy trình trong
`docs/REPOSITORY-SYNC.md`.

## Research integrity

- Phase 1--3 là empirical scope hiện tại. Phase 4--6 chưa có kết quả.
- Không sửa ground truth holdout sau khi xem prediction.
- Không thay deterministic decision bằng LLM output.
- Không tự động cập nhật Architecture Model hoặc approve high-risk evolution.
- Không đưa secret, PII hoặc private source ra external provider.
- Mọi số liệu đưa vào paper phải truy được đến claim-evidence matrix và artifact
  đã verify của `archsync-paper`.

## Review

Reviewer phải kiểm tra behavior, tests, evidence, boundary và paper impact. Với
RQ, metric, ground truth, architecture contract, security boundary hoặc release,
Hiếu phải approve trước merge. Reviewer không được chỉ nhìn trạng thái CI mà bỏ
qua nội dung artifact.
