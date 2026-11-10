import { hit } from "./core.js";
import { esc } from "./html.js";

const SRC_URL = "https://www.law.go.kr/LSW/lsLinkProc.do?lsClsCd=L&mode=11&lsNm=%EC%82%B0%EC%97%85%EC%95%88%EC%A0%84%EB%B3%B4%EA%B1%B4%EA%B8%B0%EC%A4%80%EC%97%90%20%EA%B4%80%ED%95%9C%20%EA%B7%9C%EC%B9%99";

export const annexList = (data) => data?.annexes ?? [];

const head = (r) => `${r.no}. ${r.name}`;
// Verbatim cell text joined for the summary column (clamped to two lines by CSS).
const brief = (r) => (r.parts ?? []).flatMap((p) => p.items).join(" · ");

export function renderAnnex(data, query = "") {
  const all = annexList(data);
  if (!all.length) return '<p class="empty">준비 중 — 이 가지의 별표는 아직 없습니다.</p>';
  const rows = all.filter((r) => hit(`${r.annex} ${r.annex_title} ${head(r)} ${brief(r)}`, query));
  if (!rows.length) return '<p class="empty">검색 결과가 없습니다.</p>';
  const groups = [];
  for (const r of rows) {
    let g = groups.find((x) => x.key === r.annex);
    if (!g) groups.push((g = { key: r.annex, title: r.annex_title, basis: r.basis, items: [] }));
    g.items.push(r);
  }
  const nav = `<nav class="gjump" aria-label="별표 바로가기">${groups.map((g, i) => `<button type="button" class="chip" data-jump="ax-${i}">${esc(g.key)} <small>${g.items.length}</small></button>`).join("")}</nav>`;
  return nav + groups
    .map(
      (g, i) =>
        `<section class="agrp" id="ax-${i}"><h3>${esc(g.key)} ${esc(g.title)} <small>${esc(g.basis)} 관련 · ${g.items.length}</small></h3>` +
        `<div class="stable" role="table" aria-label="${esc(g.key)}"><div class="shead a3" role="row"><span>번호</span><span>작업·구분</span><span>내용 (원문 항목)</span></div>` +
        g.items
          .map(
            (r) =>
              `<button type="button" class="srow a3" role="row" data-annex="${esc(r.id)}" aria-label="${esc(r.annex)} ${esc(head(r))} 상세 열기"><b class="sj">${esc(r.no)}</b><span class="stt"><span>${esc(r.name)}</span>${r.group || r.section ? `<small class="mut">${esc(r.group ?? r.section)}</small>` : ""}</span><span class="sg">${esc(brief(r))}</span></button>`,
          )
          .join("") +
        "</div></section>",
    )
    .join("");
}

export function annexDetail(id, data) {
  const r = annexList(data).find((x) => x.id === id);
  if (!r) return { title: "상세 정보", sections: [], status: "미확인" };
  const s = r.source ?? {};
  const sections = (r.parts ?? []).map((p) => ({ label: p.label, items: p.items }));
  sections.push({
    label: "출처",
    text: `산업안전보건기준에 관한 규칙 ${r.annex}(${r.annex_title}) · 시행 ${s.effective} · 확인 ${s.verified_at}. 표의 한 행을 항목별로 나눠 옮겼고 문구는 원문 그대로입니다.`,
    link: { href: s.url ?? SRC_URL, text: "law.go.kr에서 보기" },
  });
  return {
    share: true,
    title: `${r.annex} ${head(r)}`,
    sub: `${r.annex_title} (${r.basis} 관련)${r.ref ? ` · ${r.ref}` : ""}`,
    law: [`산업안전보건기준에 관한 규칙 ${r.annex}`],
    status: r.status,
    sections,
  };
}
