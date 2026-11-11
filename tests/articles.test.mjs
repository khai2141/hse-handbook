import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { articlesFor, filterArticles, groupArticles, renderArticles, articleDetail, splitClauses, penBrief, penFull } from "../js/articles.js";
import { detailToHtml } from "../js/render.js";
import { loadData } from "./load.mjs";

const data = loadData();
const list = () => articlesFor(data, "d.tech.com");

test("data loads 87 cards for d.tech.com and none elsewhere", () => {
  assert.equal(list().length, 87);
  assert.equal(articlesFor(data, "d.tech.mach").length, 139);
  assert.equal(articlesFor(data, "d.tech.work").length, 92);
  assert.equal(articlesFor({}, "d.tech.com").length, 0);
});

test("node d.tech.com is kind A and keeps its plan", () => {
  const n = data.nodes["d.tech.com"];
  assert.equal(n.kind, "A");
  assert.ok(Array.isArray(n.plan) && n.plan.length);
});

test("groupArticles keeps first-appearance order of groups", () => {
  const g = groupArticles(list());
  assert.deepEqual(g.map((x) => x.group), ["총칙", "작업장", "통로", "보호구", "관리감독자·작업계획서", "추락·붕괴 방지", "비계", "휴게·잔재물", "환기"]);
  assert.equal(g.reduce((n, x) => n + x.items.length, 0), 87);
});

test("node d.tech.work is kind A with 11 groups in order", () => {
  assert.equal(data.nodes["d.tech.work"].kind, "A");
  const g = groupArticles(articlesFor(data, "d.tech.work"));
  assert.deepEqual(g.map((x) => x.group), ["거푸집·동바리", "굴착", "터널", "채석", "잠함·가설도로", "철골", "해체", "중량물·자재", "항만 하역", "벌목", "궤도·입환"]);
  assert.ok(articlesFor(data, "d.tech.work").some((r) => r.id === "sr-331-2" && r.jo === "제331조의2"));
});

test("node d.hea.std.chem is kind A with 5 groups in order and 85 cards", () => {
  assert.equal(data.nodes["d.hea.std.chem"].kind, "A");
  const list = articlesFor(data, "d.hea.std.chem");
  assert.equal(list.length, 85);
  const g = groupArticles(list);
  assert.deepEqual(g.map((x) => x.group), ["유기용제 (관리대상 유해물질)", "허가대상물질", "베릴륨", "석면", "금지유해물질"]);
  assert.deepEqual(g.map((x) => x.items.length), [32, 19, 6, 14, 14]);
  assert.ok(list.some((r) => r.id === "sr-511" && r.jo === "제511조"));
});

test("node d.hea.std.phys is kind A with 5 groups in order and 93 cards", () => {
  assert.equal(data.nodes["d.hea.std.phys"].kind, "A");
  const list = articlesFor(data, "d.hea.std.phys");
  assert.equal(list.length, 93);
  const g = groupArticles(list);
  assert.deepEqual(g.map((x) => x.group), ["소음·진동", "이상기압(고압작업·잠수)", "온도·습도", "방사선", "병원체 (감염병)"]);
  assert.deepEqual(g.map((x) => x.items.length), [9, 37, 15, 19, 13]);
  assert.ok(list.some((r) => r.id === "sr-536-2" && r.jo === "제536조의2"));
  assert.ok(list.some((r) => r.id === "sr-604" && r.jo === "제604조"));
});

test("node d.hea.std.air is kind A with 3 groups in order and 51 cards", () => {
  assert.equal(data.nodes["d.hea.std.air"].kind, "A");
  const list = articlesFor(data, "d.hea.std.air");
  assert.equal(list.length, 51);
  const g = groupArticles(list);
  assert.deepEqual(g.map((x) => x.group), ["밀폐공간", "분진", "사무실 공기"]);
  assert.deepEqual(g.map((x) => x.items.length), [29, 12, 10]);
  assert.ok(list.some((r) => r.id === "sr-655" && r.jo === "제655조"));
});

test("node d.hea.std.erg is kind A with 4 groups in order and 17 cards", () => {
  assert.equal(data.nodes["d.hea.std.erg"].kind, "A");
  const list = articlesFor(data, "d.hea.std.erg");
  assert.equal(list.length, 17);
  const g = groupArticles(list);
  assert.deepEqual(g.map((x) => x.group), ["근골격계·중량물", "그 밖의 건강장해 예방", "배달종사자", "규제의 재검토"]);
  assert.deepEqual(g.map((x) => x.items.length), [11, 4, 1, 1]);
  assert.ok(list.some((r) => r.id === "sr-674" && r.jo === "제674조"));
});

test("node d.hea.msds is kind A with 4 groups in order and 25 cards", () => {
  assert.equal(data.nodes["d.hea.msds"].kind, "A");
  const list = articlesFor(data, "d.hea.msds");
  assert.equal(list.length, 25);
  const g = groupArticles(list);
  assert.deepEqual(g.map((x) => x.group), ["작성·제출", "제공·게시", "경고표시", "교육·비공개"]);
  assert.deepEqual(g.map((x) => x.items.length), [8, 7, 2, 8]);
  assert.ok(list.some((r) => r.id === "l-112-2" && r.jo === "제112조의2"));
  assert.ok(list.some((r) => r.id === "r-170" && r.jo === "제170조"));
  assert.ok(list.some((r) => r.id === "d-86" && r.jo === "제86조"));
});

test("d.tech.fire has 77 cards including sr-227", () => {
  const list = articlesFor(data, "d.tech.fire");
  assert.equal(list.length, 77);
  assert.ok(list.some((r) => r.id === "sr-227" && r.jo === "제227조"));
});

test("node d.tech.mach is kind A with 15 groups in order", () => {
  assert.equal(data.nodes["d.tech.mach"].kind, "A");
  assert.ok(data.nodes["d.tech.mach"].plan.length);
  const g = groupArticles(articlesFor(data, "d.tech.mach"));
  assert.deepEqual(g.map((x) => x.group), ["기계 일반", "공작기계", "프레스·전단기", "목재가공용 기계", "원심기·분쇄기·고속회전체", "보일러·압력용기", "그 밖의 기계·기구", "양중기", "차량계 하역운반기계", "화물자동차", "컨베이어", "차량계 건설기계", "항타기·항발기", "굴착기", "산업용 로봇"]);
  assert.deepEqual(g.map((x) => x.items.length), [14, 3, 2, 6, 5, 5, 11, 39, 17, 3, 5, 11, 11, 4, 3]);
  assert.ok(articlesFor(data, "d.tech.mach").some((r) => r.id === "sr-142" && r.jo === "제142조"));
});

test("filter matches jo, title, must and choseong", () => {
  const f = (q) => filterArticles(list(), q).map((r) => r.jo);
  assert.equal(f("제13조")[0], "제13조");
  assert.ok(f("안전난간").includes("제13조"));
  assert.ok(f("ㅇㅈㄴㄱ").includes("제13조"));
  assert.ok(f("타워크레인").includes("제37조"));
  assert.equal(f("").length, 87);
  assert.equal(f("zzzz없음").length, 0);
});

test("renderArticles: group headings, one button per card, first must bullet, escaped", () => {
  const h = renderArticles("d.tech.com", data, "", "cards");
  assert.equal((h.match(/class="card"/g) ?? []).length, 87);
  assert.equal((h.match(/<h3/g) ?? []).length, 9);
  assert.ok(h.includes('data-art="sr-13"'));
  assert.ok(h.includes(list().find((r) => r.id === "sr-13").gist.slice(0, 12)));
  assert.ok(h.includes("제13조") && h.includes("안전난간의 구조 및 설치요건"));
  const evil = { articles: [{ ...list()[0], id: "x", jo: "<b>", title: "<img src=x onerror=1>", must: ["<script>"], group: "<i>" }], nodes: data.nodes };
  const e = renderArticles("d.tech.com", evil, "");
  assert.ok(!e.includes("<img src=x") && !e.includes("<script>") && !e.includes("<i>"));
});

test("renderArticles: default is a summary table, one row per article, escaped", () => {
  const h = renderArticles("d.tech.com", data, "");
  assert.equal((h.match(/class="srow"/g) ?? []).length, 87);
  assert.equal((h.match(/class="shead"/g) ?? []).length, 9);
  assert.ok(h.includes('data-art="sr-13"') && !h.includes('class="card"'));
  const evil = { articles: [{ ...list()[0], id: "x", jo: "<b>", title: "<img src=x onerror=1>", must: ["<script>"], who: "<u>", group: "<i>" }], nodes: data.nodes };
  const e = renderArticles("d.tech.com", evil, "");
  assert.ok(!e.includes("<img src=x") && !e.includes("<script>") && !e.includes("<i>") && !e.includes("<u>"));
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

test("penalty section: unlinked card gets a plain note; linked card lists tag, name, fine and basis; always a go link", () => {
  const d = articleDetail("sr-1", data);
  const p = d.sections.find((s) => s.label === "위반 시");
  assert.equal(p.go.id, "g.pen");
  assert.equal(p.go.text, "벌칙·과태료 가지에서 전체 보기");
  assert.ok(p.text && !p.items);
  const p2 = articleDetail("sr-38", data).sections.find((s) => s.label === "위반 시");
  assert.ok(p2.items[0].includes("안전·보건조치 위반") && p2.items[0].includes("5년 이하 징역 또는 5천만원 이하 벌금") && p2.items[0].includes("(법 제168조)"));
  assert.ok(p2.items[1].startsWith("사망 시") && p2.items[1].includes("7년 이하 징역"));
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
  assert.ok(app.includes('"articles"') && app.includes("data/${n}.json"));
  assert.ok(app.includes("조문 원문은 law.go.kr에서 가져온 현행 시행본입니다. 행을 누르면 요건·점검·원문이 열립니다."));
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
test("education article nodes (audit D) are kind A children of the matrix nodes", () => {
  const exp = {
    "d.edu.w.law": [["근로자 교육 의무", "면제·단축", "건설업 기초교육", "특수형태근로종사자"], [2, 2, 2, 1], "d.edu.w"],
    "d.edu.m.law": [["직무교육", "안전보건교육기관"], [2, 1], "d.edu.m"],
  };
  for (const [node, [groups, counts, parent]] of Object.entries(exp)) {
    assert.equal(data.nodes[node].kind, "A", node);
    assert.ok(data.nodes[node].plan.length, node);
    assert.ok(data.nodes[parent].kids.includes(node), node);
    const g = groupArticles(articlesFor(data, node));
    assert.deepEqual(g.map((x) => x.group), groups, node);
    assert.deepEqual(g.map((x) => x.items.length), counts, node);
    for (const x of g) for (const r of x.items) assert.match(r.id, /^(l|r)-\d+$/, r.id);
  }
  assert.deepEqual(articlesFor(data, "d.edu.w.law").map((r) => r.id), ["l-29", "r-26", "l-30", "r-27", "l-31", "r-28", "r-95"]);
  assert.deepEqual(articlesFor(data, "d.edu.m.law").map((r) => r.id), ["l-32", "r-29", "l-33"]);
});
test("plan/check/fix/base branches (wave 3b) are kind A with their groups and law-prefixed ids", () => {
  const exp = {
    "p.rule": [["안전보건관리규정", "이사회 보고"], 5],
    "p.risk": [["위험성평가 (법)"], 5],
    "c.insp": [["안전보건진단", "안전검사"], 6],
    "a.fix": [["안전보건개선계획", "시정조치"], 5],
    "c.res": [["산업재해 발생건수 공표"], 4],
    "g.law": [["산업안전보건법 총칙", "중대재해처벌법"], 11],
    "d.tech.sp": [["특수형태근로종사자"], 4],
  };
  for (const [node, [groups, n]] of Object.entries(exp)) {
    assert.equal(data.nodes[node].kind, "A", node);
    assert.ok(data.nodes[node].plan.length, node);
    const list = articlesFor(data, node);
    assert.equal(list.length, n, node);
    assert.deepEqual(groupArticles(list).map((x) => x.group), groups, node);
    for (const r of list) assert.match(r.id, /^(sr|l|d|r|j)-\d+(-\d+)?$/, r.id);
  }
  assert.equal(articleDetail("j-4", data).sub, "중대재해 처벌 등에 관한 법률");
});

test("summary table has a 위반 시 column; rows show linked 벌칙 or a dash; the 누가 cell is not the .sw swatch", () => {
  const html = renderArticles("d.tech.com", data);
  assert.ok(html.includes("<span>위반 시</span>"));
  assert.ok(html.includes('class="swho"') && !html.includes('class="sw"'));
  const sr38 = html.match(/data-art="sr-38"[\s\S]*?<\/button>/)[0];
  assert.ok(sr38.includes("공통 벌칙") && !sr38.includes("5년 이하 징역"));
  assert.ok(html.includes('class="cpen"') && html.split('class="cpen"')[1].includes("5년 이하 징역 또는 5천만원 이하 벌금"));
  const sub = renderArticles("d.sub", data);
  assert.ok(!sub.includes('class="cpen"') && sub.match(/data-art="l-62"[\s\S]*?<\/button>/)[0].includes("500만원"));
  const sr1 = html.match(/data-art="sr-1"[\s\S]*?<\/button>/)[0];
  assert.ok(sr1.includes('class="none"'));
});

test("penBrief/penFull: 형사 text, 과태료 range and 1·2·3차", () => {
  const p = (id) => data.penalties.find((x) => x.id === id);
  assert.equal(penBrief(p("p3")), "5년 이하 징역 또는 5천만원 이하 벌금");
  assert.equal(penBrief(p("p11")), "50~500만원");
  assert.equal(penBrief(p("p31")), "500만원");
  assert.equal(penFull(p("p11")), "1차 50 · 2차 250 · 3차 500만원");
  assert.ok(penFull(p("p2")).includes(" / 법인 50억원 이하"));
});

test("every linked penalty id resolves and unverified penalties are not shown", () => {
  for (const r of data.articles) for (const id of r.penalty_ids) assert.ok(data.penalties.some((x) => x.id === id), r.id);
  const d = { ...data, penalties: data.penalties.map((x) => (x.id === "p3" ? { ...x, status: "미확인" } : x)) };
  assert.ok(!renderArticles("d.tech.com", d).includes("5년 이하 징역 또는 5천만원"));
});

test("summary rows and search show the one-line gist, not the long first requirement", () => {
  const r = data.articles.find((x) => x.id === "sr-56");
  assert.ok(r.gist && r.gist.length <= 45);
  const row = renderArticles(r.branch, data).match(/data-art="sr-56"[\s\S]*?<\/button>/)[0];
  assert.ok(row.includes(r.gist.replace(/&/g, "&amp;")));
});

import { renderAnnex, annexDetail } from "../js/annex.js";
import { renderRevs } from "../js/revs.js";

test("annex branch: rows by 별표, verbatim items in the sheet, escaped", () => {
  const d = { ...data, annexes: JSON.parse(fs.readFileSync(new URL("../data/annexes.json", import.meta.url), "utf8")).records };
  const h = renderAnnex(d);
  assert.ok(h.includes("별표 3") && h.includes('data-annex="b3-1"') && h.includes("프레스등을 사용하여 작업을 할 때"));
  const det = annexDetail("b3-1", d);
  assert.ok(det.sections[0].items[0].startsWith("가. 클러치 및 브레이크의 기능"));
  assert.ok(renderAnnex(d, "굴착면").includes("별표 11") && !renderAnnex(d, "굴착면").includes('data-annex="b3-1"'));
  const evil = { annexes: [{ id: "x", annex: "<b>", annex_title: "<i>", basis: "x", no: "1", name: "<img src=x onerror=1>", parts: [{ label: "l", items: ["<script>"] }] }] };
  const e = renderAnnex(evil);
  assert.ok(!e.includes("<img src=x") && !e.includes("<script>") && !e.includes("<b>"));
});

test("revs branch shows the weekly law-watch result: stale and pending entries, law versions, escaped", () => {
  const w = {
    checked_at: "2026-11-10",
    checked: 816,
    errors: [],
    laws: [{ law: "산업안전보건법", header: "[시행 2027. 4. 28.] [법률 제22122호, 2026. 10. 27., 일부개정]", new: true }],
    entries: {
      "법175": { state: "pending", jo: "제175조", title: "과태료", law: "산업안전보건법", branch: null, header: "[h]", lines: ["신설: 1의2. <b>"] },
      "sr-13": { state: "stale", jo: "제13조", title: "안전난간", law: "규칙", branch: "d.tech.com", header: "[h2]", lines: ["변경 전: a", "변경 후: b"] },
    },
  };
  const h = renderRevs({ lawwatch: w });
  assert.ok(h.includes("점검일 2026-11-10") && h.includes("816") && h.includes("시행 중 변경 1건") && h.includes("시행 예정 1건"));
  assert.ok(h.includes('data-art="sr-13"') && !h.includes('data-art="법175"'));
  assert.ok(h.includes("새 공포본") && h.includes("&lt;b&gt;") && !h.includes("<b>"));
  assert.ok(renderRevs({}).includes("자료가 없습니다"));
});

test("a card with a law-watch entry shows a badge in the row and the change list first in the sheet", () => {
  const d = { ...data, lawwatch: { checked_at: "2026-11-10", entries: { "sr-13": { state: "stale", header: "[h]", lines: ["변경 후: x"] } } } };
  const row = renderArticles("d.tech.com", d).match(/data-art="sr-13"[\s\S]*?<\/button>/)[0];
  assert.ok(row.includes("개정됨"));
  const det = articleDetail("sr-13", d);
  assert.equal(det.sections[0].label, "개정됨 — 요약 검토 중");
  assert.ok(det.warn && det.share);
  assert.ok(!articleDetail("sr-14", d).warn && articleDetail("sr-14", d).sections[0].label === "요건");
});

test("a pending card with a hand-written 'after' shows the amended requirements above the current ones", () => {
  const after = { title: "새 제목", must: ["개정 후 요건 <1>"], note: "미확인 메모", text: "제13조(새 제목) ① 첫째 항. ② 둘째 항." };
  const e = { state: "pending", header: "[h]", lines: ["변경 후: x"], dates: ["2027-04-28: 전부"], after };
  const d = { ...data, lawwatch: { checked_at: "2026-11-11", entries: { "sr-13": e } } };
  const L = articleDetail("sr-13", d).sections.map((s) => s.label);
  assert.deepEqual(L.slice(0, 3), ["시행 예정 개정", "시행일 이후 요건 (개정 후) — 제목: 새 제목", "요건 (현행)"]);
  const s = articleDetail("sr-13", d).sections;
  assert.deepEqual(s[1].items, after.must);
  assert.ok(s[1].hint.includes("시행일 2027-04-28") && s[1].hint.includes("미확인 메모"));
  assert.ok(L.indexOf("개정 후 원문 (시행 예정)") === L.indexOf("원문 (현행)") + 1);
  assert.equal(s[L.indexOf("개정 후 원문 (시행 예정)")].lines.length, 3);
  // not shown once the amendment is in force (stale) or when nothing was written
  const stale = { ...d, lawwatch: { ...d.lawwatch, entries: { "sr-13": { ...e, state: "stale" } } } };
  assert.ok(!articleDetail("sr-13", stale).sections.some((x) => x.label.includes("개정 후")));
  const none = { ...d, lawwatch: { ...d.lawwatch, entries: { "sr-13": { ...e, after: undefined } } } };
  assert.ok(articleDetail("sr-13", none).sections.some((x) => x.label === "요건"));
});
test("a fine that is not in force yet says from when: in the row, in the sheet and in the penalty table", () => {
  const row = renderArticles("p.risk", data).match(/data-art="l-36"[\s\S]*?<\/button>/)[0];
  assert.ok(row.includes("2027-01-01부터") && row.includes("2028-01-01"));
  const pen = articleDetail("l-36", data).sections.find((s) => s.label === "위반 시");
  assert.equal(pen.items.length, 6);
  assert.ok(pen.items.every((x) => x.includes("시행 예정") && x.includes("2028-01-01")));
  assert.ok(pen.items[0].includes("1차 500 · 2차 700 · 3차 1000만원"));
  const p16 = articleDetail("l-29", data).sections.find((s) => s.label === "위반 시");
  assert.ok(p16.items.length && !p16.items.some((x) => x.includes("시행 예정")));
});

import { routeFromHash, itemFromHash } from "../js/tree.js";

test("deep link: '#/d/tech/com@sr-13' routes to the branch and names the item; junk is ignored", () => {
  assert.equal(routeFromHash("#/d/tech/com@sr-13", data.nodes), "d.tech.com");
  assert.equal(itemFromHash("#/d/tech/com@sr-13"), "sr-13");
  assert.equal(itemFromHash("#/d/tech/tbl@b13_2-1"), "b13_2-1");
  assert.equal(itemFromHash("#/d/tech/com"), null);
  assert.equal(itemFromHash("#/x@<script>"), null);
});
