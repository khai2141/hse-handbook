import test from "node:test";
import assert from "node:assert/strict";
import { detailToHtml, totalText } from "../js/render.js";
import { esc, icon } from "../js/html.js";

const HOSTILE = "<img src=x onerror=1>";
const base = { title: "t", big: "8시간", status: "확인", sections: [{ key: "contents", items: ["a"] }] };

test("esc escapes all five characters", () => {
  assert.equal(esc(`<>&"'`), "&lt;&gt;&amp;&quot;&#39;");
  assert.equal(esc(null), "");
});

test("icon only accepts safe names", () => {
  assert.ok(icon("edu_hire").includes('src="assets/icons/edu_hire.png"'));
  assert.equal(icon('x" onerror="1'), "");
});

test("hostile strings in every field come out escaped", () => {
  const d = {
    title: HOSTILE, big: HOSTILE, status: HOSTILE, icon: "edu_hire", law: [HOSTILE], tip: HOSTILE, warn: HOSTILE,
    sections: [
      { key: "x", label: HOSTILE, items: [HOSTILE], hint: HOSTILE },
      { key: "y", text: HOSTILE, pills: [HOSTILE] },
      { key: "z", table: { head: [HOSTILE], rows: [[HOSTILE]] } },
    ],
    fine: { perPerson: [10, 20, 50], unit: HOSTILE },
  };
  const h = detailToHtml(d, { count: HOSTILE });
  assert.ok(!h.includes("<img src=x"));
  assert.ok(!/onclick/i.test(h));
  assert.ok(h.includes("&lt;img src=x onerror=1&gt;"));
});

test("calculator only when fine.perPerson exists", () => {
  assert.ok(!detailToHtml(base, {}).includes('id="n"'));
  assert.ok(!detailToHtml({ ...base, fine: { unit: "1명" } }, {}).includes('id="n"'));
  const h = detailToHtml({ ...base, fine: { perPerson: [10, 20, 50], unit: "1명" } }, { count: 3 });
  assert.ok(h.includes('id="n"') && h.includes('min="1"') && h.includes('max="9999"') && h.includes('value="3"'));
  assert.ok(h.includes("30만원") && h.includes("60만원") && h.includes("150만원"));
});

test("calculator clamps a bad count", () => {
  const h = detailToHtml({ ...base, fine: { perPerson: [10, 20, 50] } }, { count: -5 });
  assert.ok(h.includes('value="1"'));
  assert.ok(detailToHtml({ ...base, fine: { perPerson: [10] } }, { count: Infinity }).includes('value="9999"'));
});

test("warning box only when warn is set", () => {
  assert.ok(!detailToHtml(base, {}).includes('class="warnbox"'));
  const h = detailToHtml({ ...base, warn: "원문 확인 필요" }, {});
  assert.ok(h.includes('class="warnbox"') && h.includes("원문 확인 필요"));
});

test("lists, text and close button render", () => {
  const h = detailToHtml({ ...base, sections: [{ key: "a", label: "L", items: ["i1", "i2"] }, { key: "b", label: "T", text: "hello" }] }, {});
  assert.ok(h.includes("<li>i1</li>") && h.includes("hello") && h.includes('data-close="1"') && h.includes('class="big"'));
});

test("totalText multiplies by the clamped count", () => {
  assert.equal(totalText({ perPerson: [10, 20, 50] }, 3), "1차 30만원 · 2차 60만원 · 3차 150만원");
  assert.equal(totalText({ perPerson: [500, 500, 500], pick: 0 }, 2), "합계 1,000만원");
  assert.equal(totalText({ perPerson: [10] }, "abc"), "합계 10만원");
});
