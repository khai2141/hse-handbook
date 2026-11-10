// "내 역할로 찾기": one sheet per role, built only from data that is already verified elsewhere in the handbook.
// Nothing here is a new grouping by judgment: the article lists are literal searches of the verbatim law text.

const WORKER = { id: "wrk", n: "근로자", s: "스스로 지켜야 하는 일 · 권리 (법 제6조)", i: "edu_regular" };
const ORDER = ["sup2", "saf", "hea", "wrk", "mgr", "gen", "crd", "doc", "ceo"];
const SHORT = {
  "산업안전보건기준에 관한 규칙": "안전보건규칙",
  "산업안전보건법": "법",
  "산업안전보건법 시행령": "시행령",
  "산업안전보건법 시행규칙": "시행규칙",
  "중대재해 처벌 등에 관한 법률": "중처법",
  "중대재해 처벌 등에 관한 법률 시행령": "중처법 시행령",
};
const shortLaw = (law) => SHORT[law] ?? law ?? "";
const verified = (r) => r?.status !== "미확인";

export function roleTiles(data) {
  const byId = new Map((data?.roles ?? []).map((r) => [r.id, r]));
  byId.set(WORKER.id, WORKER);
  return ORDER.filter((id) => byId.has(id)).map((id) => ({ id, n: byId.get(id).n, i: byId.get(id).i }));
}

// Paragraphs (항) whose own sentence has "근로자는 …" and no "사업주는 …": the worker, not the employer, is the one who must act.
export function workerClauses(text) {
  return String(text ?? "")
    .split(/(?=[①-⑳])/)
    .map((p) => p.trim())
    .filter((p) => p.includes("근로자는 ") && !p.includes("사업주는 "));
}

export function roleCards(id, data) {
  const arts = (data?.articles ?? []).filter(verified);
  if (id === WORKER.id) {
    return arts.flatMap((r) => {
      const c = workerClauses(r.text);
      return c.length ? [{ id: r.id, jo: `${shortLaw(r.law)} ${r.jo}`, title: r.title, gist: c.join(" "), full: true }] : [];
    });
  }
  const role = (data?.roles ?? []).find((r) => r.id === id);
  if (!role) return [];
  return arts.filter((r) => String(r.text ?? "").includes(role.n)).map((r) => ({ id: r.id, jo: `${shortLaw(r.law)} ${r.jo}`, title: r.title, gist: r.gist ?? "" }));
}

// 안전보건규칙 별표 2: what a 관리감독자 must do, per kind of work (제35조제1항 관련).
function supervisorTasks(data) {
  return (data?.annexes ?? [])
    .filter((r) => r.annex === "별표 2" && r.annex_title === "관리감독자의 유해·위험 방지" && verified(r))
    .map((r) => ({ id: r.id, annex: true, jo: `별표 2 제${r.no}호`, title: r.name, gist: (r.parts ?? []).flatMap((p) => p.items ?? []).join(" ") }));
}

export function roleDetail(id, data) {
  const cards = roleCards(id, data);
  if (id === WORKER.id) {
    return {
      title: WORKER.n, sub: WORKER.s, icon: WORKER.i, status: "확인", share: true, law: [],
      sections: [
        { label: `원문에 "근로자는 …" 문장이 있는 조문 ${cards.length}개 (의무·권리)`, hint: "사업주가 아니라 근로자가 주어인 항만 원문 그대로 옮겼습니다. 누르면 조문 전체가 열립니다.", arts: cards },
        { label: "받아야 하는 교육", go: { id: "d.edu", text: "안전보건교육 시간·내용 보기" } },
        { label: "건강진단", go: { id: "d.hea.w", text: "근로자 유형별 건강진단 보기" } },
      ],
    };
  }
  const r = (data?.roles ?? []).find((x) => x.id === id);
  if (!r) return null;
  const s = [
    { key: "basis", text: Array.isArray(r.law) ? r.law.join(" · ") : r.law },
    { key: "apt", text: r.apt },
    { label: "직무", items: r.list ?? [] },
  ];
  if (r.edu && r.edu !== "—") s.push({ label: "받아야 하는 교육", text: r.edu });
  if (r.fine) s.push({ key: "fine", text: r.fine });
  const tasks = id === "sup2" ? supervisorTasks(data) : [];
  if (tasks.length) s.push({ label: `작업별 관리감독자 업무 ${tasks.length}개 (안전보건규칙 별표 2)`, collapse: true, arts: tasks });
  if (cards.length) s.push({ label: `원문에 "${r.n}"이(가) 나오는 조문 ${cards.length}개`, hint: "조문 원문을 낱말로 찾은 결과입니다. 누르면 조문 전체가 열립니다.", arts: cards });
  s.push({ label: "다른 직책과 비교", go: { id: "p.org", text: "직책 × 업무 표 보기" } });
  return { title: r.n, sub: r.s, icon: r.i, status: r.status, share: true, law: [], sections: s, ...(verified(r) ? {} : { warn: "원문을 확인하지 못한 항목입니다." }) };
}
