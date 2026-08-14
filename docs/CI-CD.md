# CI/CD Architecture

## Mục tiêu

CI trung tâm chứng minh một checkout duy nhất có thể cài đặt, build, kiểm tra
provenance và chạy toàn bộ deterministic gate. CD tạo artifact phát hành có
checksum nhưng không tự publish lên npm khi chưa có registry và policy phát hành.

## Continuous Integration

Workflow `.github/workflows/ci.yml` chạy trên `ubuntu-latest`, `windows-latest`
và `macos-latest` với cùng Node.js 22 và pnpm 11.16.0.

Trình tự bắt buộc:

1. Checkout monorepo.
2. Cài root lockfile.
3. `pnpm run bootstrap` cho bốn package thực thi.
4. `pnpm run doctor` kiểm tra toolchain và CLI build.
5. `pnpm run verify:all` kiểm tra source pins và mọi gate.
6. `pnpm run demo` tái hiện PASS, BLOCK và REVIEW.
7. `git diff --exit-code` đảm bảo build hoặc verifier không làm source bị stale.
8. Upload evidence Core, Guardian và Benchmark.

Gate component được giữ nguyên:

| Component | Gate | CI độc lập |
| --- | --- | --- |
| Core | `pnpm phase1:verify` | 3 hệ điều hành |
| Guardian | `pnpm phase3:verify` | 3 hệ điều hành |
| Benchmark | `pnpm verify` | 3 hệ điều hành |
| Examples | `pnpm verify` | được bổ sung bởi monorepo CI |
| MCP | kiểm tra boundary tài liệu | được bổ sung bởi monorepo CI |

## Continuous Delivery

Workflow `.github/workflows/release.yml` chạy khi push tag `v*` hoặc chạy thủ
công. Workflow luôn verify trước khi đóng gói.

Artifact gồm:

- `@archsync/core` tarball.
- `@archsync/guardian` tarball.
- `SHA256SUMS.txt`.
- `repos.lock.json` ghi nguồn của năm subtree.

Với tag `v*`, workflow tạo GitHub Release và upload các artifact. Với
`workflow_dispatch`, artifact chỉ được lưu trong workflow run để kiểm tra thử.

## Đồng bộ với các repository độc lập

Ba repository Core, Guardian và Benchmark vẫn chạy CI riêng. Monorepo CI không
thay thế chúng; nó bổ sung kiểm tra integration. `repos.lock.json` cùng lịch sử
`git subtree` chứng minh chính xác commit nào đã được nhập. Xem
`docs/REPOSITORY-SYNC.md` để cập nhật source.

