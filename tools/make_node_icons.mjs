// One unique pictogram per tree node: assets/icons/n_<id>.png (256px, rounded tile in the PDCA colour + white Lucide glyph).
// Glyphs: lucide-static (ISC licence). Usage: node tools/make_node_icons.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const GLYPH = {
  home: "tree-deciduous",
  p: "target", "p.rule": "scroll-text", "p.org": "network", "p.risk": "triangle-alert", "p.doc": "file-text",
  d: "hard-hat",
  "d.edu": "graduation-cap", "d.edu.w": "users", "d.edu.w.f": "languages", "d.edu.w.t": "award", "d.edu.w.law": "scale",
  "d.edu.m": "user-cog", "d.edu.m.law": "book-marked",
  "d.hea": "heart-pulse", "d.hea.w": "stethoscope", "d.hea.env": "thermometer", "d.hea.std": "list-checks",
  "d.hea.std.chem": "flask-conical", "d.hea.std.phys": "ear", "d.hea.std.air": "wind", "d.hea.std.erg": "accessibility",
  "d.hea.msds": "biohazard", "d.daily": "calendar-check", "d.sub": "handshake",
  "d.tech": "construction", "d.tech.com": "boxes", "d.tech.mach": "cog", "d.tech.fire": "flame", "d.tech.elec": "zap",
  "d.tech.work": "hammer", "d.tech.sp": "pickaxe", "d.tech.tbl": "table", "d.emg": "siren",
  c: "clipboard-check", "c.insp": "search", "c.res": "chart-column",
  a: "repeat", "a.fix": "wrench", "a.rev": "file-pen",
  g: "landmark", "g.law": "book-open-text", "g.pen": "banknote",
};
const COL = { home: ["#1f3a5f", "#2f5d8c"], p: ["#2f6fed", "#1f4fb5"], d: ["#1f9d63", "#12754a"], c: ["#e08a00", "#b86a00"], a: ["#8b4fd1", "#6a35a8"], g: ["#586579", "#3b4658"] };

const doc = JSON.parse(readFileSync("data/nodes.json", "utf8"));
const ids = Object.keys(doc.nodes);
const missing = ids.filter((i) => !GLYPH[i]);
const extra = Object.keys(GLYPH).filter((i) => !doc.nodes[i]);
if (missing.length || extra.length) throw new Error(`glyph map mismatch: missing ${missing} extra ${extra}`);
if (new Set(Object.values(GLYPH)).size !== ids.length) throw new Error("duplicate glyph");

for (const id of ids) {
  const [top, bot] = COL[id.split(".")[0]];
  const src = readFileSync(`node_modules/lucide-static/icons/${GLYPH[id]}.svg`, "utf8");
  const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs>` +
    `<rect x="8" y="8" width="240" height="240" rx="44" fill="url(#g)"/>` +
    `<g transform="translate(52 52) scale(6.5)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
  const png = new Resvg(svg).render().asPng();
  const name = "n_" + id.replace(/\./g, "_");
  writeFileSync(`assets/icons/${name}.png`, png);
  doc.nodes[id].i = name;
}
writeFileSync("data/nodes.json", JSON.stringify(doc, null, 2), "utf8");
console.log("icons", ids.length);
