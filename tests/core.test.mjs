import test from "node:test";
import assert from "node:assert/strict";
import { choseong, hit, parseHours, clampCount, fineTotal, alloc, pathOf } from "../js/core.js";

test("choseong extracts initial consonants", () => {
  assert.equal(choseong("건강진단"), "ㄱㄱㅈㄷ");
  assert.equal(choseong("A1 건강"), "A1 ㄱㄱ");
});
test("hit matches substring and choseong, never throws on special characters", () => {
  assert.equal(hit("건강진단", "ㄱㄱㅈㄷ"), true);
  assert.equal(hit("건강진단", "진단"), true);
  assert.equal(hit("건강진단", "교육"), false);
  assert.equal(hit("abc", "("), false);
  assert.equal(hit("abc", "[a"), false);
});
test("hit treats empty or blank query as match-all", () => {
  assert.equal(hit("anything", ""), true);
  assert.equal(hit("anything", "   "), true);
});
test("parseHours reads the first N시간", () => {
  assert.equal(parseHours("반기 12시간"), 12);
  assert.equal(parseHours("확인"), 0);
  assert.equal(parseHours("1시간 이상"), 1);
});
test("clampCount keeps a sane positive integer", () => {
  assert.equal(clampCount(""), 1);
  assert.equal(clampCount("0"), 1);
  assert.equal(clampCount("-5"), 1);
  assert.equal(clampCount("abc"), 1);
  assert.equal(clampCount("12.7"), 12);
  assert.equal(clampCount("100000"), 9999);
});
test("fineTotal multiplies a clamped count", () => {
  assert.equal(fineTotal(50, "20"), 1000);
  assert.equal(fineTotal(50, "-3"), 50);
});
test("alloc splits total hours across items in 5-minute steps and skips short lists", () => {
  assert.deepEqual(alloc(8, ["a", "b", "c"]), []);
  const r = alloc(1, ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"]);
  assert.equal(r.length, 11);
  assert.ok(r[0].endsWith("약 5분"));
});
test("pathOf lists ancestors from the first branch down", () => {
  assert.deepEqual(pathOf("edu.w.f"), ["edu", "edu.w", "edu.w.f"]);
  assert.deepEqual(pathOf("home"), []);
});
