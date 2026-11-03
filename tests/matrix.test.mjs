import test from "node:test";
import assert from "node:assert/strict";
import { buildMatrix, filterRows, renderMatrix } from "../js/matrix.js";
import { loadData } from "./load.mjs";
const data = loadData();
const bodyRows = (m) => m.rows.filter((r) => !r.g);
const groups = (m) => m.rows.filter((r) => r.g);

test("W has 18 worker rows, 5 group rows, 5 cells each", () => {
  const m = buildMatrix("W", data);
  assert.equal(bodyRows(m).length, 18);
  assert.equal(groups(m).length, 5);
  assert.equal(m.cols.length, 5);
  assert.ok(bodyRows(m).every((r) => r.cells.length === 5));
});
test("H has the same shape as W", () => {
  const m = buildMatrix("H", data);
  assert.equal(bodyRows(m).length, 18);
  assert.equal(groups(m).length, 5);
  assert.ok(bodyRows(m).every((r) => r.cells.length === 5));
  const off = bodyRows(m).find((r) => r.id === "off");
  assert.equal(off.cells[0].t, "2년 1회");
});
test("F rows equal foreign record count", () => {
  const m = buildMatrix("F", data);
  assert.equal(bodyRows(m).length, data.foreign.length);
  assert.ok(bodyRows(m).every((r) => r.cells.length === 3));
});
test("T 18, M 8, R 8 with 9 cells, V 8", () => {
  assert.equal(bodyRows(buildMatrix("T", data)).length, 18);
  assert.equal(bodyRows(buildMatrix("M", data)).length, 8);
  const r = buildMatrix("R", data);
  assert.equal(bodyRows(r).length, 8);
  assert.ok(bodyRows(r).every((x) => x.cells.length === 9));
  const v = buildMatrix("V", data);
  assert.equal(bodyRows(v).length, 8);
  assert.deepEqual(bodyRows(v)[0].cells.map((c) => c.t), ["보기", "보기"]);
});
test("P has one row per penalty record, sorted by max desc with 만원 formatting", () => {
  const m = buildMatrix("P", data);
  const rows = bodyRows(m);
  assert.equal(rows.length, data.penalties.length);
  const max = new Map(data.penalties.map((p) => [p.id, p.max]));
  for (let i = 1; i < rows.length; i++) assert.ok(max.get(rows[i - 1].id) >= max.get(rows[i].id));
  assert.ok(rows.some((r) => r.cells[1].t === "1,000만원"));
});
test("filterRows keeps matches and drops empty groups", () => {
  const m = buildMatrix("W", data);
  const f = filterRows(m.rows, "일용");
  const names = f.filter((r) => !r.g).map((r) => r.n);
  assert.ok(names.includes("일용근로자"));
  assert.equal(f.filter((r) => r.g).length, new Set(f.filter((r) => !r.g).map((r) => data.workers.find((w) => w.id === r.id).group)).size);
  const cho = filterRows(m.rows, "ㅇㅇㄱㄹㅈ").filter((r) => !r.g).map((r) => r.n);
  assert.ok(cho.includes("일용근로자"));
});
test('queries with "(" or "[" never throw and match literally', () => {
  const m = buildMatrix("W", data);
  const par = filterRows(m.rows, "(").filter((r) => !r.g);
  assert.ok(par.length > 0 && par.every((r) => (r.n + r.s).includes("(")));
  assert.deepEqual(filterRows(m.rows, "["), []);
  assert.deepEqual(filterRows(m.rows, "(("), []);
  assert.doesNotThrow(() => renderMatrix("W", data, "("));
});
test("renderMatrix emits cell buttons, info buttons for W/H/F/M/R only, and escapes", () => {
  const html = renderMatrix("W", data, "");
  assert.equal((html.match(/data-cell="W\|/g) || []).length, 90);
  assert.ok(html.includes('data-cell="W|reg|0"'));
  assert.equal((html.match(/data-info="W\|/g) || []).length, 18);
  assert.ok(!/onclick/i.test(html));
  assert.equal(renderMatrix("P", data, "").includes("data-info"), false);
  assert.equal(renderMatrix("T", data, "").includes("data-info"), false);
  assert.equal(renderMatrix("V", data, "").includes("data-info"), false);
  const hostile = { ...data, workers: data.workers.map((w, i) => (i ? w : { ...w, n: "<img src=x onerror=1>" })) };
  const h = renderMatrix("W", hostile, "");
  assert.ok(!h.includes("<img src=x"));
  assert.ok(h.includes("&lt;img src=x"));
});
test("empty result shows the empty message", () => {
  assert.ok(renderMatrix("W", data, "zzzzzz").includes("검색 결과가 없습니다"));
});

test("미확인 rows in T, M, R, P show 확인/q with no digits", () => {
  const f = (a) => a.map((x) => ({ ...x, status: "미확인" }));
  const d = { ...data, tasks: f(data.tasks), roles: f(data.roles), penalties: f(data.penalties) };
  for (const k of ["T", "M", "R", "P"]) {
    const rows = buildMatrix(k, d).rows.filter((r) => !r.g);
    assert.ok(rows.length > 0);
    for (const r of rows) for (const cl of r.cells) {
      assert.deepEqual(cl, { t: "확인", k: "q" });
    }
  }
});
