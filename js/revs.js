import { esc } from "./html.js";

const TAG = { stale: "시행 중 변경 · 검토 필요", pending: "시행 예정" };

function entryHtml(id, e) {
  const lines = (e.lines ?? []).map((l) => `<li>${esc(l)}</li>`).join("");
  const open = e.branch
    ? `<button type="button" class="lnk" data-art="${esc(id)}">이 조문 카드 열기</button>`
    : '<p class="hint">이 조문은 카드가 아니라 표(벌칙·교육·건강진단 등)의 근거입니다.</p>';
  return `<article class="rev"><h4>${esc(e.law)} ${esc(e.jo)} ${esc(e.title ?? "")} <span class="pk ${e.state === "stale" ? "pk-x" : "pk-w"}">${TAG[e.state] ?? ""}</span></h4><p class="hint">${esc(e.header)}</p><ul>${lines}</ul>${open}</article>`;
}

// 법 개정 반영: result of the weekly law watch (data/lawwatch.json, written by tools/law_watch.py).
export function renderRevs(data) {
  const w = data?.lawwatch;
  if (!w || !w.entries) return '<p class="empty">개정 감시 자료가 없습니다.</p>';
  const all = Object.entries(w.entries);
  const stale = all.filter(([, e]) => e.state === "stale");
  const pending = all.filter(([, e]) => e.state === "pending");
  const failed = (w.errors ?? []).length;
  let h = `<p class="sub">점검일 ${esc(w.checked_at)} · 조문 ${Number(w.checked) || 0}개를 law.go.kr 원문과 대조 · 시행 중 변경 ${stale.length}건 · 시행 예정 ${pending.length}건${failed ? ` · 조회 실패 ${failed}건` : ""}</p>`;
  const block = (title, list, none) =>
    `<section class="agrp"><h3>${title} <small>${list.length}</small></h3>${list.length ? `<div class="revs">${list.map(([id, e]) => entryHtml(id, e)).join("")}</div>` : `<p class="hint">${none}</p>`}</section>`;
  h += block("시행 중인 원문이 바뀐 조문", stale, "없습니다. 핸드북의 원문은 현재 시행본과 같습니다.");
  h += block("공포되었지만 아직 시행 전인 개정", pending, "핸드북에 실린 조문 중에는 없습니다.");
  const laws = (w.laws ?? [])
    .map((x) => `<li>${esc(x.law)} — ${esc(x.header)}${x.new ? ' <span class="pk pk-x">새 공포본 · 별표 재확인 필요</span>' : ""}</li>`)
    .join("");
  h += `<section class="agrp"><h3>법령별 최신 공포본</h3><ul class="li rvl">${laws}</ul><p class="hint">매주 월요일 자동 점검합니다. 원문이 바뀐 조문은 자동으로 고치지 않고 표시만 하며, 요약은 사람이 원문을 확인한 뒤 고칩니다.</p></section>`;
  return h;
}
