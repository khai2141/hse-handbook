import { parseHours, alloc } from "./core.js";
import { pendingFor } from "./versions.js";
import { hcell, taskHours, T_COLS, P_COLS, F_COLS, V_COLS, M_COLS } from "./matrix.js";

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

/* ---------- Task 5: remaining cell builders (same CellDetail shape) ---------- */
const WARN = "원문 확인 필요";
const unverified = (r) => r?.status === "미확인";
const fmMan = (v) => (typeof v === "number" ? `${v.toLocaleString("ko-KR")}만원` : v);

function neutral(title, icon) {
  const d = { title: title || "상세 정보", big: "확인", status: "미확인", sections: [], warn: WARN };
  if (icon) d.icon = icon;
  return d;
}

function lawOf(rec) {
  if (Array.isArray(rec?.law)) return rec.law;
  return typeof rec?.law === "string" && rec.law ? [rec.law] : [];
}

const PROOF_HEALTH = ["건강진단개인표 (또는 사본)", "건강진단 결과표·통보 기록", "근로자 설명·사후조치 기록", "3년 보존 (법 제164조①7)"];

export function healthCell(worker, rec, col, meta = {}) {
  if (!worker || !rec) return neutral(`${worker?.n ?? worker?.name ?? ""} × ${rec?.n ?? "건강진단"}`.trim());
  const title = `${worker.n ?? worker.name} × ${rec.n}`;
  if (unverified(rec)) return neutral(title, rec.i);
  const cell = hcell(worker, rec.id);
  const bad = cell.k === "q" || unverified(worker);
  const sections = [];
  if (cell.k === "q" && col === 0 && worker.id !== "off") {
    sections.push({
      key: "state",
      text: '일반건강진단은 "상시 사용하는 근로자"가 대상입니다 (법 제129조①). 이 유형이 상시 사용에 해당하는지는 계약 기간·근무 형태로 판단해야 하며 원문 확인이 필요합니다.',
    });
  }
  sections.push({ key: "tg", text: rec.tg });
  sections.push({ key: "cy", text: rec.cy });
  sections.push({ key: "it", items: rec.it ?? [] });
  if (Array.isArray(rec.by_hazard) && rec.by_hazard.length) {
    sections.push({
      key: "hazard",
      label: "유해인자별 검사항목",
      table: {
        head: ["유해인자", "제1차 검사항목", "제2차 검사항목"],
        rows: rec.by_hazard.map((e) => [e.hazard, e.items_1st.join(" / "), e.items_2nd.join(" / ")]),
      },
    });
  }
  if (rec.cyc && Array.isArray(meta.cycles)) {
    sections.push({ key: "cyc", table: { head: ["대상 유해인자", "첫 검진 시기", "주기"], rows: meta.cycles } });
  }
  sections.push({ key: "org", text: rec.org });
  if (Array.isArray(meta.health_after)) sections.push({ key: "after", items: meta.health_after });
  sections.push({ key: "proof", label: "증빙·서류", items: PROOF_HEALTH });
  if (rec.fine) sections.push({ key: "fine", text: rec.fine });
  const out = { title, icon: rec.i, big: bad ? "확인" : cell.t, status: rec.status, sections, law: lawOf(rec) };
  if (rec.note) out.tip = rec.note;
  if (bad) out.warn = WARN;
  return out;
}

export function foreignCell(visa, col, foreignEdu) {
  const cols = F_COLS;
  if (!visa || !cols[col]) return neutral(`${visa?.n ?? ""} × ${cols[col] ?? ""}`.trim(), visa?.i);
  const title = `${visa.n} × ${cols[col]}`;
  const cell = [visa.c, visa.pr, visa.ed][col];
  const bad = unverified(visa) || !cell || cell.k === "q" || cell.k === "x";
  const d = Array.isArray(visa.d) ? visa.d : [];
  let body;
  if (col === 0) body = d.slice(0, 1);
  else if (col === 1) body = d.slice(1);
  else body = unverified(visa) ? ["안전교육 내용은 원문을 확인하지 못했습니다."] : Array.isArray(foreignEdu) ? foreignEdu : [];
  if (!body.length) body = ["별도 절차는 이번 조회에서 확인하지 못했습니다."];
  const out = {
    title,
    icon: visa.i,
    big: bad ? "확인" : cell.t,
    status: visa.status,
    sections: [{ key: "body", label: cols[col], items: body }],
    tip: "체류자격과 취업 허용 범위는 법무부·고용노동부 자료로 확인하세요.",
  };
  if (visa.src) out.law = [visa.src];
  if (bad) out.warn = WARN;
  return out;
}

export function taskCell(task, col) {
  const label = T_COLS[col];
  if (!task || !label) return neutral(`${task?.id ?? ""}. ${task?.name ?? ""}`.trim(), "edu_special");
  const title = `${task.id}. ${task.name} × ${label}`;
  if (unverified(task)) return neutral(title, "edu_special");
  const sections = [];
  let big;
  let fine;
  if (col === 0) {
    big = taskHours(task.id);
    sections.push({
      key: "body",
      label,
      text: `${taskHours(task.id)} 이상. 일용근로자·계약기간 1주일 이하 기간제 근로자 (별표 4 라목 1·2). 같은 사업장 같은 업무로 1주일 안에 다시 일하면 이미 받은 특별교육은 면제 (비고 2).`,
    });
  } else if (col === 1) {
    big = "16시간";
    sections.push({
      key: "body",
      label,
      text: "16시간 이상. 최초 작업 종사 전 4시간 이상, 나머지 12시간은 3개월 이내 분할 가능. 단기·간헐 작업은 2시간 이상.",
    });
  } else {
    big = "50 / 100 / 150만원";
    sections.push({ key: "fine", label, text: "근로자 1명당 50 / 100 / 150만원 (1·2·3차). 법 제175조②1 (상한 3천만원)" });
    fine = { perPerson: [50, 100, 150], unit: "1명" };
  }
  if (Array.isArray(task.contents) && task.contents.length) {
    sections.push({ key: "contents", label: "교육내용 (별표 5 개별내용)", items: task.contents });
    sections.push({ key: "common", text: "공통내용은 별표 5 제1호 다목(채용 시 교육 및 작업내용 변경 시 교육)과 같습니다." });
  } else {
    sections.push({ key: "contents", text: "별표 5의 이 작업 항목에 있으며 아직 정리하지 않았습니다. 공통 내용은 채용 시 교육과 같습니다." });
  }
  sections.push({ key: "obligation", text: "관계수급인 근로자의 특별교육은 도급인이 실시 여부를 확인해야 합니다 (법 제64조①4)." });
  const out = {
    title, icon: "edu_special", big, status: task.status, sections,
    law: ["시행규칙 별표 4 라목", "별표 5 제1호 라목", "법 제29조③"],
  };
  if (fine) out.fine = fine;
  return out;
}

export function managerCell(role, col, grid) {
  const label = M_COLS[col];
  const v = grid?.[role?.id]?.[col];
  if (!role || !label || v === undefined) return neutral(`${role?.n ?? ""} × ${label ?? ""}`.trim(), role?.i);
  const title = `${role.n} × ${label}`;
  if (unverified(role) || v === "확인") return neutral(title, role.i);
  let body;
  if (col === 0) body = [role.edu, role.fine];
  else if (col === 4) body = [role.apt, role.law];
  else if (v === "—") body = ["이 직책에는 해당하지 않습니다."];
  else body = ["관리감독자 기준: 정기 연 16시간, 채용 시 8시간, 변경 시 2시간, 특별교육 16시간 (별표 4 제1호의2)"];
  return {
    title, icon: role.i, big: v, status: role.status,
    sections: [{ key: "body", items: body.filter(Boolean) }],
    law: lawOf(role),
  };
}

export function roleCell(role, col, duties, tags) {
  const label = duties?.[col];
  const mark = role?.m?.[col];
  if (!role || !label || mark === undefined) return neutral(`${role?.n ?? ""} × ${label ?? ""}`.trim(), role?.i);
  const title = `${role.n} × ${label}`;
  if (unverified(role) || mark === "q") return neutral(title, role.i);
  const tg = tags?.[role.id] ?? [];
  const items = (role.list ?? []).filter((_, i) => {
    const t = tg[i];
    return (Array.isArray(t) ? t : [t]).includes(col);
  });
  const sections = [
    items.length
      ? { key: "duty", items }
      : { key: "na", text: `이 직책의 원문 업무에 ${label} 항목이 없습니다 (또는 원문 확인 필요).` },
    { key: "apt", text: role.apt },
  ];
  if (role.fine) sections.push({ key: "fine", text: role.fine });
  return {
    title, icon: role.i, status: role.status, sections, law: lawOf(role),
    big: mark === "y" ? "●" : mark === "p" ? "○" : "·",
  };
}

export function penaltyCell(pen, col) {
  const label = P_COLS[col];
  if (!pen || !label) return neutral(`${pen?.t ?? ""} × ${label ?? ""}`.trim(), "doc_fine");
  const title = `${pen.t} × ${label}`;
  const icon = pen.k === "형사" ? "doc_alarm" : "doc_fine";
  if (unverified(pen)) return neutral(title, icon);
  const a = pen.a ?? [];
  const big = col === 0 ? pen.k : a[col - 1] === "" || a[col - 1] == null ? "—" : fmMan(a[col - 1]);
  const sections = [];
  if (pen.k === "과태료") {
    const ex =
      col === 0
        ? `이 위반은 ${pen.k}입니다.`
        : col === 1
          ? "처음 적발(최근 5년 내 같은 위반의 과태료 처분 없음) 때의 금액입니다."
          : col === 2
            ? "최근 5년 안에 같은 위반으로 과태료 처분을 받은 적이 1회 있을 때의 금액입니다."
            : "같은 위반으로 2회 이상 처분을 받은 뒤의 금액입니다.";
    sections.push({ key: "mean", text: `${ex} 단위는 ${pen.unit}입니다.${pen.from ? ` ${pen.from}` : ""}` });
  } else {
    sections.push({ key: "mean", text: "형사처벌입니다. 법원이 형량을 정합니다." });
  }
  sections.push({ key: "basis", text: pen.law });
  sections.push({ key: "target", text: pen.who });
  const out = { title, icon, big, status: pen.status, sections, law: pen.art ? [pen.art] : [] };
  if (pen.k === "과태료" && pen.unit === "1명" && a.every((v) => typeof v === "number")) {
    out.fine = { perPerson: [...a], unit: "1명", pick: Math.max(col - 1, 0) };
  }
  return out;
}

export function envCell(env, col) {
  const label = V_COLS[col];
  if (!env || !label) return neutral(`${env?.clause ?? ""} ${env?.name ?? ""}`.trim(), "measure_env");
  const title = `${env.clause} ${env.name}`;
  if (unverified(env)) return neutral(title, "measure_env");
  return {
    title,
    icon: "measure_env",
    big: env.clause,
    bigLabel: "조항",
    status: env.status,
    sections: [col === 0 ? { key: "content", text: env.content } : { key: "fine", text: env.penalty }],
    law: ["법 제125조", "제164조①6", "제171조", "제175조"],
  };
}

const find = (arr, id) => (Array.isArray(arr) ? arr.find((x) => x?.id === id) : undefined);
const EDU_BY_COL = ["e2", "e1", "e3", "e4", "e5"];

export function cellDetail(kind, rowId, col, data) {
  const out = baseCellDetail(kind, rowId, col, data);
  const p = pendingFor(out?.law, data?.versions);
  if (p.articles.length) {
    out.sections = [...(out.sections ?? []), {
      key: "pending",
      items: [`시행 예정 개정이 있습니다 (시행 ${p.effective ?? "일자 미상"})`, ...p.lines.slice(0, 6)],
    }];
  }
  return out;
}

function baseCellDetail(kind, rowId, col, data) {
  const d = data ?? {};
  const meta = d.meta ?? {};
  let out;
  switch (kind) {
    case "W": {
      const w = find(d.workers, rowId);
      if (!w) break;
      const eduByCol = EDU_BY_COL.map((id) => find(d.education, id));
      // 관리감독자 지위 근로자: 별표 5 제1호의2 has its own 교육내용 (record e8) for 채용 시/정기/변경 시/특별교육
      const sup = rowId === "sup" ? find(d.education, "e8") : null;
      if (sup) {
        const by = [sup.contents_hire, sup.contents, sup.contents_hire, sup.contents_special];
        by.forEach((c, i) => {
          if (Array.isArray(c) && c.length && eduByCol[i]) eduByCol[i] = { ...eduByCol[i], contents: c };
        });
      }
      const rule = Array.isArray(w.rule_by_col) ? w.rule_by_col[col] : undefined;
      out = workerCell({ ...w, rule }, eduByCol, col);
      out.icon = w.i;
      out.law = [...(eduByCol[col]?.law ?? []), ...(w.law ?? [])];
      if (!out.warn) {
        const who = out.sections.find((s) => s.key === "who");
        if (who && Array.isArray(meta.teach)) who.pills = meta.teach;
        if (Array.isArray(meta.proof)) out.sections.push({ key: "proof", items: meta.proof });
        if (w.tip) out.tip = w.tip;
      }
      out.bigLabel = "이 칸의 시간";
      if (out.warn) delete out.fine;
      return out;
    }
    case "H": {
      const w = find(d.workers, rowId);
      const rec = Array.isArray(d.health) ? d.health[col] : undefined;
      if (w && rec) out = healthCell(w, rec, col, meta);
      break;
    }
    case "F": {
      const v = find(d.foreign, rowId);
      if (v && col >= 0 && col < F_COLS.length) out = foreignCell(v, col, meta.foreign_edu);
      break;
    }
    case "T": {
      const t = find(d.tasks, rowId);
      if (t && col >= 0 && col < T_COLS.length) out = taskCell(t, col);
      break;
    }
    case "M": {
      const r = find(d.roles, rowId);
      if (r && col >= 0 && col < M_COLS.length) out = managerCell(r, col, meta.manager_grid);
      break;
    }
    case "R": {
      const r = find(d.roles, rowId);
      if (r) out = roleCell(r, col, meta.duties, meta.role_tags);
      break;
    }
    case "P": {
      const p = find(d.penalties, rowId);
      if (p) out = penaltyCell(p, col);
      break;
    }
    case "V": {
      const e = find(d.env, rowId);
      if (e) out = envCell(e, col);
      break;
    }
    default:
  }
  out = out ?? neutral("상세 정보");
  if (out.warn) delete out.fine;
  return out;
}

export function infoDetail(kind, rowId, data) {
  const d = data ?? {};
  const base = (rec, sections, extra = {}) => ({
    title: rec.n, sub: rec.s, icon: rec.i, status: rec.status, sections, law: lawOf(rec), ...extra,
    ...(unverified(rec) ? { warn: WARN } : {}),
  });
  if (kind === "W" || kind === "H") {
    const w = find(d.workers, rowId);
    if (!w) return neutral("상세 정보");
    const s = [{ key: "def", text: w.def }];
    if (Array.isArray(w.pills)) s.push({ key: "pills", pills: w.pills });
    s.push({ key: "resp", text: w.who });
    return base(w, s);
  }
  if (kind === "F") {
    const f = find(d.foreign, rowId);
    if (!f) return neutral("상세 정보");
    return base(f, [{ key: "summary", items: f.d ?? [] }], { law: f.src ? [f.src] : [] });
  }
  if (kind === "M" || kind === "R") {
    const r = find(d.roles, rowId);
    if (!r) return neutral("상세 정보");
    return base(r, [{ key: "basis", text: Array.isArray(r.law) ? r.law.join(" · ") : r.law }, { key: "apt", text: r.apt }], { law: [] });
  }
  return neutral("상세 정보");
}
