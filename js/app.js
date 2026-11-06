import { clampCount } from "./core.js";
import { esc, icon, bookUrl } from "./html.js";
import { renderMatrix } from "./matrix.js";
import { renderArticles, articleDetail } from "./articles.js";
import { homeTopHtml, resultsHtml } from "./home.js";
import { cellDetail, infoDetail } from "./cells.js";
import { detailToHtml, totalText } from "./render.js";
import { routeFromHash, hashFor, breadcrumbs, kidsOf } from "./tree.js";

const NAMES = ["workers", "education", "health", "foreign", "tasks", "roles", "penalties", "env"];
const HINTS = {
  W: "시간은 시행규칙 별표 4 (시행 2026.8.1). 일용·기간제의 정기교육 시간은 표에 칸이 없어 '확인'으로 표시했습니다.",
  P: "과태료는 시행령 별표 35 (단위 만원). 같은 위반으로 최근 5년 내 처분받은 횟수에 따라 1·2·3차 적용. 통계가 없어 ★는 붙이지 않았습니다.",
  F: "E-9·H-2 내용은 검색 결과(2차 출처) 기반입니다. 최신은 고용24, 법무부에서 확인하세요.",
  A: "조문 원문은 law.go.kr에서 가져온 현행 시행본입니다. 행을 누르면 요건·점검·원문이 열립니다. '위반 시' 칸: 안전보건규칙 제3조~제670조는 법 제38조·제39조가 위임한 기준이므로 위반 시 법 제168조 제1호(사망 시 제167조)가 적용되고, 법 조문은 제167·168·170·171조와 시행령 별표 35에 나온 조문만 연결했습니다. '—'는 벌칙이 없다는 뜻이 아니라 연결된 항목을 찾지 못했다는 뜻입니다.",
  H: "특수건강진단 검사항목은 고용노동부 고시에 있으며 아직 읽지 못했습니다.",
};

const $ = (id) => document.getElementById(id);
const state = { data: null, id: "home", q: "", hq: "", count: 10 };
let opener = null;
let savedY = 0;
let current = null;

async function load() {
  const [recs, nodes, meta] = await Promise.all([
    Promise.all(NAMES.map((n) => fetch(`data/${n}.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(n)))))),
    fetch("data/nodes.json").then((r) => (r.ok ? r.json() : Promise.reject(new Error("nodes")))),
    fetch("data/meta.json").then((r) => (r.ok ? r.json() : Promise.reject(new Error("meta")))),
  ]);
  const data = {};
  NAMES.forEach((n, i) => (data[n] = recs[i].records ?? []));
  data.nodes = nodes.nodes ?? {};
  data.meta = meta;
  data.versions = await fetch("data/versions.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  data.articles = await fetch("data/articles.json").then((r) => (r.ok ? r.json() : null)).then((j) => j?.records ?? []).catch(() => []);
  const im = await fetch("data/images.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  data.images = im?.records ?? [];
  data.imagesMeta = im?.meta;
  if (data.images.length) {
    // book illustrations ship only in the offline build; on a public site they are absent, so drop them quietly
    const ok = await new Promise((res) => {
      const t = new Image();
      t.onload = () => res(true);
      t.onerror = () => res(false);
      t.src = bookUrl(data.images[0].file);
    });
    if (!ok) data.images = [];
  }
  return data;
}

const kindHtml = (n) => (n.kind === "A" ? renderArticles(state.id, state.data, state.q) : renderMatrix(n.kind, state.data, state.q));

/* ---------- screens ---------- */
function outlineHtml() {
  const nodes = state.data.nodes;
  const rec = (id) => {
    const n = nodes[id];
    const k = kidsOf(id, nodes);
    return `<li><button type="button" data-go="${esc(id)}"${id === state.id ? ' aria-current="page"' : ""}>${icon(n.i, 22)}${esc(n.t)}</button>${k.length ? `<ul>${k.map(rec).join("")}</ul>` : ""}</li>`;
  };
  return `<ul>${rec("home")}</ul>`;
}

function crumbsHtml() {
  const nodes = state.data.nodes;
  if (state.id === "home") return "<b>홈 (나무의 줄기)</b>";
  const p = breadcrumbs(state.id, nodes);
  let o = '<button type="button" data-go="home">홈</button>';
  p.forEach((b, i) => {
    o += '<span class="sep">›</span>';
    o += i === p.length - 1 ? `<b>${esc(b.title)}</b>` : `<button type="button" data-go="${esc(b.id)}">${esc(b.title)}</button>`;
  });
  return o;
}

function treeHome() {
  const nodes = state.data.nodes;
  const rec = (id, lvl) => {
    const n = nodes[id];
    const k = kidsOf(id, nodes);
    return `<div class="bn"><button type="button" data-go="${esc(id)}">${icon(n.i, lvl ? 30 : 36)}<span>${esc(n.t)}${n.s ? `<small>${esc(n.s)}</small>` : ""}</span></button>${k.length ? `<div class="br">${k.map((x) => rec(x, lvl + 1)).join("")}</div>` : ""}</div>`;
  };
  return (
    `<div class="tree"><div class="root">${icon("doc_law", 44)}건설안전 HSE 핸드북 <small style="font-weight:400;font-size:12px">줄기</small></div>` +
    `<div class="br">${kidsOf("home", nodes).map((x) => rec(x, 0)).join("")}</div></div>` +
    '<p class="hint">줄기는 계획(P)→실행(D)→점검(C)→개선(A)의 순환이고, 기반은 법령과 책임입니다. 가지를 따라 내려가 끝의 표에서 칸을 누르면 그 칸의 내용만 열립니다. 노란 &quot;준비 중&quot; 가지는 작성 예정 목록만 보입니다.</p>'
  );
}

function mainHtml() {
  const nodes = state.data.nodes;
  const n = nodes[state.id];
  if (state.id === "home") return homeTopHtml(state.data, state.hq) + treeHome();
  let h = `<h2 class="pt">${icon(n.i, 40)}${esc(n.t)}</h2>${n.s ? `<p class="sub">${esc(n.s)}</p>` : ""}`;
  const k = kidsOf(state.id, nodes);
  if (k.length) {
    h += `<div class="kids" role="group" aria-label="하위 가지">${k.map((x) => `<button type="button" data-go="${esc(x)}">${icon(nodes[x].i, 30)}${esc(nodes[x].t)}</button>`).join("")}</div>`;
  }
  if (n.kind) h += `<div id="matrix">${kindHtml(n)}</div><p class="hint">${esc(HINTS[n.kind] ?? "")}</p>`;
  else if (!k.length) {
    h += '<p class="empty">준비 중 — 아래 내용을 작성할 예정입니다.</p>';
    if (Array.isArray(n.plan)) h += `<ul class="plan">${n.plan.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  }
  return h;
}

function renderPage() {
  const n = state.data.nodes[state.id];
  $("crumbs").innerHTML = crumbsHtml();
  $("outline").innerHTML = outlineHtml();
  $("main").innerHTML = mainHtml();
  $("q").hidden = state.id === "home";
  document.title = state.id === "home" ? "건설안전 HSE 핸드북" : `${n.t} · 건설안전 HSE 핸드북`;
}

function renderMatrixOnly() {
  const n = state.data.nodes[state.id];
  const box = $("matrix");
  if (n?.kind && box) box.innerHTML = kindHtml(n);
}

function route() {
  hideSheet();
  state.id = routeFromHash(location.hash, state.data.nodes);
  state.q = "";
  $("q").value = "";
  renderPage();
  $("outline").classList.remove("on");
  $("menu").setAttribute("aria-expanded", "false");
  window.scrollTo(0, 0);
}

function go(id) {
  const target = hashFor(id);
  if (location.hash === target) route();
  else location.hash = target;
}

/* ---------- bottom sheet ---------- */
const sheetOpen = () => $("sheet").classList.contains("on");

function hideSheet() {
  $("sheet").classList.remove("on");
  $("bg").classList.remove("on");
  current = null;
}

function openSheet(detail, trigger) {
  if (!sheetOpen()) {
    opener = trigger ?? null;
    savedY = window.scrollY;
  }
  current = detail;
  const s = $("sheet");
  s.innerHTML = detailToHtml(detail, { count: state.count });
  s.classList.add("on");
  $("bg").classList.add("on");
  s.scrollTop = 0;
  s.focus({ preventScroll: true });
}

function closeSheet() {
  if (!sheetOpen()) return;
  hideSheet();
  const o = opener;
  opener = null;
  if (o && o.isConnected) o.focus({ preventScroll: true });
  window.scrollTo(0, savedY);
}

function trapTab(e) {
  const f = [...$("sheet").querySelectorAll("button,input,summary,[href],[tabindex]:not([tabindex='-1'])")].filter((x) => !x.disabled);
  if (!f.length) return;
  const first = f[0];
  const last = f[f.length - 1];
  const a = document.activeElement;
  if (e.shiftKey && (a === first || a === $("sheet"))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && a === last) {
    e.preventDefault();
    first.focus();
  } else if (!$("sheet").contains(a)) {
    e.preventDefault();
    first.focus();
  }
}

/* ---------- events ---------- */
function onClick(e) {
  if (e.target.id === "bg") return closeSheet();
  const t = e.target.closest("[data-go],[data-cell],[data-info],[data-art],[data-close],[data-chip],#menu");
  if (!t) return;
  if (t.id === "menu") {
    const on = $("outline").classList.toggle("on");
    t.setAttribute("aria-expanded", String(on));
    return;
  }
  if (t.dataset.close) return closeSheet();
  if (t.dataset.chip) return setHomeQuery(t.dataset.chip);
  if (t.dataset.go) return go(t.dataset.go);
  if (t.dataset.art) return openSheet(articleDetail(t.dataset.art, state.data), t);
  if (t.dataset.info) {
    const [kind, id] = t.dataset.info.split("|");
    return openSheet(infoDetail(kind, id, state.data), t);
  }
  if (t.dataset.cell) {
    const [kind, id, col] = t.dataset.cell.split("|");
    openSheet(cellDetail(kind, id, parseInt(col, 10), state.data), t);
  }
}

function onKey(e) {
  if (!sheetOpen()) return;
  if (e.key === "Escape") {
    e.preventDefault();
    closeSheet();
  } else if (e.key === "Tab") trapTab(e);
}

function setHomeQuery(v) {
  state.hq = v;
  const i = $("hq");
  if (i) i.value = v;
  const r = $("hres");
  if (r) r.innerHTML = resultsHtml(state.data, v);
}

function onInput(e) {
  const t = e.target;
  if (t.id === "hq") return setHomeQuery(t.value.trim());
  if (t.id === "q") {
    state.q = t.value.trim();
    renderMatrixOnly();
    return;
  }
  if (t.id === "n" && current?.fine) {
    state.count = clampCount(t.value);
    const tot = $("tot");
    if (tot) tot.textContent = totalText(current.fine, state.count);
  }
}

async function start() {
  try {
    state.data = await load();
  } catch (err) {
    $("main").innerHTML = `<p class="empty">자료를 불러오지 못했습니다 (${esc(err.message)}). 폴더에서 <code>py -m http.server 8080</code> 으로 연 뒤 http://localhost:8080 에서 열어 주세요.</p>`;
    return;
  }
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);
  document.addEventListener("input", onInput);
  window.addEventListener("hashchange", route);
  route();
}

start();
