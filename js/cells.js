import { parseHours, alloc } from "./core.js";

function fallback(worker, edu) {
  return {
    title: `${worker?.name ?? ""} × ${edu?.name ?? "교육"}`,
    big: "확인",
    status: "미확인",
    sections: [],
    warn: "원문 확인 필요",
  };
}

export function workerCell(worker, eduByCol, col) {
  const edu = eduByCol?.[col];
  const cells = Array.isArray(worker?.cells) ? worker.cells : null;
  const cell = cells ? cells[col] : undefined;
  if (!edu || !cell) return fallback(worker, edu);
  const unverified = cell.k === "q" || worker.status === "미확인";
  const hours = unverified ? 0 : parseHours(cell.t);
  const sections = [];
  if (worker.rule && worker.rule.length) sections.push({ key: "rule", items: worker.rule });
  sections.push({ key: "contents", items: edu.contents });
  const a = alloc(hours, edu.contents);
  if (a.length) sections.push({ key: "alloc", items: a });
  sections.push({ key: "who", text: edu.who });
  const out = {
    title: `${worker.name} × ${edu.name}`,
    big: unverified ? "확인" : cell.t,
    status: worker.status,
    sections,
    fine: { perPerson: edu.fine, unit: edu.unit },
  };
  if (unverified) out.warn = "원문 확인 필요";
  return out;
}
