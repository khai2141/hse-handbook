// App icon for the installable (PWA) build: assets/app/app-192.png and app-512.png. Usage: node tools/make_app_icon.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const glyph = readFileSync("node_modules/lucide-static/icons/hard-hat.svg", "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
for (const s of [192, 512]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 256 256"><rect width="256" height="256" fill="#0b1f4a"/><g transform="translate(64 64) scale(5.33)" fill="none" stroke="#f2b705" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>`;
  writeFileSync(`assets/app/app-${s}.png`, new Resvg(svg, { fitTo: { mode: "width", value: s } }).render().asPng());
}
