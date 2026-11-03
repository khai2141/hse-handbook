import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { articleIdsFromLaw, pendingFor } from "../js/versions.js";

const watch = JSON.parse(fs.readFileSync(new URL("../data/watchlist.json", import.meta.url), "utf8"));

test("articleIdsFromLaw maps references", () => {
  assert.deepEqual(articleIdsFromLaw(["법 제29조②"]), ["법29"]);
  assert.deepEqual(articleIdsFromLaw(["산업안전보건법 제29조"]), ["법29"]);
  assert.deepEqual(articleIdsFromLaw(["시행령 제15조"]), ["령15"]);
  assert.deepEqual(articleIdsFromLaw(["시행규칙 제26조"]), ["규칙26"]);
  assert.deepEqual(articleIdsFromLaw(["산업안전보건법 시행규칙 별표 4"]), []);
  assert.deepEqual(articleIdsFromLaw(["중대재해 처벌 등에 관한 법률 제6조"]), ["중처6"]);
  assert.deepEqual(articleIdsFromLaw(["법 제29조", "법 제29조①"]), ["법29"]);
});

test("articleIdsFromLaw tolerates bad input", () => {
  assert.deepEqual(articleIdsFromLaw(undefined), []);
  assert.deepEqual(articleIdsFromLaw(null), []);
  assert.deepEqual(articleIdsFromLaw([undefined, 3]), []);
});

test("mapped ids exist in watchlist", () => {
  const ids = new Set(watch.map((w) => w.id));
  for (const s of ["법 제15조", "시행령 제53조", "시행규칙 제197조", "중대재해 처벌 등에 관한 법률 제2조", "법 제175조②1"]) {
    for (const id of articleIdsFromLaw([s])) assert.ok(ids.has(id), id);
  }
});

test("pendingFor returns only differing entries", () => {
  const v = { entries: {
    법175: { differs: true, latest_effective: "2027-04-28", diff_lines: ["예정: a"] },
    법15: { differs: false, latest_effective: "2027-04-28", diff_lines: [] },
    령15: { differs: true, latest_effective: "2027-01-01", diff_lines: ["예정: b"] },
    규칙26: { error: "RuntimeError" },
  } };
  const p = pendingFor(["법 제175조", "법 제15조", "시행령 제15조", "시행규칙 제26조", "법 제999조"], v);
  assert.deepEqual(p.articles, ["법175", "령15"]);
  assert.equal(p.effective, "2027-01-01");
  assert.deepEqual(p.lines, ["예정: a", "예정: b"]);
  assert.deepEqual(pendingFor(["법 제15조"], v), { articles: [], effective: null, lines: [] });
  assert.deepEqual(pendingFor(undefined, undefined), { articles: [], effective: null, lines: [] });
});
