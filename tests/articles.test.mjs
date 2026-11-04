import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { articlesFor, filterArticles, groupArticles, renderArticles, articleDetail, splitClauses } from "../js/articles.js";
import { detailToHtml } from "../js/render.js";
import { loadData } from "./load.mjs";

const data = loadData();
const list = () => articlesFor(data, "d.tech.com");

test("data loads 55 cards for d.tech.com and none elsewhere", () => {
  assert.equal(list().length, 55);
  assert.equal(articlesFor(data, "d.tech.mach").length, 91);
  assert.equal(articlesFor(data, "d.tech.work").length, 60);
  assert.equal(articlesFor({}, "d.tech.com").length, 0);
});

test("node d.tech.com is kind A and keeps its plan", () => {
  const n = data.nodes["d.tech.com"];
  assert.equal(n.kind, "A");
  assert.ok(Array.isArray(n.plan) && n.plan.length);
});

test("groupArticles keeps first-appearance order of groups", () => {
  const g = groupArticles(list());
  assert.deepEqual(g.map((x) => x.group), ["작업장", "통로", "보호구", "관리감독자·작업계획서", "추락·붕괴 방지", "비계", "휴게·잔재물"]);
  assert.equal(g.reduce((n, x) => n + x.items.length, 0), 55);
});

test("node d.tech.work is kind A with 7 groups in order", () => {
  assert.equal(data.nodes["d.tech.work"].kind, "A");
  const g = groupArticles(articlesFor(data, "d.tech.work"));
  assert.deepEqual(g.map((x) => x.group), ["거푸집·동바리", "굴착", "터널", "잠함·가설도로", "철골", "해체", "중량물·자재"]);
  assert.ok(articlesFor(data, "d.tech.work").some((r) => r.id === "sr-331-2" && r.jo === "제331조의2"));
});

test("node d.tech.mach is kind A with 6 groups in order", () => {
  assert.equal(data.nodes["d.tech.mach"].kind, "A");
  assert.ok(data.nodes["d.tech.mach"].plan.length);
  const g = groupArticles(articlesFor(data, "d.tech.mach"));
  assert.deepEqual(g.map((x) => x.group), ["기계 일반", "양중기", "차량계 하역운반기계", "차량계 건설기계", "항타기·항발기", "굴착기"]);
  assert.deepEqual(g.map((x) => x.items.length), [11, 39, 15, 11, 11, 4]);
  assert.ok(articlesFor(data, "d.tech.mach").some((r) => r.id === "sr-142" && r.jo === "제142조"));
});

test("filter matches jo, title, must and choseong", () => {
  const f = (q) => filterArticles(list(), q).map((r) => r.jo);
  assert.equal(f("제13조")[0], "제13조");
  assert.ok(f("안전난간").includes("제13조"));
  assert.ok(f("ㅇㅈㄴㄱ").includes("제13조"));
  assert.ok(f("타워크레인").includes("제37조"));
  assert.equal(f("").length, 55);
  assert.equal(f("zzzz없음").length, 0);
});

test("renderArticles: group headings, one button per card, first must bullet, escaped", () => {
  const h = renderArticles("d.tech.com", data, "");
  assert.equal((h.match(/class="card"/g) ?? []).length, 55);
  assert.equal((h.match(/<h3/g) ?? []).length, 7);
  assert.ok(h.includes('data-art="sr-13"'));
  assert.ok(h.includes(list().find((r) => r.id === "sr-13").must[0].slice(0, 12)));
  assert.ok(h.includes("제13조") && h.includes("안전난간의 구조 및 설치요건"));
  const evil = { articles: [{ ...list()[0], id: "x", jo: "<b>", title: "<img src=x onerror=1>", must: ["<script>"], group: "<i>" }], nodes: data.nodes };
  const e = renderArticles("d.tech.com", evil, "");
  assert.ok(!e.includes("<img src=x") && !e.includes("<script>") && !e.includes("<i>"));
});

test("renderArticles: empty filter result and empty branch", () => {
  assert.ok(renderArticles("d.tech.com", data, "zzzz없음").includes("검색 결과가 없습니다"));
  const synthetic = { nodes: { "x.empty": { t: "x", kind: "A" } }, articles: [] };
  assert.ok(renderArticles("x.empty", synthetic, "").includes("준비 중"));
});

test("unverified card warns and shows no must bullet or numbers", () => {
  const bad = { ...list()[0], id: "u1", status: "미확인", must: ["높이 2미터 이상"] };
  const d2 = { ...data, articles: [bad] };
  const h = renderArticles("d.tech.com", d2, "");
  assert.ok(h.includes("원문 미확인"));
  assert.ok(!h.includes("2미터"));
  const det = articleDetail("u1", d2);
  assert.ok(det.warn);
  const html = detailToHtml(det);
  assert.ok(!html.includes("2미터"));
});

test("articleDetail has sections in the required order", () => {
  const d = articleDetail("sr-38", data);
  assert.equal(d.title, "제38조 사전조사 및 작업계획서의 작성 등");
  assert.deepEqual(d.sections.map((s) => s.label), ["요건", "누가", "점검 포인트", "필요한 기록", "위반 시", "원문", "출처"]);
  const orig = d.sections.find((s) => s.label === "원문");
  assert.equal(orig.collapse, "open");
  assert.ok(orig.lines.length > 3);
  assert.equal(orig.lines.join(" "), list().find((r) => r.id === "sr-38").text);
});

test("원문 lines rejoin to the verbatim text for every card", () => {
  for (const r of list()) assert.equal(splitClauses(r.text).join(" "), r.text, r.id);
});

test("penalty section: no data means plain note; with data shows name and first fine; always a go link", () => {
  const d = articleDetail("sr-38", data);
  const p = d.sections.find((s) => s.label === "위반 시");
  assert.equal(p.go.id, "g.pen");
  assert.equal(p.go.text, "벌칙·과태료 가지에서 전체 보기");
  assert.ok(p.text);
  const linked = { ...data, articles: data.articles.map((r) => (r.id === "sr-38" ? { ...r, penalty_ids: ["p3"] } : r)) };
  const p2 = articleDetail("sr-38", linked).sections.find((s) => s.label === "위반 시");
  assert.ok(p2.items[0].includes("안전·보건조치 위반") && p2.items[0].includes("5년 이하 징역 또는 5천만원 이하 벌금"));
});

test("source section links only to https://www.law.go.kr and shows effective date", () => {
  const html = detailToHtml(articleDetail("sr-13", data));
  assert.ok(html.includes('href="https://www.law.go.kr/'));
  assert.ok(html.includes("law.go.kr에서 보기"));
  assert.ok(html.includes("2025-12-01"));
  const evil = { ...data, articles: [{ ...list()[0], id: "e", source: { ...list()[0].source, url: "javascript:alert(1)" } }] };
  assert.ok(!detailToHtml(articleDetail("e", evil)).includes("javascript:"));
  assert.ok(!detailToHtml(articleDetail("e", evil)).includes("<a "));
});

test("future_ack shows an upcoming notice", () => {
  const f = { ...list()[0], id: "f", source: { ...list()[0].source, effective: "2999-01-01", future_ack: true } };
  const html = detailToHtml(articleDetail("f", { ...data, articles: [f] }));
  assert.ok(html.includes("시행 예정"));
  assert.ok(!detailToHtml(articleDetail("sr-13", data)).includes("시행 예정"));
});

test("unknown id gives a neutral detail", () => {
  assert.ok(articleDetail("nope", data).title);
});

test("app wires articles and the hint text", () => {
  const app = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("data/articles.json"));
  assert.ok(app.includes("조문 원문은 law.go.kr에서 가져온 현행 시행본입니다. 카드를 누르면 요건·점검·원문이 열립니다."));
  assert.ok(app.includes("data-art"));
});

test("management branches (wave 3a) are kind A with their groups and law-prefixed ids", () => {
  const exp = {
    "d.sub": [["도급 제한·승인", "도급인의 의무", "안전보건총괄책임자·조정자", "발주자의 조치", "건설재해예방전문지도기관", "노사협의체", "산업안전보건위원회"], 32],
    "d.emg": [["중대재해 발생 시 조치·보고", "작업중지·원인조사", "산업재해 은폐 금지·보고", "경영책임자의 비상대응 의무"], 8],
    "d.daily": [["안전·보건조치와 작업중지"], 5],
    "p.doc": [["유해위험방지계획서", "산업안전보건관리비", "안전관리계획 (건설기술 진흥법)", "서류 보존"], 6],
  };
  for (const [node, [groups, n]] of Object.entries(exp)) {
    assert.equal(data.nodes[node].kind, "A", node);
    assert.ok(data.nodes[node].plan.length, node);
    const list = articlesFor(data, node);
    assert.equal(list.length, n, node);
    assert.deepEqual(groupArticles(list).map((x) => x.group), groups, node);
    for (const r of list) assert.match(r.id, /^(l|d|r|jd|k)-\d+(-\d+)?$/, r.id);
  }
  assert.equal(articleDetail("l-54", data).sub, "산업안전보건법");
});