import { esc } from "./html.js";

const LABEL = (id) => {
  const m = String(id).match(/^(법|령|규칙|중처)(\d+)$/);
  return m ? `${m[1] === "중처" ? "중처법" : m[1]} 제${m[2]}조` : String(id);
};

// 법 개정 감시 결과 (data/versions.json): which watched articles will change, and which are identical to the latest text.
export function renderRevs(data) {
  const v = data?.versions;
  const entries = v?.entries && typeof v.entries === "object" ? Object.entries(v.entries) : [];
  if (!entries.length) return '<p class="empty">개정 감시 자료가 없습니다.</p>';
  const changed = entries.filter(([, e]) => e.differs === true);
  const same = entries.filter(([, e]) => e.differs !== true);
  let h = `<p class="sub">확인일 ${esc(v.checked_at)} · 감시 대상 ${entries.length}개 조문 중 시행 예정 개정이 있는 것 ${changed.length}개</p>`;
  if (changed.length) {
    h += '<section class="agrp"><h3>시행 예정 개정이 있는 조문</h3><div class="revs">';
    for (const [id, e] of changed) {
      const lines = (e.diff_lines ?? []).map((l) => `<li>${esc(l)}</li>`).join("");
      h += `<article class="rev"><h4>${esc(LABEL(id))} <span class="pk pk-x">시행 ${esc(e.latest_effective)}</span></h4><p class="hint">${esc(e.latest_header)}</p><ul>${lines}</ul></article>`;
    }
    h += "</div></section>";
  }
  h += `<section class="agrp"><h3>현행과 같은 조문 <small>${same.length}</small></h3><p class="rvlist">${same.map(([id]) => `<span class="chip">${esc(LABEL(id))}</span>`).join(" ")}</p></section>`;
  return h;
}
