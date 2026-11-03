// Bundle the handbook into one offline HTML file (dist/handbook.html).
import { build } from "esbuild";
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";

const names = readdirSync("data").filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
const data = Object.fromEntries(names.map((n) => [n, JSON.parse(readFileSync(`data/${n}.json`, "utf8"))]));
const icons = Object.fromEntries(
  readdirSync("assets/icons").filter((f) => f.endsWith(".png"))
    .map((f) => [f.slice(0, -4), "data:image/png;base64," + readFileSync(`assets/icons/${f}`).toString("base64")]),
);

const out = await build({ entryPoints: ["js/app.js"], bundle: true, format: "iife", minify: true, write: false });
let js = out.outputFiles[0].text;
const before = js;
js = js.replace(/assets\/icons\/\$\{(\w+)\}\.png/g, "${window.__ICONS[$1]}");
if (js === before) throw new Error("icon path pattern not found in bundle");

const prelude = `window.__DATA=${JSON.stringify(data)};window.__ICONS=${JSON.stringify(icons)};
const _f=window.fetch;window.fetch=(u,o)=>{const k=String(u).replace("data/","").replace(".json","");
if(String(u).indexOf("data/")===0&&window.__DATA[k]!==undefined)return Promise.resolve(new Response(JSON.stringify(window.__DATA[k]),{status:200}));
return _f?_f(u,o):Promise.reject(new Error("offline"));};`;

let html = readFileSync("index.html", "utf8");
const css = readFileSync("css/app.css", "utf8");
html = html.replace(/<link rel="stylesheet" href="css\/app.css">/, () => `<style>${css}</style>`);
html = html.replace(/<script[^>]*src="js\/app.js"[^>]*><\/script>/, "");
html = html.replace("</body>", () => `<script>${prelude}</script><script>${js.replace(/<\/script/g, "<\/script")}</script></body>`);
mkdirSync("dist", { recursive: true });
writeFileSync("dist/handbook.html", html);
console.log("dist/handbook.html", (html.length / 1e6).toFixed(1) + " MB");
