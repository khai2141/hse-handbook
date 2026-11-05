import test from "node:test";
import assert from "node:assert/strict";
import { searchAll, resultsHtml, homeTopHtml, INTENTS, CHIPS } from "../js/home.js";
import { loadData } from "./load.mjs";

const data = loadData();

test("every intent shortcut points to an existing node", () => {
  for (const x of INTENTS) assert.ok(data.nodes[x.id], x.id);
});

test("every chip finds at least one card", () => {
  for (const c of CHIPS) assert.ok(searchAll(data, c).total > 0, c);
});

test("empty query returns nothing; title hits rank before text hits", () => {
  assert.equal(searchAll(data, "  ").total, 0);
  const r = searchAll(data, "안전난간");
  assert.ok(r.total > 0);
  assert.equal(r.items[0].rank, 0);
  const ranks = r.items.map((x) => x.rank);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
});

test("choseong query works", () => {
  assert.ok(searchAll(data, "ㅂㅈ").total > 0);
});

test("unverified cards match on title only and show no gist", () => {
  const d = { nodes: data.nodes, articles: [{ id: "u", jo: "제1조", title: "제목", status: "미확인", must: ["비밀 2미터"], text: "비밀 본문", branch: "d.tech.com" }] };
  assert.equal(searchAll(d, "비밀").total, 0);
  const t = searchAll(d, "제목");
  assert.equal(t.items[0].gist, "");
});

test("results are escaped and limited", () => {
  const d = { nodes: data.nodes, articles: [{ id: "x", jo: "<b>", title: "<img src=x onerror=1>", status: "확인", must: ["<script>"], text: "t", branch: "d.tech.com" }] };
  const h = resultsHtml(d, "img");
  assert.ok(!h.includes("<img src=x") && !h.includes("<script>"));
  assert.ok(searchAll(data, "사업주", 5).items.length <= 5);
});

test("home top renders the search box, chips and tiles", () => {
  const h = homeTopHtml(data, "");
  assert.ok(h.includes('id="hq"') && h.includes("data-chip=") && h.includes('class="tile"'));
});
