import { hit } from "./core.js";
import { esc, icon } from "./html.js";
import { breadcrumbs } from "./tree.js";

// "I want to ..." shortcuts: node ids that exist in data/nodes.json.
export const INTENTS = [
  { id: "p.risk", t: "위험성평가는 어떻게?" },
  { id: "d.edu", t: "교육 시간·내용" },
  { id: "d.edu.w.t", t: "특별교육 39개 작업" },
  { id: "d.hea.w", t: "건강진단" },
  { id: "d.hea.msds", t: "MSDS·경고표지" },
  { id: "g.pen", t: "과태료·벌칙" },
  { id: "d.tech.tbl", t: "별표·점검표" },
  { id: "d.emg", t: "사고가 났을 때" },
];

export const CHIPS = ["추락", "비계", "굴착", "크레인", "밀폐공간", "화재", "감전", "안전난간", "보호구", "작업계획서"];

const unverified = (r) => r?.status === "미확인";

// Rank 0: article number/title, 1: requirement bullets, 2: verbatim text. Unverified cards match on title only.
export function searchAll(data, query, limit = 40) {
  const q = String(query ?? "").trim();
  if (!q) return { total: 0, items: [] };
  const nodes = data?.nodes ?? {};
  const found = [];
  for (const r of data?.articles ?? []) {
    const head = `${r.jo} ${r.title}`;
    let rank = -1;
    if (hit(head, q)) rank = 0;
    else if (!unverified(r) && hit((r.must ?? []).join(" "), q)) rank = 1;
    else if (!unverified(r) && hit(r.text, q)) rank = 2;
    if (rank >= 0) found.push({ rank, kind: "art", id: r.id, jo: r.jo, title: r.title, gist: unverified(r) ? "" : (r.must?.[0] ?? ""), branch: r.branch });
  }
  for (const [id, n] of Object.entries(nodes)) {
    if (id !== "home" && hit(`${n.t} ${n.s ?? ""}`, q)) found.push({ rank: 0, kind: "node", id, title: n.t, gist: n.s ?? "", branch: id });
  }
  found.sort((a, b) => a.rank - b.rank || (a.kind === b.kind ? 0 : a.kind === "node" ? -1 : 1));
  return { total: found.length, items: found.slice(0, limit) };
}

function whereOf(data, branch) {
  try {
    return breadcrumbs(branch, data.nodes).map((b) => b.title).join(" › ");
  } catch {
    return "";
  }
}

export function resultsHtml(data, query) {
  const q = String(query ?? "").trim();
  if (!q) return "";
  const { total, items } = searchAll(data, q);
  if (!total) return '<p class="empty">검색 결과가 없습니다. 다른 낱말이나 초성(예: ㅊㄹ)으로 찾아 보세요.</p>';
  const rows = items
    .map((x) => {
      const attr = x.kind === "art" ? `data-art="${esc(x.id)}"` : `data-go="${esc(x.id)}"`;
      const label = x.kind === "art" ? `${x.jo} ${x.title}` : `${x.title} (가지)`;
      return `<button type="button" class="hres" ${attr}><span class="hj">${esc(x.kind === "art" ? x.jo : "가지")}</span><span class="ht">${esc(x.title)}</span><span class="hg">${esc(x.gist)}</span><span class="hw">${esc(whereOf(data, x.branch))}</span><span class="sr-only">${esc(label)}</span></button>`;
    })
    .join("");
  const more = total > items.length ? `<p class="hint">${total}건 중 ${items.length}건을 보여 드립니다. 낱말을 더 구체적으로 적어 보세요.</p>` : `<p class="hint">${total}건</p>`;
  return `<div class="hlist" role="list">${rows}</div>${more}`;
}

export function homeTopHtml(data, query = "") {
  const nodes = data.nodes;
  const cards = (data.articles ?? []).length;
  const intents = INTENTS.filter((x) => nodes[x.id])
    .map((x) => `<button type="button" class="tile" data-go="${esc(x.id)}">${icon(nodes[x.id].i, 40)}<span>${esc(x.t)}</span></button>`)
    .join("");
  const chips = CHIPS.map((c) => `<button type="button" class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join("");
  return (
    `<section class="hhero"><h2>오늘 무엇이 필요하세요?</h2>` +
    `<p class="sub">조문 ${cards}개를 한 번에 찾습니다. 낱말이나 초성으로 검색하세요.</p>` +
    `<label class="hsearch"><span class="sr-only">전체 검색</span><input id="hq" type="search" placeholder="예: 추락, 비계, 밀폐공간, ㅊㄹ" autocomplete="off" value="${esc(query)}"></label>` +
    `<div class="chips" role="group" aria-label="자주 찾는 낱말">${chips}</div>` +
    `<div id="hres" aria-live="polite">${resultsHtml(data, query)}</div></section>` +
    `<section class="hsec"><h3>바로 가기</h3><div class="tiles">${intents}</div></section>` +
    `<section class="hsec"><h3>전체 구조 (계획→실행→점검→개선)</h3></section>`
  );
}
