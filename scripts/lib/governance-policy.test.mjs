import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [governance, raci, pullRequestTemplate] = await Promise.all([
  readFile(new URL("../../docs/GOVERNANCE.md", import.meta.url), "utf8"),
  readFile(new URL("../../docs/RACI-REVIEWER-MATRIX.md", import.meta.url), "utf8"),
  readFile(new URL("../../.github/PULL_REQUEST_TEMPLATE.md", import.meta.url), "utf8"),
]);

test("active governance records the completed source-first GOV-103 closure", () => {
  assert.match(governance, /ADR nguồn trong repository độc lập `archsync-core`/);
  assert.match(governance, /[Kk]hông\s+được tạo policy song song trong umbrella/);
  assert.match(governance, /hoàn\s+tất chuỗi bất biến P < E < C/);
  assert.match(governance, /ff7b47f7bf17f3d820941522b13032445e612773/);
  assert.match(governance, /ad8091080fd54ae316113e09b02ab032e77fc1ac/);
  assert.match(governance, /c615d97c0d2bcf021e8f30f6d27b231ef285d80d/);
  assert.match(governance, /archsync-core@f7b145df7c4cc8c03b6b7449c12cfc5438c975db/);
  assert.match(governance, /Lê Văn Kiệt đã review độc lập/);
  assert.match(governance, /Võ Đức Hiếu chấp nhận với vai trò Repository Lead/);
  assert.match(governance, /Core post-merge CI `34594975452` pass/);
  assert.match(governance, /File ADR nguồn vẫn giữ nhãn `Proposed` để bảo toàn bytes tại P/);
  assert.match(governance, /`gov103_satisfied` trong template phải giữ `null`/);
  assert.match(governance, /toàn bộ bảy gate còn lại/);
});

test("GOV-104 covers every requested decision for the three-member core team", () => {
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

  for (const identity of ["Võ Đức Hiếu", "Trần Minh Hoàng", "Lê Văn Kiệt"]) {
    assert.ok(raci.includes(identity), `missing core-team identity: ${identity}`);
  }
  assert.match(raci, /Hà Hoàng Bách is an External Support Consultant/);
  assert.match(raci, /not a core task\s+owner, default approver or mandatory reviewer/);
  assert.doesNotMatch(raci, /\*\*UNASSIGNED\*\*/);
  assert.match(raci, /Approval decision\/reference \| \*\*UNFILLED\*\*/);
  assert.match(raci, /separate append-only\s+record or immutable PR review/);
  assert.match(raci, /No automated process may infer their values/);
  assert.match(raci, /every medium-risk path still requires Repository Lead\s+\(Hiếu\) review/);
  assert.match(raci, /exact producer cannot be the sole independent reviewer/);
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
