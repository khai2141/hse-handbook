import test from "node:test";
import assert from "node:assert/strict";
import { routeFromHash, hashFor, breadcrumbs, kidsOf } from "../js/tree.js";
const nodes = {
  home: { t: "홈", kids: ["edu", "ghost"] },
  edu: { t: "안전보건교육", kids: ["edu.w"] },
  "edu.w": { t: "근로자 교육" },
};
test("hash round trip", () => {
  assert.equal(routeFromHash("#/edu/w", nodes), "edu.w");
  assert.equal(hashFor("edu.w"), "#/edu/w");
  assert.equal(hashFor("home"), "#/");
});
test("unknown or empty hash falls back to home", () => {
  assert.equal(routeFromHash("#/nope", nodes), "home");
  assert.equal(routeFromHash("", nodes), "home");
  assert.equal(routeFromHash("#/constructor", nodes), "home");
  assert.equal(routeFromHash("#/__proto__", nodes), "home");
});
test("breadcrumbs list ancestors", () => {
  assert.deepEqual(breadcrumbs("edu.w", nodes).map((b) => b.title), ["안전보건교육", "근로자 교육"]);
  assert.deepEqual(breadcrumbs("home", nodes), []);
});
test("kidsOf returns existing children only", () => {
  assert.deepEqual(kidsOf("home", nodes), ["edu"]);
  assert.deepEqual(kidsOf("edu.w", nodes), []);
  assert.deepEqual(kidsOf("zzz", nodes), []);
});
