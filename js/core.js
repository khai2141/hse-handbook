const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

export function choseong(s) {
  return String(s ?? "").replace(/[\s\S]/g, (ch) => {
    const k = ch.charCodeAt(0) - 44032;
    return k >= 0 && k < 11172 ? CHO[Math.floor(k / 588)] : ch;
  });
}

export function hit(haystack, query) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return true;
  const h = String(haystack ?? "").toLowerCase();
  return h.includes(q) || choseong(haystack).toLowerCase().includes(q);
}

export function parseHours(text) {
  const m = /(\d+)\s*시간/.exec(String(text ?? ""));
  return m ? parseInt(m[1], 10) : 0;
}

export function clampCount(raw) {
  const n = Math.floor(Number.parseFloat(String(raw ?? "")));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 9999);
}

export function fineTotal(perPerson, count) {
  return perPerson * clampCount(count);
}

export function alloc(totalHours, items) {
  if (!totalHours || items.length < 4) return [];
  const mins = Math.round((totalHours * 60) / items.length / 5) * 5 || 5;
  return items.map((x) => `${x} — 약 ${mins}분`);
}

export function pathOf(id) {
  if (id === "home") return [];
  const parts = id.split(".");
  return parts.map((_, i) => parts.slice(0, i + 1).join("."));
}
