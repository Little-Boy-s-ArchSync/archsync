# ArchSync Team Onboarding

Tài liệu này là Day 0 gate trước khi thành viên nhận task chính thức.

## 1. Truy cập và công cụ

Thành viên cần:

- quyền truy cập organization `Little-Boy-s-ArchSync` và các repository cần cho
  task được giao;
- Git;
- Node.js 22 trở lên;
- Corepack và pnpm 11.16.0;
- tài khoản GitHub bật xác thực hai lớp;
- quyền đọc Google Sheet phân công và `archsync-paper`.

Không chia sẻ token trong chat, issue, log, screenshot hoặc evidence artifact.

## 2. Clone nguồn điều phối

Clone repository `archsync`; không cần clone năm repository riêng cho lần chạy
đầu tiên:

```powershell
git clone https://github.com/Little-Boy-s-ArchSync/archsync.git
cd archsync
corepack enable
pnpm install --frozen-lockfile
pnpm run bootstrap
```

Nếu đường dẫn Windows có khoảng trắng, luôn đặt đường dẫn trong dấu nháy kép.

## 3. Day 0 verification

```powershell
pnpm run onboard:verify
```

Lệnh này phải hoàn thành cả ba phần:

1. Doctor xác nhận Node, pnpm, Git và ranh giới repository.
2. `verify:all` chạy Core, Guardian, Benchmark, MCP, Examples và kiểm tra source pins.
3. Demo trả về PASS, BLOCK, REVIEW và `3/3 scenarios matched ground truth`.

Nếu thất bại, lưu nguyên command, exit code và output liên quan vào task onboarding;
không đánh dấu môi trường đã sẵn sàng.

## 4. Cài CLI trực tiếp

Chạy một lần:

```powershell
pnpm setup
```

Đóng PowerShell, mở terminal mới, quay lại repository rồi chạy:

```powershell
pnpm run cli:install
Get-Command archsync
archsync version
archsync doctor
```

`archsync` là product interface. `pnpm install`, `pnpm build` và `pnpm test` vẫn
là source-development commands. Nếu global PATH chưa hoạt động, thành viên vẫn
có thể dùng `pnpm run doctor` và `pnpm run demo`, nhưng phải ghi lỗi vào task của
Thành viên 1 thay vì tự sửa package hoặc PATH không có review.

## 5. Nhận task

Mỗi thành viên mở tab của mình trong Google Sheet và xác nhận:

- mã task;
- phase và thứ tự thực hiện;
- dependency đã hoàn thành;
- output bắt buộc;
- Definition of Done;
- repository và evidence location;
- reviewer dự kiến.

Không bắt đầu task đang bị dependency chặn. Không thay đổi RQ, ground truth,
metric hoặc phase gate chỉ để làm test hiện tại pass.

## 6. Pull request đầu tiên

```powershell
git switch -c docs/ONBOARD-<so-thanh-vien>-smoke
```

Tạo một thay đổi tài liệu nhỏ, mở pull request và đi hết quy trình:

- dùng PR template;
- CI pass;
- một người khác review;
- Hiếu merge;
- branch được xóa sau merge.

Mục đích là kiểm tra quyền, review và communication flow trước khi làm thay đổi
kỹ thuật có rủi ro.

## 7. Phân công chính

- Hiếu: research scope, RQ/protocol, architecture approval, paper và final merge.
- Thành viên 1: CLI/release, reproducibility environment, security và MCP sau P4.
- Thành viên 2: AI contracts, citation/safety, provider evaluation và human review.
- Thành viên 3: holdout/evaluation, statistics, IaC/runtime và reproduction.

Đây là phân công trách nhiệm, không phải giới hạn tài khoản thao tác. GitHub
login `an1dee3301` có thể triển khai phần kỹ thuật của cả ba vai trò theo
`docs/ACCOUNT-DELEGATION.md`; evidence vẫn phải ghi đúng người kiểm tra và người
chịu trách nhiệm.

Ngoại lệ phân công hiện tại: `SLR-REV-101` thuộc Trần Minh Hoàng; nhiệm vụ này
không cần Hà Hoàng Bách approve. Hoàng chỉ được ký với tư cách Independent SLR
Reviewer khi Hoàng không phải tác giả của protocol được review.

`archsync-mcp` có local adapter dựa trên exact package Core/Guardian nhưng vẫn là
technical foundation chưa được chấp thuận: provider và quyền phê duyệt của con
người mặc định bị đóng. Paper chỉ báo cáo Phase 1--3; Code--IaC--Runtime--AI chưa
được viết như kết quả.

## 8. Điều kiện hoàn tất onboarding

Onboarding chỉ Done khi có evidence:

- clean checkout;
- `pnpm run onboard:verify` exit 0;
- `Get-Command archsync` và `archsync doctor` pass, hoặc một issue/task CLI đã ghi
  rõ fallback và owner xử lý;
- đọc và đồng ý `CONTRIBUTING.md` cùng `docs/GOVERNANCE.md`;
- truy cập được task tracker và paper;
- hoàn tất pull request đầu tiên qua review.
