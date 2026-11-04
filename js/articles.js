import { hit } from "./core.js";
import { esc } from "./html.js";

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
    : `<span class="cm">${esc(r.must?.[0] ?? "")}</span>`;
  return `<button type="button" class="card" data-art="${esc(r.id)}" aria-label="${esc(label)} 상세 열기"><b>${esc(r.jo)}</b><span class="ct">${esc(r.title)}</span>${body}</button>`;
}

export function renderArticles(branch, data, query = "") {
  const all = articlesFor(data, branch);
  if (!all.length) return '<p class="empty">준비 중 — 이 가지의 조문 카드는 아직 없습니다.</p>';
  const rows = filterArticles(all, query);
  if (!rows.length) return '<p class="empty">검색 결과가 없습니다.</p>';
  return groupArticles(rows)
    .map((g) => `<section class="agrp"><h3>${esc(g.group)}</h3><div class="cards">${g.items.map(cardHtml).join("")}</div></section>`)
    .join("");
}

function fineText(p) {
  const f = p?.fines?.[0];
  if (typeof f === "number") return `${f.toLocaleString("ko-KR")}만원`;
  return f ? String(f) : "";
}

function penaltySection(r, data) {
  const items = [];
  for (const id of r.penalty_ids ?? []) {
    const p = (data.penalties ?? []).find((x) => x.id === id);
    if (!p || p.status === "미확인") continue;
    const fine = fineText(p);
    items.push(fine ? `${p.name ?? p.t} — ${fine}` : `${p.name ?? p.t}`);
  }
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
