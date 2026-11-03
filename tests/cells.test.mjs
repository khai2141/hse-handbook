import test from "node:test";
import assert from "node:assert/strict";
import { workerCell } from "../js/cells.js";

const edu = [
  { id: "e2", name: "채용 시 교육", law: ["법 제29조②"], contents: ["a","b","c","d"], fine: [10,20,50], unit: "1명", who: "사업주" },
];
const reg = { id: "reg", name: "상용·상시 근로자", status: "확인", law: ["시행규칙 별표 4"],
  cells: [{ t: "8시간", k: "y" }], rule: ["채용 시 교육 8시간 이상"] };
const day = { id: "day", name: "일용근로자", status: "일부 확인", law: [],
  cells: [{ t: "확인", k: "q" }], rule: [] };

test("confirmed cell shows hours, rule text, contents and per-person fine", () => {
  const d = workerCell(reg, edu, 0);
  assert.equal(d.big, "8시간");
  assert.equal(d.warn, undefined);
  assert.deepEqual(d.fine.perPerson, [10, 20, 50]);
  assert.ok(d.sections.some((s) => s.key === "rule" && s.items[0].includes("8시간")));
  assert.ok(d.sections.some((s) => s.key === "alloc"));
});

test("unverified cell warns and never shows an invented number", () => {
  const d = workerCell(day, edu, 0);
  assert.equal(d.warn, "원문 확인 필요");
  assert.equal(d.big, "확인");
  assert.equal(d.sections.some((s) => s.key === "alloc"), false);
});

test("title joins worker and education names", () => {
  assert.equal(workerCell(reg, edu, 0).title, "상용·상시 근로자 × 채용 시 교육");
});

test("worker with status 미확인 never shows its raw cell value", () => {
  const w = { id: "x", name: "미확인 근로자", status: "미확인", law: [], rule: [],
    cells: [{ t: "8시간", k: "y" }] };
  const d = workerCell(w, edu, 0);
  assert.equal(d.big, "확인");
  assert.equal(d.warn, "원문 확인 필요");
  assert.equal(d.sections.some((s) => s.key === "alloc"), false);
});

test("missing cells or out-of-range column returns fallback without throwing", () => {
  const noCells = { id: "n", name: "무자료", status: "확인", law: [], rule: [] };
  const a = workerCell(noCells, edu, 0);
  assert.equal(a.warn, "원문 확인 필요");
  assert.equal(a.big, "확인");
  assert.deepEqual(a.sections, []);
  assert.equal(a.fine, undefined);
  assert.equal(a.title, "무자료 × 채용 시 교육");

  const b = workerCell(reg, edu, 5);
  assert.equal(b.warn, "원문 확인 필요");
  assert.equal(b.big, "확인");
  assert.deepEqual(b.sections, []);
  assert.equal(b.fine, undefined);
});
