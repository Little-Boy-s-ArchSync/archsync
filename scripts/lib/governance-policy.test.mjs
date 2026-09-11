import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [governance, raci, pullRequestTemplate] = await Promise.all([
  readFile(new URL("../../docs/GOVERNANCE.md", import.meta.url), "utf8"),
  readFile(new URL("../../docs/RACI-REVIEWER-MATRIX.md", import.meta.url), "utf8"),
  readFile(new URL("../../.github/PULL_REQUEST_TEMPLATE.md", import.meta.url), "utf8"),
]);

test("active governance keeps GOV-103 source-first and the current runtime gate fail-closed", () => {
  assert.match(governance, /ADR nguồn trong repository độc lập `archsync-core`/);
  assert.match(governance, /không\s+được tạo một policy song song trong umbrella/);
  assert.match(governance, /Policy checkpoint P đã được\s+review, merge tại `archsync-core@cb1fd46df8d2c94d77a518e07fb023ad7b80329e`/);
  assert.match(governance, /nhập vào monorepo bằng source pin cùng commit/);
  assert.match(governance, /Policy vẫn \*\*Proposed\*\*/);
  assert.match(governance, /chuỗi P < E < C/);
  assert.match(governance, /[Cc]ác quy tắc hiện hành trong tài liệu này vẫn\s+là authority/);
  assert.match(governance, /chưa có approval evidence\s+E hoặc closure record C/);
  assert.match(governance, /`gov103_satisfied` phải giữ\s+`null`/);
  assert.match(governance, /E và\s+C được review, merge vào Core theo đúng thứ tự rồi nhập lại vào monorepo/);
});

test("GOV-104 covers every requested decision and keeps unsupported identities open", () => {
  assert.match(raci, /Status: \*\*PROPOSED/);
  for (const decision of [
    "Research question (RQ) or research protocol",
    "Architecture Model schema or semantics",
    "Ground truth, adjudication or freeze",
    "Hard rule, conformance decision or merge severity",
    "Repair proposal or repair execution",
    "High-risk architecture evolution or baseline update",
    "Empirical paper claim or claim-to-evidence link",
    "Product or research release",
  ]) {
    assert.ok(raci.includes(`| ${decision} |`), `missing RACI decision: ${decision}`);
    const row = raci.split("\n").find((line) => line.startsWith(`| ${decision} |`));
    assert.match(row, /\*\*PENDING/);
  }

  assert.match(raci, /\*\*UNASSIGNED\*\*/);
  assert.match(raci, /Approval decision\/reference \| \*\*UNFILLED\*\*/);
  assert.match(raci, /separate append-only\s+record or immutable PR review/);
  assert.match(raci, /No automated process may infer their values/);
  assert.match(raci, /every medium-risk path still requires Repository Lead\s+\(Hiếu\) review/);
});

test("active governance records the enforced host controls without treating them as research approval", () => {
  for (const control of [
    "cả bảy repository",
    "chế độ strict",
    "tối thiểu một approving review",
    "dismiss approval cũ",
    "most recent reviewable push",
    "giải quyết toàn bộ review conversation",
    "protection cho administrator",
    "chặn force push",
    "CODEOWNERS review",
  ]) {
    assert.ok(governance.includes(control), `missing enforced control: ${control}`);
  }

  assert.match(governance, /không chứng minh research claim đúng/);
  assert.doesNotMatch(governance, /Các repository đang private/);
  assert.doesNotMatch(governance, /không cho organization bật branch protection/);
});

test("pull requests collect governance evidence and preserve pending human decisions", () => {
  for (const field of [
    "Risk level: low / medium / high",
    "Accountable role and human identity",
    "Required reviewer roles and independence constraints",
    "Approval reference bound to this exact candidate",
    "Baseline impact and previous/proposed SHA-256",
    "Rollback trigger, procedure, owner role and verification",
  ]) {
    assert.ok(pullRequestTemplate.includes(field), `missing pull-request field: ${field}`);
  }
  assert.match(pullRequestTemplate, /PENDING_HUMAN/);
  assert.match(pullRequestTemplate, /delegated operator, CODEOWNERS approval or green CI has not been recorded/);
});

test("holiday operation cannot infer approval or perform governed merge and release decisions", () => {
  for (const [label, boundary] of [
    ["any-risk autonomous merge", /Không tự merge thay required human ở bất kỳ risk nào/],
    ["high-risk merge", /không merge high-risk change/],
    ["ground-truth change or freeze", /đổi\/freeze\s+ground truth/],
    ["baseline update", /update baseline/],
    ["provider flow", /mở provider data flow/],
    ["paper claim", /nhận paper claim/],
    ["tag", /\btag\b/],
    ["publish", /\bpublish\b/],
    ["release", /\brelease\b/],
  ]) {
    assert.match(governance, boundary, `missing holiday boundary: ${label}`);
  }
  assert.match(governance, /Không được suy diễn approval từ im lặng/);
  assert.match(raci, /Absence does not transfer `A`/);
});
