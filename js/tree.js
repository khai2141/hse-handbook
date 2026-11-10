import { pathOf } from "./core.js";

export function routeFromHash(hash, nodes) {
  const id = (hash || "").replace(/@.*$/, "").replace(/^#\/?/, "").replace(/\//g, ".") || "home";
  return Object.hasOwn(nodes, id) ? id : "home";
}

export function hashFor(id) {
  return id === "home" ? "#/" : "#/" + id.replace(/\./g, "/");
}

export function breadcrumbs(id, nodes) {
  return pathOf(id)
    .filter((x) => Object.hasOwn(nodes, x))
    .map((x) => ({ id: x, title: nodes[x].t }));
}

export function kidsOf(id, nodes) {
  const n = Object.hasOwn(nodes, id) ? nodes[id] : null;
  return Array.isArray(n?.kids) ? n.kids.filter((k) => Object.hasOwn(nodes, k)) : [];
}

// "#/d/tech/com@sr-13" -> "sr-13" (an article or 별표 row to open on top of the page); null when absent or malformed.
export function itemFromHash(hash) {
  const m = /@([a-z]{1,3}\d*(?:_\d+)?-[0-9a-z-]+)$/.exec(String(hash ?? ""));
  return m ? m[1] : null;
}
