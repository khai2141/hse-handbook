const MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => MAP[c]);
}

// Icons are local files named by the data's `i` field; the name is restricted to a safe charset.
export function icon(name, size = 32) {
  const n = String(name ?? "");
  if (!/^[a-z0-9_]+$/.test(n)) return "";
  return `<img src="assets/icons/${n}.png" alt="" width="${size}" height="${size}" loading="lazy" decoding="async">`;
}
