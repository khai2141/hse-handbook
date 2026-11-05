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

// Book illustrations: local files in assets/book (names restricted); the offline bundle inlines them.
export const bookUrl = (f) => `assets/book/${f}`;

export function bookImg(file, w, h, alt) {
  const f = String(file ?? "");
  if (!/^[A-Za-z0-9_-]+\.webp$/.test(f)) return "";
  const dim = w && h ? ` width="${Number(w)}" height="${Number(h)}"` : "";
  return `<img src="${bookUrl(f)}" alt="${esc(alt ?? "")}"${dim} loading="lazy" decoding="async">`;
}
