// Map law reference strings to watchlist ids and collect pending (시행 예정) amendments. Pure.
function prefixOf(s) {
  if (s.includes("중대재해")) return "중처";
  if (s.includes("시행규칙")) return "규칙";
  if (s.includes("시행령")) return "령";
  return "법";
}

export function articleIdsFromLaw(lawStrings) {
  const out = [];
  if (!Array.isArray(lawStrings)) return out;
  for (const s of lawStrings) {
    if (typeof s !== "string") continue;
    const p = prefixOf(s);
    for (const m of s.matchAll(/제\s*(\d+)\s*조(?!\s*의\s*\d)/g)) {
      const id = p + m[1];
      if (!out.includes(id)) out.push(id);
    }
  }
  return out;
}

export function pendingFor(lawStrings, versions) {
  const res = { articles: [], effective: null, lines: [] };
  const entries = versions && typeof versions === "object" ? versions.entries : null;
  if (!entries || typeof entries !== "object") return res;
  for (const id of articleIdsFromLaw(lawStrings)) {
    const e = entries[id];
    if (!e || e.differs !== true) continue;
    res.articles.push(id);
    if (e.latest_effective && (!res.effective || e.latest_effective < res.effective)) res.effective = e.latest_effective;
    if (Array.isArray(e.diff_lines)) res.lines.push(...e.diff_lines);
  }
  return res;
}
