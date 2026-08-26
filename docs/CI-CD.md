# CI/CD Architecture

## Mục tiêu

CI trung tâm chứng minh một checkout duy nhất có thể cài đặt, build, kiểm tra
provenance và chạy toàn bộ deterministic gate. CD tạo artifact phát hành có
checksum nhưng không tự publish lên npm khi chưa có registry và policy phát hành.

## Local integration gate

`pnpm run verify:local` là gate mặc định cho thay đổi thường ngày. Gate chạy từ
tracked worktree sạch, thực thi cùng deterministic product checks và tạo bundle
gắn với exact commit. Quy cách bundle và giới hạn của bằng chứng local nằm trong
[`LOCAL-VERIFICATION.md`](LOCAL-VERIFICATION.md).

## Remote continuous integration

Workflow `.github/workflows/ci.yml` chạy trên `ubuntu-latest`, `windows-latest`
và `macos-latest` với cùng Node.js 22 và pnpm 11.16.0.

Workflow này được dùng tại milestone, release hoặc khi cần kiểm tra hành vi đa
nền tảng. Nó không bắt buộc chạy trên mọi commit khi hosted-runner quota bị
giới hạn.

Trình tự bắt buộc:

1. Checkout monorepo.
2. Cài root lockfile.
3. `pnpm run bootstrap` cho bốn package thực thi.
4. `pnpm run doctor` kiểm tra toolchain và CLI build.
5. `pnpm run verify:all` kiểm tra source pins và mọi gate.
6. `pnpm run demo` tái hiện PASS, BLOCK và REVIEW.
7. `git diff --exit-code` đảm bảo build hoặc verifier không làm source bị stale.
8. Upload evidence Core, Guardian và Benchmark.

`verify:all` còn chạy contract tests, policy-document verifier và tracked-secret
scan. Mọi third-party action được pin bằng full commit SHA; artifact evidence có
retention 14 ngày; workflow mặc định chỉ có `contents: read`.

Gate component được giữ nguyên:

| Component | Gate | CI độc lập |
| --- | --- | --- |
| Core | `pnpm phase1:verify` | 3 hệ điều hành |
| Guardian | `pnpm phase3:verify` | 3 hệ điều hành |
| Benchmark | `pnpm verify` | 3 hệ điều hành |
| Examples | `pnpm verify` | được bổ sung bởi monorepo CI |
| MCP | kiểm tra boundary tài liệu | được bổ sung bởi monorepo CI |

## Continuous Delivery

Job `supply-chain` của CI chạy trên Ubuntu để pack exact candidate, audit production
dependencies và diễn tập immutable rollback. Workflow `.github/workflows/release.yml`
chạy khi push tag `v*` hoặc chạy thủ công. Workflow luôn verify trước khi đóng gói.

Artifact gồm:

- `@archsync/core` tarball.
- `@archsync/guardian` tarball.
- `SHA256SUMS.txt`.
- `repos.lock.json` ghi nguồn của năm subtree.
- `RELEASE-MANIFEST.json` với exact file allowlist và source commit.
- `SBOM.cdx.json` CycloneDX 1.5.
- `LICENSES.json` cho production dependency closure.

Build/package dùng `contents: read`. Với tag `v*`, job publish tách biệt mới nhận
`contents: write`, từ chối release đã tồn tại rồi tạo GitHub Release. Không dùng
`--clobber`. Với `workflow_dispatch`, artifact chỉ được lưu 14 ngày trong workflow
run để kiểm tra thử.

Chi tiết gate, SemVer và rollback nằm trong `docs/SUPPLY-CHAIN.md` và
`docs/RELEASE.md`.

## Đồng bộ với các repository độc lập

Ba repository Core, Guardian và Benchmark vẫn chạy CI riêng. Monorepo CI không
thay thế chúng; nó bổ sung kiểm tra integration. `repos.lock.json` cùng lịch sử
`git subtree` chứng minh chính xác commit nào đã được nhập. Xem
`docs/REPOSITORY-SYNC.md` để cập nhật source.
