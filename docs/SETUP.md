# Setup and Installation

## 1. Yêu cầu

- Windows, macOS hoặc Linux.
- Git.
- Node.js 22 trở lên; phiên bản đã kiểm chứng là 22.16.0.
- pnpm 11.16.0 qua Corepack.

Kiểm tra:

```text
node --version
pnpm --version
git --version
```

## 2. Clone và bootstrap

```powershell
git clone https://github.com/Little-Boy-s-ArchSync/archsync.git
cd archsync
corepack enable
pnpm install --frozen-lockfile
pnpm run bootstrap
```

`bootstrap` cài từng lockfile độc lập theo thứ tự Core, Guardian, Benchmark, MCP
và Examples, sau đó build Core và Guardian. MCP dùng exact package tarball đã pin
và giữ provider cùng quyền human approval ở trạng thái mặc định bị đóng.

## 3. Kiểm tra máy và source

```powershell
pnpm run doctor
pnpm run verify:sync
pnpm run verify:all
```

Không dùng `pnpm doctor`; đó là lệnh của pnpm. ArchSync Doctor được gọi bằng
`pnpm run doctor` trước khi cài global hoặc `archsync doctor` sau khi cài global.

## 4. Chạy demo

```powershell
pnpm run demo
```

Demo áp dụng ba Git patch thật và phải trả về đúng ba quyết định:

```text
case-01  PASS
case-06  BLOCK
case-09  REVIEW
```

Mỗi case phải báo `MATCH`, cold cache `MISS`, warm cache `HIT` và toàn bộ demo
phải kết thúc bằng `3/3 scenarios matched ground truth`.

## 5. Cài CLI global

Chạy một lần:

```powershell
pnpm setup
```

Đóng terminal, mở lại, vào thư mục monorepo rồi chạy:

```powershell
pnpm run cli:install
Get-Command archsync
archsync version
archsync doctor
```

Trên macOS/Linux dùng `command -v archsync` thay cho `Get-Command archsync`.

Sau đó có thể demo từ root:

```powershell
archsync demo --benchmark archsync-benchmark/order-platform --scenario all
```

## 6. Xử lý lỗi thường gặp

### PowerShell không vào được đường dẫn

Đường dẫn có khoảng trắng phải đặt trong dấu nháy kép:

```powershell
cd "D:\Little Boys\ArchSync\archsync"
```

### `archsync` không được nhận diện

`pnpm run demo` chạy được không có nghĩa CLI global đã được cài. Chạy `pnpm setup`,
mở terminal mới, rồi chạy `pnpm run cli:install`.

### `pnpm doctor` hiện cảnh báo global bin

Đây là pnpm Doctor. Dùng `pnpm run doctor` để chạy ArchSync Monorepo Doctor.
