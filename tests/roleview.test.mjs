import test from "node:test";
import assert from "node:assert/strict";
import { roleTiles, roleCards, roleDetail, workerClauses } from "../js/roleview.js";
import { detailToHtml } from "../js/render.js";
import { homeTopHtml } from "../js/home.js";
import { itemFromHash } from "../js/tree.js";
import { loadData } from "./load.mjs";

const data = loadData();

test("every role tile opens a sheet, and the home page shows the tiles", () => {
  const tiles = roleTiles(data);
  assert.equal(tiles.length, data.roles.length + 1);
  const home = homeTopHtml(data);
  for (const t of tiles) {
    assert.ok(roleDetail(t.id, data), t.id);
    assert.ok(home.includes(`data-role="${t.id}"`), t.id);
    assert.equal(itemFromHash(`#/@ro-${t.id}`), `ro-${t.id}`);
  }
  assert.equal(roleDetail("nope", data), null);
});

test("worker clauses keep paragraphs where the worker acts and drop employer paragraphs", () => {
  const t = "제1조(예시) ① 사업주는 근로자에게 보호구를 지급하여야 한다. 1. 감염 우려가 있는 근로자는 접촉을 제한할 것 ② 근로자는 제1항에 따라 지급된 보호구를 착용하여야 한다.";
  assert.deepEqual(workerClauses(t), ["② 근로자는 제1항에 따라 지급된 보호구를 착용하여야 한다."]);
  assert.deepEqual(workerClauses(""), []);
});

test("listed articles exist and really contain the words they were found by", () => {
  const byId = new Map(data.articles.map((r) => [r.id, r]));
  const worker = roleCards("wrk", data);
  assert.ok(worker.length > 30);
  for (const c of worker) assert.ok(byId.get(c.id).text.includes(c.gist.slice(0, 20)), c.id);
  assert.ok(worker.some((c) => c.id === "l-6"));
  for (const r of data.roles) for (const c of roleCards(r.id, data)) assert.ok(byId.get(c.id).text.includes(r.n), `${r.id} ${c.id}`);
});

test("the supervisor sheet lists the 별표 2 work types as openable rows", () => {
  const d = roleDetail("sup2", data);
  const tasks = d.sections.find((s) => s.arts?.[0]?.annex);
  assert.equal(tasks.arts.length, data.annexes.filter((r) => r.annex === "별표 2" && r.annex_title === "관리감독자의 유해·위험 방지").length);
  assert.ok(tasks.arts.length > 0);
  const html = detailToHtml(d);
  assert.ok(html.includes(`data-annex="${tasks.arts[0].id}"`));
  assert.ok(html.includes('data-art="'));
  assert.ok(html.includes("링크 복사"));
});

import { whenText } from "../js/revs.js";

test("a pending change shows a date only when someone read it from the supplementary provisions", () => {
  assert.deepEqual(whenText({ state: "stale" }), []);
  assert.ok(whenText({ state: "pending" })[0].includes("확인 전"));
  const w = whenText({ state: "pending", dates: ["2027-04-28: all"], stages: "1. a: 2027" });
  assert.equal(w.length, 2);
  assert.ok(w[0].includes("2027-04-28") && w[1].includes("1. a: 2027"));
});
