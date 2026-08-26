# ArchSync Monorepo

Repository điều phối tập trung cho ArchSync, một prototype phát hiện architecture
drift từ source code với evidence có thể kiểm chứng.

Monorepo nhập năm repository sản phẩm bằng `git subtree`. Mỗi thư mục vẫn giữ
ranh giới, lockfile và gate riêng; repository này bổ sung một điểm cài đặt, demo,
CI và release duy nhất. Paper được giữ ở repository `archsync-paper` và không nằm
trong source monorepo.

## Cấu trúc

| Thư mục | Vai trò | Gate chính |
| --- | --- | --- |
| `archsync-core` | Architecture Model, graph và conformance rules | `phase1:verify` |
| `archsync-guardian` | Source analyzer, finding contract và Git-diff gate | `phase3:verify` |
| `archsync-benchmark` | 20 patch, 40 detector signals và evidence | `verify` |
| `archsync-examples` | Model và sơ đồ mẫu có thể tái sinh | `verify` |
| `archsync-mcp` | Phạm vi MCP ở giai đoạn sau | kiểm tra cấu trúc tài liệu |

## Bắt đầu nhanh

Yêu cầu: Git, Node.js 22 trở lên và pnpm 11.16.0.

```powershell
git clone https://github.com/Little-Boy-s-ArchSync/archsync.git
cd archsync

corepack enable
pnpm install --frozen-lockfile
pnpm run bootstrap
pnpm run doctor
pnpm run verify:all
pnpm run demo
```

Phải dùng `pnpm run doctor`. `pnpm doctor` là lệnh chẩn đoán của package manager,
không phải ArchSync Doctor.

Trước khi nhận task đầu tiên, mỗi thành viên phải hoàn tất
[`docs/ONBOARDING.md`](docs/ONBOARDING.md) và chạy:

```powershell
pnpm run onboard:verify
```

Quy trình branch, pull request, evidence và phương án kiểm soát thủ công khi
GitHub chưa hỗ trợ branch protection được định nghĩa trong
[`CONTRIBUTING.md`](CONTRIBUTING.md) và [`docs/GOVERNANCE.md`](docs/GOVERNANCE.md).

## Cài CLI `archsync`

```powershell
pnpm setup
```

Mở terminal mới, quay lại repository rồi chạy:

```powershell
pnpm run cli:install
archsync version
archsync doctor
archsync demo --benchmark archsync-benchmark/order-platform --scenario all
```

Các lệnh `pnpm install`, `pnpm build` và `pnpm test` vẫn là lệnh quản lý source.
Các lệnh `archsync doctor`, `archsync demo`, `archsync model`, `archsync scan` và
`archsync check` là giao diện sản phẩm.

## Đồng bộ và CI/CD

- `repos.lock.json` ghi commit nguồn của cả năm repository độc lập.
- `pnpm run verify:sync` kiểm tra manifest khớp với lịch sử subtree.
- `pnpm run verify:remote` kiểm tra commit đã nhập còn khớp `origin/main` của từng repo.
- CI trung tâm chạy đầy đủ Core, Guardian, Benchmark và Examples trên Windows,
  Ubuntu và macOS.
- Tag `v*` tạo GitHub Release bất biến chứa tarball Core/Guardian, provenance,
  CycloneDX SBOM, license inventory và SHA-256 checksums sau supply-chain gate.

Xem [hướng dẫn cài đặt](docs/SETUP.md), [thiết kế CI/CD](docs/CI-CD.md) và
[quy trình đồng bộ repository](docs/REPOSITORY-SYNC.md). Contract vận hành nằm
trong [release/rollback policy](docs/RELEASE.md), [supply-chain gate](docs/SUPPLY-CHAIN.md),
[support matrix](docs/SUPPORT-MATRIX.md), [upgrade guide](docs/UPGRADE.md) và
[privacy contract](docs/PRIVACY.md).

## Các lệnh ở root

```text
pnpm run bootstrap      Cài dependency và build Core/Guardian
pnpm run doctor         Kiểm tra môi trường và cấu trúc monorepo
pnpm run verify:sync    Kiểm tra source pins trong lịch sử local
pnpm run verify:remote  So sánh source pins với remote main
pnpm run verify         Chạy tất cả gate của các component
pnpm run verify:all     Kiểm tra policy/security/sync rồi chạy toàn bộ gate
pnpm run onboard:verify Chạy doctor, toàn bộ gate và demo Day 0
pnpm run demo           Chạy PASS, BLOCK và REVIEW bằng CLI thật
pnpm run cli:install    Cài lệnh archsync global
pnpm run security:audit Audit production dependency và chặn high/critical
pnpm run release:pack   Đóng gói exact bundle kèm SBOM/license/checksum
pnpm run release:verify Kiểm tra lại bundle không ghi file
pnpm run release:rollback-drill Kiểm tra rollback không overwrite artifact
```
