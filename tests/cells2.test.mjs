import test from "node:test";
import assert from "node:assert/strict";
import { healthCell, foreignCell, taskCell, managerCell, roleCell, penaltyCell, envCell, cellDetail, infoDetail } from "../js/cells.js";
import { loadData } from "./load.mjs";
import { articleIdsFromLaw } from "../js/versions.js";
const data = loadData();
const WARN = "원문 확인 필요";
const noNumber = (d) => assert.equal(d.fine?.perPerson, undefined);

test("healthCell: unverified cell warns, verified shows value", () => {
  const h1 = data.health[0];
  const q = healthCell({ id: "pt", name: "단시간근로자", status: "일부 확인" }, h1, 0);
  assert.equal(q.warn, WARN);
  assert.equal(q.big, "확인");
  const ok = healthCell(data.workers.find((w) => w.id === "reg"), h1, 0);
  assert.equal(ok.big, "1년 1회");
  assert.equal(ok.warn, undefined);
  const u = healthCell({ id: "reg", name: "x", status: "미확인" }, h1, 0);
  assert.equal(u.warn, WARN);
  assert.equal(u.big, "확인");
});

test("healthCell: by_hazard adds a hazard section with 1st and 2nd items", () => {
  const h2 = data.health.find((h) => h.id === "h2");
  const d = healthCell(data.workers.find((w) => w.id === "reg"), h2, 1);
  const s = d.sections.find((x) => x.key === "hazard");
  assert.ok(s);
  assert.deepEqual(s.table.head, ["유해인자", "제1차 검사항목", "제2차 검사항목"]);
  assert.equal(s.table.rows.length, h2.by_hazard.length);
  assert.ok(s.table.rows.length >= 5);
  const first = h2.by_hazard[0];
  assert.deepEqual(s.table.rows[0], [first.hazard, first.items_1st.join(" / "), first.items_2nd.join(" / ")]);
  const plain = healthCell(data.workers.find((w) => w.id === "reg"), data.health[0], 0);
  assert.equal(plain.sections.find((x) => x.key === "hazard"), undefined);
});

test("foreignCell: 미확인 visa never shows numbers from the education text", () => {
  const f = data.foreign.find((x) => x.status === "미확인");
  for (const col of [0, 1, 2]) {
    const d = foreignCell(f, col, data.meta.foreign_edu);
    assert.equal(d.warn, WARN);
    assert.equal(d.big, "확인");
    assert.ok(!JSON.stringify(d.sections).match(/\d+시간|\d억원/));
  }
  const e9 = foreignCell(data.foreign[0], 0, data.meta.foreign_edu);
  assert.equal(e9.big, "확인");
  assert.equal(e9.warn, WARN);
  const h2 = foreignCell(data.foreign.find((x) => x.n.startsWith("H-2")), 0, data.meta.foreign_edu);
  assert.equal(h2.big, "건설업(41~42) 활동범위에 포함");
  assert.equal(h2.warn, undefined);
});

test("foreignCell: every 미확인 foreign visa warns in all columns and shows no digits", () => {
  const list = data.foreign.filter((x) => x.status === "미확인");
  assert.ok(list.length >= 1);
  for (const f of list) {
    for (const col of [0, 1, 2]) {
      const d = foreignCell(f, col, data.meta.foreign_edu);
      assert.equal(d.warn, WARN);
      assert.equal(d.big, "확인");
      assert.ok(!/\d/.test(JSON.stringify(d.sections)), `${f.id} col ${col}`);
    }
  }
});

test("taskCell: unverified task has warn and no fine; verified has hours and fine", () => {
  const u = taskCell({ id: "15", name: "x", status: "미확인" }, 2);
  assert.equal(u.warn, WARN);
  assert.equal(u.big, "확인");
  noNumber(u);
  const t39 = taskCell(data.tasks.find((t) => t.id === "39"), 0);
  assert.equal(t39.big, "8시간");
  assert.deepEqual(taskCell(data.tasks[0], 2).fine.perPerson, [50, 100, 150]);
});

test("managerCell and roleCell: unverified neutralized", () => {
  const u = { id: "mgr", n: "책임자", status: "미확인", m: ["y"], list: ["a"], edu: "6시간", fine: "500만원", apt: "20억", law: "법" };
  const m = managerCell(u, 0, data.meta.manager_grid);
  assert.equal(m.warn, WARN);
  assert.equal(m.big, "확인");
  assert.ok(!JSON.stringify(m.sections).match(/\d/));
  const r = roleCell(u, 0, data.meta.duties, data.meta.role_tags);
  assert.equal(r.warn, WARN);
  assert.equal(r.big, "확인");
  assert.ok(!JSON.stringify(r.sections).match(/\d/));
  const doc = data.roles.find((x) => x.id === "doc");
  assert.equal(managerCell(doc, 0, data.meta.manager_grid).warn, WARN);
  const mgr = data.roles.find((x) => x.id === "mgr");
  assert.equal(managerCell(mgr, 0, data.meta.manager_grid).big, "신규 6h·보수 6h");
  const rc = roleCell(mgr, 0, data.meta.duties, data.meta.role_tags);
  assert.equal(rc.big, "●");
  assert.ok(rc.sections.some((s) => s.items?.includes("안전보건교육 (제29조)")));
});

test("penaltyCell: per-person penalty exposes perPerson; criminal does not; unverified warns", () => {
  const per = data.penalties.find((p) => p.unit === "1명");
  const d = penaltyCell(per, 1);
  assert.ok(Array.isArray(d.fine.perPerson));
  assert.equal(d.big, `${per.a[0].toLocaleString("ko-KR")}만원`);
  const crim = data.penalties.find((p) => p.k === "형사");
  assert.equal(penaltyCell(crim, 1).fine, undefined);
  const u = penaltyCell({ ...per, status: "미확인" }, 1);
  assert.equal(u.warn, WARN);
  assert.equal(u.big, "확인");
  noNumber(u);
});

test("envCell returns the clause text; unverified warns", () => {
  const e = data.env[0];
  const d = envCell(e, 0);
  assert.ok(JSON.stringify(d.sections).includes(e.content));
  assert.ok(JSON.stringify(envCell(e, 1).sections).includes(e.penalty));
  const u = envCell({ ...e, status: "미확인" }, 0);
  assert.equal(u.warn, WARN);
  assert.ok(!JSON.stringify(u.sections).includes(e.content));
});

test("cellDetail routes by kind and returns fallback for unknown", () => {
  assert.equal(cellDetail("W", "reg", 0, data).big, "8시간");
  assert.equal(cellDetail("H", "off", 0, data).big, "2년 1회");
  assert.equal(cellDetail("T", "39", 0, data).big, "8시간");
  assert.equal(cellDetail("R", "mgr", 0, data).big, "●");
  assert.equal(cellDetail("M", "mgr", 4, data).title, "안전보건관리책임자 × 선임 기준");
  assert.equal(cellDetail("V", "v0", 0, data).warn, undefined);
  for (const [k, id, col] of [["F", "f1", 1], ["P", "p10", 2]]) assert.ok(cellDetail(k, id, col, data).title);
  const fb = cellDetail("X", "nope", 9, data);
  assert.equal(fb.warn, WARN);
  assert.equal(fb.big, "확인");
  assert.deepEqual(fb.sections, []);
  for (const k of ["W", "H", "F", "T", "M", "R", "P", "V"]) {
    assert.doesNotThrow(() => cellDetail(k, "nope", 99, data));
    assert.equal(cellDetail(k, "nope", 99, data).warn, WARN);
  }
  assert.doesNotThrow(() => cellDetail("W", "reg", 99, data));
  assert.doesNotThrow(() => cellDetail("W", "reg", 0, {}));
});

test("W cell detail for the checklist example has 11 content items and 10/20/50 fine", () => {
  const d = cellDetail("W", "reg", 0, data);
  assert.equal(d.sections.find((s) => s.key === "contents").items.length, 11);
  assert.deepEqual(d.fine.perPerson, [10, 20, 50]);
});

test("unverified worker cell stays neutral through cellDetail", () => {
  const d = cellDetail("W", "for", 0, data);
  assert.equal(d.big, "확인");
  assert.equal(d.warn, WARN);
});

test("infoDetail builds row definitions", () => {
  assert.ok(infoDetail("W", "reg", data).sections.length > 0);
  const src = { H: "workers", F: "foreign", M: "roles", R: "roles" };
  for (const k of ["H", "F", "M", "R"]) assert.ok(infoDetail(k, data[src[k]][0].id, data).title);
  assert.equal(infoDetail("W", "nope", data).warn, WARN);
});

test("unverified W cells carry no fine, no calculator and no 만원", async () => {
  const { detailToHtml } = await import("../js/render.js");
  for (const [id, col] of [["day", 1], ["f1w", 1], ["for", 0]]) {
    const d = cellDetail("W", id, col, data);
    assert.ok(d.warn);
    assert.equal(d.fine, undefined);
    const h = detailToHtml(d, { count: 3 });
    assert.ok(!h.includes('id="n"') && !h.includes("만원"));
  }
  for (const k of ["T", "P", "M", "R", "H", "F", "V"]) {
    const d = cellDetail(k, "nope", 0, data);
    assert.equal(d.fine, undefined);
  }
});

test("taskCell: contents shown when present, placeholder gone; unverified still warns", () => {
  const t = taskCell({ id: "15", name: "x", status: "확인", contents: ["가 사항", "나 사항"] }, 0);
  const c = t.sections.find((x) => x.key === "contents");
  assert.deepEqual(c.items, ["가 사항", "나 사항"]);
  assert.ok(t.sections.some((x) => x.key === "common"));
  assert.ok(!JSON.stringify(t).includes("아직 정리하지 않았습니다"));
  const u = taskCell({ id: "15", name: "x", status: "미확인", contents: ["가 사항"] }, 2);
  assert.equal(u.warn, WARN);
  const none = taskCell({ id: "15", name: "x", status: "확인" }, 0);
  assert.ok(JSON.stringify(none).includes("아직 정리하지 않았습니다"));
});

test("foreignCell: no unsourced 취업인정증 or insurance claims in any foreign cell", () => {
  for (const f of data.foreign) {
    for (const col of [0, 1, 2]) {
      const s = JSON.stringify(foreignCell(f, col, data.meta.foreign_edu));
      assert.ok(!s.includes("건설업 취업인정증") && !s.includes("취업인정증"), `${f.id} ${col}`);
      assert.ok(!/상해보험|귀국비용보험|보험/.test(s.replace(/귀국비용 보험 또는 신탁/g, "")), `${f.id} ${col}`);
    }
  }
});

test("cellDetail adds a pending section for law articles with upcoming changes", () => {
  const w = data.workers.find((x) => x.id === "reg");
  const base = cellDetail("W", "reg", 0, data);
  const law = base.law;
  assert.ok(law.length > 0);
  const art = articleIdsFromLaw(law)[0];
  assert.ok(art, "row has a mappable law reference");
  const versions = { entries: { [art]: { differs: true, latest_effective: "2027-04-28", diff_lines: ["예정: x"] } } };
  const d = cellDetail("W", "reg", 0, { ...data, versions });
  const s = d.sections.find((x) => x.key === "pending");
  assert.ok(s);
  assert.equal(s.items[0], "시행 예정 개정이 있습니다 (시행 2027-04-28)");
  assert.equal(s.items[1], "예정: x");
  assert.equal(d.big, base.big);
  assert.equal(d.warn, base.warn);
  const none = cellDetail("W", "reg", 0, { ...data, versions: { entries: { [art]: { differs: false } } } });
  assert.equal(none.sections.find((x) => x.key === "pending"), undefined);
  assert.equal(cellDetail("W", "reg", 0, data).sections.find((x) => x.key === "pending"), undefined);
});

test("unverified detail with pending note still has no fine", () => {
  // deterministic: first worker cell that is q/unverified and whose law maps to an article
  let hit = null;
  for (const w of data.workers) {
    for (let col = 0; col < 5 && !hit; col++) {
      const base = cellDetail("W", w.id, col, data);
      const art = articleIdsFromLaw(base.law)[0];
      if (base.warn && art) hit = { w, col, art };
    }
    if (hit) break;
  }
  assert.ok(hit, "a q-cell row with a mappable law exists");
  const versions = { entries: { [hit.art]: { differs: true, latest_effective: "2027-04-28", diff_lines: ["예정: x"] } } };
  const d = cellDetail("W", hit.w.id, hit.col, { ...data, versions });
  assert.ok(d.sections.some((s) => s.key === "pending"));
  assert.ok(d.warn !== undefined);
  assert.equal(d.fine, undefined);
});

test("foreign records with a future effective date mark every cell 시행", () => {
  const today = "2026-11-04";
  const future = data.foreign.filter((r) => r.source?.effective > today);
  assert.ok(future.length >= 1);
  for (const r of future) for (const k of ["c", "pr", "ed"]) assert.ok(r[k].t.includes("시행"), `${r.id}.${k}`);
});
