import { clampCount, fineTotal } from "./core.js";
import { esc, icon } from "./html.js";

const LABELS = {
  pending: "시행 예정",
  rule: "이 유형에 적용되는 기준 (원문)",
  contents: "교육 내용",
  alloc: "항목별 시간 배분 예시",
  who: "누가 가르치나",
  proof: "증빙 서류 (실무 예시, 법령상 서식 미확인)",
  na: "해당 여부",
  tg: "누가 받나",
  cy: "시기·주기",
  it: "검사 항목·세부",
  cyc: "별표 23 시기·주기 (원문)",
  org: "실시 기관",
  after: "결과 후 사업주가 할 일 (법 제132조)",
  fine: "위반 시",
  content: "내용",
  body: "상세",
  apt: "선임 기준",
  duty: "원문에서 이 업무에 해당하는 일",
  mean: "의미",
  basis: "근거",
  target: "대상",
  state: "확인 상태",
  obligation: "도급인의 의무",
  summary: "요약",
  def: "누구인가",
  pills: "14개 직종 (시행령 제67조)",
  resp: "책임 주체",
};

const LAW_URL = /^https:\/\/www\.law\.go\.kr\//;
const ALLOC_HINT = "법령은 총 시간만 정합니다. 아래는 총 시간을 항목 수로 나눈 편성 예시일 뿐 법적 기준이 아닙니다.";

const finite = (v) => typeof v === "number" && Number.isFinite(v);
const man = (n) => `${n.toLocaleString("ko-KR")}만원`;

export function badge(status) {
  if (status === "확인") return '<span class="st ok">원문 확인</span>';
  if (status === "일부 확인") return '<span class="st part">일부 확인</span>';
  return '<span class="st no">미확인</span>';
}

function list(items) {
  return `<ul class="li">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
}

function pills(items) {
  return `<div class="pills">${items.map((x) => `<span class="pill">${esc(x)}</span>`).join("")}</div>`;
}

function table(t) {
  const head = (t.head ?? []).map((x) => `<th scope="col">${esc(x)}</th>`).join("");
  const rows = (t.rows ?? []).map((r) => `<tr>${r.map((x) => `<td>${esc(x)}</td>`).join("")}</tr>`).join("");
  return `<div class="tw tw-in"><table class="mini"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function box(label, inner) {
  return `<div class="box"><b class="k">${esc(label)}</b>${inner}</div>`;
}

function sectionHtml(s) {
  const label = s.label ?? LABELS[s.key] ?? s.key;
  const hasItems = Array.isArray(s.items) && s.items.length > 0;
  let inner = "";
  if (s.key === "alloc" && hasItems) {
    return `<details class="ex"><summary>${esc(label)}</summary><div class="hint">${esc(s.hint ?? ALLOC_HINT)}</div>${list(s.items)}</details>`;
  }
  if (s.key === "fine" && s.text) inner += `<div class="fine">${esc(s.text)}</div>`;
  else if (s.text) inner += `<div>${esc(s.text)}</div>`;
  if (hasItems) inner += list(s.items);
  if (s.hint) inner += `<div class="hint">${esc(s.hint)}</div>`;
  if (Array.isArray(s.pills) && s.pills.length) inner += pills(s.pills);
  if (s.table) inner += table(s.table);
  if (Array.isArray(s.lines) && s.lines.length) inner += `<div class="orig">${s.lines.map((x) => `<p>${esc(x)}</p>`).join("")}</div>`;
  if (s.link && LAW_URL.test(String(s.link.href ?? ""))) {
    inner += `<a class="ext" href="${esc(s.link.href)}" target="_blank" rel="noopener noreferrer">${esc(s.link.text ?? "원문 보기")}</a>`;
  }
  if (s.go && /^[a-z0-9.]+$/.test(String(s.go.id ?? ""))) {
    inner += `<button type="button" class="lnk" data-go="${esc(s.go.id)}">${esc(s.go.text)}</button>`;
  }
  if (!inner) return "";
  if (s.collapse) return `<details class="ex"${s.collapse === "open" ? " open" : ""}><summary>${esc(label)}</summary>${inner}</details>`;
  return box(label, inner);
}

export function totalText(fine, count) {
  const n = clampCount(count);
  const per = Array.isArray(fine?.perPerson) ? fine.perPerson : [];
  const vals = per.map((v, j) => [j, v]).filter(([, v]) => finite(v));
  if (!vals.length) return "";
  if (fine.pick !== undefined || vals.length === 1) {
    const v = fine.pick !== undefined ? per[fine.pick] : vals[0][1];
    return finite(v) ? `합계 ${man(fineTotal(v, n))}` : "";
  }
  return vals.map(([j, v]) => `${j + 1}차 ${man(fineTotal(v, n))}`).join(" · ");
}

function fineHtml(fine, count) {
  const per = Array.isArray(fine?.perPerson) ? fine.perPerson : [];
  if (!per.some(finite)) return "";
  const shown = fine.pick !== undefined ? [per[fine.pick]].filter(finite) : per.filter(finite);
  const unit = fine.unit ? `${esc(fine.unit)}당` : "1명당";
  const n = clampCount(count);
  return box(
    "위반 시 과태료",
    `<div class="g"><div class="fine">근로자 ${unit} ${shown.map((v) => esc(v)).join(" / ")}만원${shown.length > 1 ? " (1·2·3차)" : ""}</div>` +
      `<div class="calc"><label for="n">해당 근로자 수</label><input id="n" type="number" inputmode="numeric" min="1" max="9999" value="${n}"> ` +
      `<span id="tot" class="tot" aria-live="polite">${esc(totalText(fine, n))}</span></div></div>`,
  );
}

function lawList(law) {
  if (Array.isArray(law)) return law;
  return law ? [law] : [];
}

export function detailToHtml(detail, opts = {}) {
  const d = detail ?? {};
  const laws = lawList(d.law);
  let h = `<div class="sh"><div class="t">${d.icon ? icon(d.icon, 52) : ""}<div><h2 id="sheet-title">${esc(d.title)}</h2>${d.sub ? `<span class="law">${esc(d.sub)}</span>` : ""}</div></div>`;
  h += '<button type="button" class="x" data-close="1">닫기</button></div><div class="g">';
  if (d.big !== undefined && d.big !== "") {
    h += `<div class="box"><b class="k">${esc(d.bigLabel ?? "이 칸")}</b><div class="big">${esc(d.big)}</div></div>`;
  }
  if (d.warn) h += `<div class="warnbox" role="note"><b>${esc(d.warn)}</b></div>`;
  for (const s of d.sections ?? []) h += sectionHtml(s);
  if (d.fine) h += fineHtml(d.fine, opts.count);
  if (d.tip) h += `<div class="tip"><b>현장 체크포인트</b><br>${esc(d.tip)}</div>`;
  h += `<div class="law">${laws.length ? `근거: ${laws.map(esc).join(" · ")} &nbsp;` : ""}${badge(d.status)}</div></div>`;
  return h;
}
