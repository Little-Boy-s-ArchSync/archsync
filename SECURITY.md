# Security Policy

## Reporting

Không mở public issue chứa secret, token, private source, personal data hoặc chi
tiết có thể khai thác. Báo riêng cho Hiếu qua kênh nội bộ của nhóm, ghi repository,
commit, mức ảnh hưởng, cách tái hiện tối thiểu và biện pháp cô lập đã thực hiện.

Không gửi credential thật. Nếu credential có thể đã lộ, revoke/rotate trước rồi
mới thu thập log đã redact.

## Supported research baseline

Baseline được hỗ trợ là commit `main` mới nhất đã qua CI của monorepo và các
source pins trong `repos.lock.json`. Artifact ngoài manifest hoặc output cục bộ
trong `.archsync/` không phải release được hỗ trợ.

## Research data

- Không commit secret, PII, private telemetry hoặc raw provider credential.
- Không gửi private code/evidence cho model provider trước Phase 4 security gate.
- Artifact công khai phải có license/provenance review và double-blind approval.
- Prompt/tool output không được tự merge, sửa ground truth hoặc cập nhật baseline.

Mọi security finding ảnh hưởng deterministic decision, evidence integrity hoặc
artifact provenance được xem là high risk và phải chặn release cho đến khi có
test hồi quy, review và rollback plan.
