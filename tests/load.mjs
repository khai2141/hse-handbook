import fs from "node:fs";
const rd = (n) => JSON.parse(fs.readFileSync(new URL(`../data/${n}.json`, import.meta.url), "utf8"));
export function loadData() {
  const d = {};
  for (const n of ["workers", "education", "health", "foreign", "tasks", "roles", "penalties", "env"]) d[n] = rd(n).records;
  d.articles = rd("articles").records;
  d.nodes = rd("nodes").nodes;
  d.meta = rd("meta");
  return d;
}
