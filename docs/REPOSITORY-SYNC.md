# Repository Synchronization

## Nguyên tắc

Năm repository độc lập tiếp tục là nguồn phát triển theo ranh giới module.
Monorepo nhập các commit đã kiểm chứng bằng `git subtree --squash`. File
`repos.lock.json` là manifest pin nguồn của lần nhập hiện tại.

## Kiểm tra

Kiểm tra manifest với lịch sử local, không cần mạng:

```powershell
pnpm run verify:sync
```

So sánh thêm với branch được pin hiện tại của năm remote:

```powershell
pnpm run verify:remote
```

Nếu remote đã đi trước manifest, lệnh thứ hai phải thất bại thay vì âm thầm coi
monorepo là đồng bộ.

## Cập nhật một subtree

Ví dụ cập nhật Core:

```powershell
git subtree pull `
  --prefix=archsync-core `
  https://github.com/Little-Boy-s-ArchSync/archsync-core.git `
  main `
  --squash
```

Sau đó cập nhật trường `commit` tương ứng trong `repos.lock.json`, chạy:

```powershell
pnpm run bootstrap
pnpm run verify:remote
pnpm run verify:all
pnpm run demo
```

Chỉ commit source pin mới khi tất cả lệnh trên thành công. Nếu thay đổi API giữa
Core, Guardian và Benchmark, cập nhật/publish vendor artifact tại repo nguồn
trước; monorepo không được thay thế các tarball provenance bằng dependency ngầm.
