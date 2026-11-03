import { pathOf } from "./core.js";

export function routeFromHash(hash, nodes) {
  const id = (hash || "").replace(/^#\/?/, "").replace(/\//g, ".") || "home";
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
