import { hit } from "./core.js";
import { esc, bookImg } from "./html.js";

const WARN = "원문을 아직 확인하지 못했습니다. 숫자와 기준은 표시하지 않습니다. law.go.kr에서 직접 확인하세요.";
const LAW_URL = /^https:\/\/www\.law\.go\.kr\//;
const today = () => new Date().toISOString().slice(0, 10);

const unverified = (r) => r?.status === "미확인";

export function articlesFor(data, branch) {
  return (data?.articles ?? []).filter((r) => r.branch === branch);
}

export function filterArticles(list, query) {
  return list.filter((r) => hit([r.jo, r.title, ...(r.must ?? [])].join(" "), query));
}

export function groupArticles(list) {
  const out = [];
  for (const r of list) {
    let g = out.find((x) => x.group === r.group);
    if (!g) out.push((g = { group: r.group, items: [] }));
    g.items.push(r);
  }
  return out;
}

// Display-only split of the verbatim text at clause markers (① , 1. , 가. ); lines rejoin with " " to the original.
export function splitClauses(text) {
  return String(text ?? "").split(/ (?=[①-⑳]|\d{1,2}\. |[가-하]\. )/);
}

function cardHtml(r) {
  const label = `${r.jo} ${r.title}`;
  const body = unverified(r)
    ? '<span class="cm warn">원문 미확인</span>'
    : `<span class="cm">${esc(r.gist ?? r.must?.[0] ?? "")}</span>`;
  return `<button type="button" class="card" data-art="${esc(r.id)}" aria-label="${esc(label)} 상세 열기"><b>${esc(r.jo)}</b><span class="ct">${esc(r.title)}</span>${body}</button>`;
}

const fmtMan = (n) => `${n.toLocaleString("ko-KR")}만원`;
const penNums = (p) => (p.a ?? []).filter((x) => typeof x === "number");

// One-line fine for the summary column: 형사 = first sentence of the record, 과태료 = range over 1~3차.
export function penBrief(p) {
  if (p.k === "과태료") {
    const n = penNums(p);
    if (!n.length) return "";
    const lo = Math.min(...n);
    const hi = Math.max(...n);
    return lo === hi ? fmtMan(hi) : `${lo.toLocaleString("ko-KR")}~${fmtMan(hi)}`;
  }
  return String(p.fines?.[0] ?? p.a?.[0] ?? "");
}

// Full fine for the detail sheet: 형사 = every sentence, 과태료 = 1차·2차·3차.
export function penFull(p) {
  if (p.k === "과태료") {
    const n = penNums(p);
    if (!n.length) return "";
    return new Set(n).size === 1 ? fmtMan(n[0]) : `1차 ${n[0]} · 2차 ${n[1]} · 3차 ${n[2]}만원`;
  }
  return (p.fines ?? []).filter(Boolean).join(" / ");
}

const penTag = (p) => (/^사망/.test(p.t ?? "") ? "사망 시" : p.k === "과태료" ? "과태료" : "형사");

// Verified penalty records linked to a card (unverified or missing ones are left out).
export function penaltiesOf(r, data) {
  const out = [];
  for (const id of r.penalty_ids ?? []) {
    const p = (data.penalties ?? []).find((x) => x.id === id);
    if (p && p.status !== "미확인") out.push(p);
  }
  return out;
}

function rowHtml(r, data, figs) {
  const label = `${r.jo} ${r.title}`;
  const gist = unverified(r) ? '<span class="warn">원문 미확인</span>' : esc(r.gist ?? r.must?.[0] ?? "");
  const who = unverified(r) || !r.who ? "—" : esc(r.who);
  const pens = unverified(r) ? [] : penaltiesOf(r, data);
  const pen = pens.length
    ? pens.map((p) => `<span class="pl"><i class="pk pk-${p.k === "과태료" ? "c" : "x"}">${penTag(p)}</i>${esc(penBrief(p))}</span>`).join("")
    : '<span class="none" title="이 조문과 직접 연결된 벌칙은 수집한 원문에서 확인되지 않았습니다">—</span>';
  const fig = figs?.get(r.id);
  const thumb = fig ? bookImg(fig.file, fig.w, fig.h, "").replace("<img ", '<img class="sth" ') : "";
  return `<button type="button" class="srow" role="row" data-art="${esc(r.id)}" aria-label="${esc(label)} 상세 열기"><b class="sj">${esc(r.jo)}</b><span class="stt">${thumb}<span>${esc(r.title)}</span></span><span class="sg">${gist}</span><span class="swho">${who}</span><span class="sp">${pen}</span></button>`;
}

const TABLE_HEAD = '<div class="shead" role="row"><span>조문</span><span>제목</span><span>핵심</span><span>누가</span><span>위반 시</span></div>';

// mode "table" (default): summary table, a row opens the detail sheet; mode "cards": the older card grid.
export function renderArticles(branch, data, query = "", mode = "table") {
  const all = articlesFor(data, branch);
  if (!all.length) return '<p class="empty">준비 중 — 이 가지의 조문 카드는 아직 없습니다.</p>';
  const rows = filterArticles(all, query);
  if (!rows.length) return '<p class="empty">검색 결과가 없습니다.</p>';
  if (mode === "cards") {
    return groupArticles(rows)
      .map((g) => `<section class="agrp"><h3>${esc(g.group)}</h3><div class="cards">${g.items.map(cardHtml).join("")}</div></section>`)
      .join("");
  }
  const figs = new Map();
  for (const m of data?.images ?? []) if (!figs.has(m.article)) figs.set(m.article, m);
  const groups = groupArticles(rows);
  const nav =
    groups.length >= 3
      ? `<nav class="gjump" aria-label="그룹 바로가기">${groups.map((g, i) => `<button type="button" class="chip" data-jump="grp-${i}">${esc(g.group)} <small>${g.items.length}</small></button>`).join("")}</nav>`
      : "";
  return nav + groups
    .map((g, i) => `<section class="agrp" id="grp-${i}"><h3>${esc(g.group)} <small>${g.items.length}</small></h3><div class="stable" role="table" aria-label="${esc(g.group)}">${TABLE_HEAD}${g.items.map((x) => rowHtml(x, data, figs)).join("")}</div></section>`)
    .join("");
}

function penaltySection(r, data) {
  const items = penaltiesOf(r, data).map((p) => {
    const fine = penFull(p);
    return `${penTag(p)} · ${p.name ?? p.t} — ${fine}${p.art ? ` (${p.art})` : ""}`;
  });
  const s = { label: "위반 시", go: { id: "g.pen", text: "벌칙·과태료 가지에서 전체 보기" } };
  if (items.length) s.items = items;
  else s.text = "이 조문과 직접 연결된 벌칙은 원문 자료에서 확인되지 않아 표시하지 않습니다.";
  return s;
}

export function articleDetail(id, data) {
  const r = (data?.articles ?? []).find((x) => x.id === id);
  if (!r) return { title: "상세 정보", sections: [], status: "미확인" };
  const base = { title: `${r.jo} ${r.title}`, sub: r.law, law: [`${r.law} ${r.jo}`], status: r.status };
  if (unverified(r)) {
    return { ...base, warn: WARN, sections: [{ label: "출처", text: `${r.law} ${r.jo}`, link: { href: r.source?.url, text: "law.go.kr에서 보기" } }] };
  }
  const s = r.source ?? {};
  const future = s.future_ack || (s.effective && s.effective > today());
  const src = { label: "출처", text: `${r.law} ${r.jo} · 시행 ${s.effective} · 공포 ${s.published} · 확인 ${s.verified_at}`, link: { href: s.url, text: "law.go.kr에서 보기" } };
  if (future) src.hint = `시행 예정: ${s.effective}부터 적용됩니다. 지금 현장에 적용되는 본이 아닐 수 있습니다.`;
  const sections = [{ label: "요건", items: r.must ?? [] }];
  const figs = (data.images ?? []).filter((m) => m.article === r.id);
  if (figs.length) {
    sections.push({
      label: "삽화 (책 그림)",
      collapse: "open",
      images: figs.map((m) => ({ file: m.file, w: m.w, h: m.h, alt: `${r.jo} ${r.title} 삽화`, cap: `${data.imagesMeta?.book ?? "책"} ${m.page}쪽` })),
      hint: data.imagesMeta?.note,
    });
  }
  if (r.who) sections.push({ label: "누가", text: r.who });
  sections.push({ label: "점검 포인트", items: r.check ?? [] });
  sections.push(
    (r.records ?? []).length
      ? { label: "필요한 기록", items: r.records }
      : { label: "필요한 기록", text: "이 조문 자체에는 따로 요구하는 기록이 없습니다." },
  );
  sections.push(penaltySection(r, data));
  sections.push({ label: "원문", collapse: "open", lines: splitClauses(r.text) });
  sections.push(src);
  return { ...base, sections };
}
