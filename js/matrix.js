import { hit } from "./core.js";
import { esc, icon } from "./html.js";

const c = (t, k) => ({ t, k });
const W_COLS = ["채용 시 교육", "정기교육", "작업내용 변경 시", "특별교육", "기초교육 (건설)"];
const H_COLS = ["일반건강진단", "특수건강진단", "배치 전", "수시", "임시"];
const H_KEYS = ["h1", "h2", "h3", "h4", "h5"];
const M_COLS = ["직무교육", "정기교육", "채용 시·변경 시", "특별교육", "선임 기준"];
const HEAD = { W: "근로자 유형", H: "근로자 유형", F: "체류자격", T: "특별교육 대상 작업", M: "직책", R: "직책", P: "위반", V: "조항" };
const INFO_KINDS = new Set(["W", "H", "F", "M", "R"]);

export const T_COLS = ["일용·1주 이하", "그 밖의 근로자", "미실시 시 (1명당)"];
export const P_COLS = ["구분", "1차", "2차", "3차 이상"];
export const F_COLS = ["건설업 취업", "필요 절차", "안전교육"];
export const V_COLS = ["내용", "위반 시"];
export { W_COLS, H_COLS, M_COLS };

// Health-checkup cell rule per worker type (legacy hcell).
export function hcell(worker, key) {
  const id = worker?.id;
  if (key === "h1") {
    if (id === "off") return c("2년 1회", "y");
    if (["reg", "sale", "fl", "sup"].includes(id)) return c("1년 1회", "y");
    if (id === "sp") return c("해당 없음 확인", "q");
    return c("확인", "q");
  }
  if (id === "sp") return c("확인", "q");
  return c("유해업무 시", "p");
}

export function taskHours(id) {
  return id === "39" ? "8시간" : "2시간";
}

const UNK = (n) => Array.from({ length: n }, () => c("확인", "q"));
const unk = (r) => r?.status === "미확인";
const fm = (v) => (typeof v === "number" ? `${v.toLocaleString("ko-KR")}만원` : v);

function groupedWorkers(data, cellsOf) {
  const rows = [];
  let last = null;
  for (const w of data.workers ?? []) {
    if (w.group !== last) {
      rows.push({ g: w.group });
      last = w.group;
    }
    rows.push({ id: w.id, n: w.n, s: w.s ?? "", i: w.i, cells: cellsOf(w) });
  }
  return rows;
}

export function buildMatrix(kind, data) {
  switch (kind) {
    case "W":
      return { cols: W_COLS, rows: groupedWorkers(data, (w) => (Array.isArray(w.cells) ? w.cells : [])) };
    case "H":
      return { cols: H_COLS, rows: groupedWorkers(data, (w) => H_KEYS.map((k) => hcell(w, k))) };
    case "F":
      return {
        cols: F_COLS,
        rows: (data.foreign ?? []).map((r) => ({ id: r.id, n: r.n, s: r.s ?? "", i: r.i, cells: [r.c, r.pr, r.ed] })),
      };
    case "T":
      return {
        cols: T_COLS,
        rows: (data.tasks ?? []).map((r) => ({
          id: r.id,
          n: `${r.id}. ${r.name}`,
          s: "",
          i: "edu_special",
          cells: unk(r) ? UNK(3) : [c(taskHours(r.id), "y"), c("16시간", "y"), c("50/100/150만원", "x")],
        })),
      };
    case "M": {
      const grid = data.meta?.manager_grid ?? {};
      return {
        cols: M_COLS,
        rows: (data.roles ?? []).map((r) => ({
          id: r.id,
          n: r.n,
          s: r.s ?? "",
          i: r.i,
          cells: unk(r) ? UNK(5) : (grid[r.id] ?? []).map((t, i) => c(t, t === "—" ? "n" : t === "확인" ? "q" : i === 4 ? "p" : "y")),
        })),
      };
    }
    case "R":
      return {
        cols: data.meta?.duties ?? [],
        rows: (data.roles ?? []).map((r) => ({
          id: r.id,
          n: r.n,
          s: r.s ?? "",
          i: r.i,
          cells: unk(r) ? UNK((r.m ?? []).length || 9) : (r.m ?? []).map((k) => c(k === "y" ? "●" : k === "p" ? "○" : k === "q" ? "?" : "·", k)),
        })),
      };
    case "P": {
      const sorted = [...(data.penalties ?? [])].sort((a, b) => b.max - a.max);
      return {
        cols: P_COLS,
        rows: sorted.map((p) => {
          const crim = p.k === "형사";
          const a = p.a ?? [];
          const cell = (v, ok) => (v === "" || v == null ? c("—", "n") : c(fm(v), ok));
          return {
            id: p.id,
            n: p.t,
            s: (p.art ?? "") + (p.from_short ? ` · ${p.from_short}` : ""),
            i: crim ? "doc_alarm" : "doc_fine",
            cells: unk(p) ? UNK(4) : [c(p.k, crim ? "x" : "p"), cell(a[0], crim ? "x" : "y"), cell(a[1], "y"), cell(a[2], "y")],
          };
        }),
      };
    }
    case "V":
      return {
        cols: V_COLS,
        rows: (data.env ?? []).map((v) => ({
          id: v.id,
          n: `${v.clause} ${v.name}`,
          s: "",
          i: "measure_env",
          cells: unk(v) ? UNK(2) : [c(v.content, "p long"), c(v.penalty, "x long")],
        })),
      };
    default:
      return { cols: [], rows: [] };
  }
}

export function filterRows(rows, query) {
  const out = [];
  let pending = null;
  for (const r of rows) {
    if (r.g) {
      pending = r;
      continue;
    }
    if (!hit(r.n + r.s, query)) continue;
    if (pending) {
      out.push(pending);
      pending = null;
    }
    out.push(r);
  }
  return out;
}

function legend() {
  const o = [
    ["y", "필수·해당", "var(--navy)"],
    ["p", "조건부·다른 주체", "var(--sky-soft)"],
    ["q", "원문 확인 필요", "var(--q-bg)"],
    ["n", "해당 없음", "var(--na)"],
    ["x", "금지·미확인·벌칙", "var(--warn-bg)"],
  ];
  return (
    o.map((a) => `<span class="lg"><i class="sw" style="background:${a[2]}"></i>${a[1]}</span>`).join("") +
    '<span class="lg">칸을 누르면 그 칸의 내용만 열립니다</span>'
  );
}

const KINDS = new Set(Object.keys(HEAD));

export function renderMatrix(kind, data, query = "") {
  if (!KINDS.has(kind)) return "";
  const m = buildMatrix(kind, data);
  const rows = filterRows(m.rows, query);
  const body = rows.filter((r) => !r.g).length;
  let h = `<div class="legend">${legend()}</div><div class="tw"><table><thead><tr><th scope="col">${esc(HEAD[kind])}</th>`;
  h += m.cols.map((x) => `<th scope="col">${esc(x)}</th>`).join("") + "</tr></thead><tbody>";
  for (const r of rows) {
    if (r.g) {
      h += `<tr class="grp"><td colspan="${m.cols.length + 1}">${esc(r.g)}</td></tr>`;
      continue;
    }
    const info = INFO_KINDS.has(kind)
      ? `<button type="button" class="info" data-info="${esc(kind)}|${esc(r.id)}" aria-label="${esc(r.n)} 정의">ⓘ</button>`
      : "";
    h += `<tr><td><div class="nm">${icon(r.i)}<span>${esc(r.n)}${r.s ? `<small>${esc(r.s)}</small>` : ""}</span>${info}</div></td>`;
    h += r.cells
      .map(
        (cl, ci) =>
          `<td data-l="${esc(m.cols[ci] ?? "")}"><button type="button" class="c ${esc(cl.k)}" data-cell="${esc(kind)}|${esc(r.id)}|${ci}">${esc(cl.t)}</button></td>`,
      )
      .join("");
    h += "</tr>";
  }
  h += "</tbody></table>" + (body ? "" : '<p class="empty">검색 결과가 없습니다.</p>') + "</div>";
  return h;
}
