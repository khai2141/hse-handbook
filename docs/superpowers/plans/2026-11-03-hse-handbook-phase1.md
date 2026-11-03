# 건설안전 HSE 핸드북 Giai đoạn 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng sổ tay web tiếng Hàn dạng cây (thân, cành chính, cành phụ), bảng tổng quan ở cuối mỗi cành, bấm một ô chỉ mở chi tiết của đúng ô đó, dữ liệu luật có nguồn và kiểm chứng được.

**Architecture:** Web tĩnh (HTML + ES modules, không framework), dữ liệu tách thành `data/*.json` có trường nguồn bắt buộc; một validator Python làm bản dựng thất bại nếu thiếu nguồn; giao diện đọc JSON và dựng cây, bảng, chi tiết ô bằng các hàm thuần (có kiểm thử Node). Cập nhật luật chạy bằng script cục bộ so khớp hash điều khoản rồi tạo bản nháp chờ người dùng duyệt.

**Tech Stack:** HTML/CSS/JS (ES modules), Node 18+ (`node --test`), Python 3 (`py`, `unittest`, Pillow đã có), GitHub Pages, law.go.kr (trang điều khoản và Open API khi IP có hiệu lực).

**Spec:** `docs/superpowers/specs/2026-11-03-hse-handbook-phase1-design.md` (đọc kèm `data-draft/role_duties_verified.md` là nguồn dữ liệu đã kiểm chứng, và mẫu tham khảo đã duyệt tại `https://claude.ai/artifact/DxNnsisuayffmxApsZAqBr`).

## Global Constraints

- Ngôn ngữ giao diện và nội dung: tiếng Hàn (쉬운 말), điều luật trích nguyên văn.
- Lề trái phải tối thiểu 16px; không cuộn ngang toàn trang (chỉ bảng cuộn trong khung riêng); sáng/tối bằng token màu; phông Noto Sans KR.
- Không hotlink hình; icon nằm trong repo (`assets/icons`, PNG, rộng 256px).
- Mọi bản ghi `penalties`, `training`, `health`, `roles`, `foreign` có `source.url`, `source.published`, `source.effective`, `source.verified_at`; nếu chưa xác minh thì `status` bằng `"미확인"` và không có số liệu bịa.
- ⭐ chỉ gắn khi bản ghi có `stats.source`; không có thì hiển thị `통계 미확보`.
- Số điều luật nào hiển thị phải đúng định dạng `법 제29조`, `시행규칙 별표 4`; đơn vị tiền phạt ghi `만원`.
- Mã OC của 법제처 chỉ lấy từ biến môi trường `LAW_OC`; tuyệt đối không ghi vào repo, log, hay chat.
- Chỉ sao chép thủ công thư mục `skills/impeccable` (không hook, không binary, không telemetry) và chỉ khi người dùng đồng ý.
- Người dùng duyệt bản nháp cập nhật trước khi đăng.

## Review Focus

1. Ô có dữ liệu chưa xác minh (`확인`, `미확인`) phải hiện nhãn "원문 확인 필요" và không hiện giờ hay số tiền do suy đoán.
2. Máy tính phạt nhận số người rỗng, 0, âm, chữ, hoặc 100000 phải trả giá trị hợp lệ (tối thiểu 1) và không treo trang.
3. Tìm kiếm với chuỗi rỗng, toàn khoảng trắng, chỉ ký tự đặc biệt (`(`, `[`), và 초성 hỗn hợp phải không lỗi và không trả kết quả sai.
4. Bản dựng với một dòng thiếu `source.effective` hoặc ngày hiệu lực ở tương lai chưa gắn cờ phải thất bại, không được đăng.
5. Bảng 18 hàng × 5 cột và khung chi tiết trên màn hình 360px, và khi mở chi tiết rồi đóng bằng Esc, phải không mất vị trí cuộn và không tràn ngang.

---

## File Structure

```
E:\agent skill\handbook\
  index.html                 khung trang, nạp js/app.js (module)
  css\app.css                token màu, bố cục cây, bảng, khung chi tiết
  js\core.js                 hàm thuần: choseong, hit, parseHours, alloc, fineTotal, clampCount, pathOf
  js\tree.js                 cây nút từ data/nodes.json, đường dẫn, hash routing
  js\matrix.js               dựng bảng cho từng loại (W, H, F, T, M, R, P, V)
  js\cells.js                dựng nội dung chi tiết đúng một ô
  js\app.js                  nối DOM, sự kiện, lưu vị trí cuộn
  data\nodes.json workers.json education.json health.json foreign.json
       tasks.json roles.json penalties.json env.json sources.json watchlist.json
  assets\icons\*.png         40 icon Flow + icon SafePermit đang dùng
  tools\validate_data.py     kiểm tra trường nguồn, ngày, loại
  tools\export_legacy.py     xuất mảng dữ liệu từ mẫu tree.html sang JSON
  tools\fetch_law.py         lấy văn bản điều khoản (HTML hoặc API)
  tools\check_updates.py     so hash với watchlist, ghi báo cáo
  tests\test_validate.py     unittest cho validator
  tests\test_fetch.py        unittest với fixture HTML
  tests\core.test.mjs        node --test cho js/core.js
  tests\cells.test.mjs       node --test cho js/cells.js
  .github\workflows\pages.yml  đăng lên GitHub Pages
```

---

### Task 1: Kho mã, khung dữ liệu và validator

**Files:**
- Create: `handbook/` (git init), `handbook/tools/validate_data.py`, `handbook/tests/test_validate.py`, `handbook/data/sources.json`

**Interfaces:**
- Produces: `validate_file(path) -> list[str]` (danh sách lỗi, rỗng nếu hợp lệ) và `validate_dir(dir) -> list[str]` trong `tools/validate_data.py`; lệnh `py tools/validate_data.py data` thoát mã 1 nếu có lỗi.

- [ ] **Step 1: Write the failing test** — `tests/test_validate.py`

```python
import json, os, tempfile, unittest
from tools.validate_data import validate_file

def write(tmp, name, obj):
    p = os.path.join(tmp, name)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)
    return p

GOOD = {"id": "p1", "status": "확인",
        "source": {"url": "https://www.law.go.kr/x", "published": "2026-07-28",
                   "effective": "2026-08-01", "verified_at": "2026-11-03"}}

class ValidateTests(unittest.TestCase):
    def test_good_record_passes(self):
        with tempfile.TemporaryDirectory() as t:
            self.assertEqual(validate_file(write(t, "a.json", {"records": [GOOD]})), [])

    def test_missing_effective_fails(self):
        bad = json.loads(json.dumps(GOOD)); del bad["source"]["effective"]
        with tempfile.TemporaryDirectory() as t:
            errs = validate_file(write(t, "a.json", {"records": [bad]}))
            self.assertTrue(any("effective" in e for e in errs))

    def test_unverified_needs_no_source_but_no_numbers(self):
        rec = {"id": "x", "status": "미확인", "hours": 8}
        with tempfile.TemporaryDirectory() as t:
            errs = validate_file(write(t, "a.json", {"records": [rec]}))
            self.assertTrue(any("미확인" in e for e in errs))

    def test_unverified_without_numbers_passes(self):
        rec = {"id": "x", "status": "미확인"}
        with tempfile.TemporaryDirectory() as t:
            self.assertEqual(validate_file(write(t, "a.json", {"records": [rec]})), [])

    def test_star_requires_stats_source(self):
        rec = json.loads(json.dumps(GOOD)); rec["star"] = True
        with tempfile.TemporaryDirectory() as t:
            errs = validate_file(write(t, "a.json", {"records": [rec]}))
            self.assertTrue(any("star" in e for e in errs))

    def test_future_effective_must_be_flagged(self):
        rec = json.loads(json.dumps(GOOD)); rec["source"]["effective"] = "2099-01-01"
        with tempfile.TemporaryDirectory() as t:
            errs = validate_file(write(t, "a.json", {"records": [rec]}))
            self.assertTrue(any("future" in e for e in errs))
            rec["source"]["future_ack"] = True
            self.assertEqual(validate_file(write(t, "b.json", {"records": [rec]})), [])

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "E:\agent skill\handbook"; git init; py -m unittest tests.test_validate -v`
Expected: FAIL (`ModuleNotFoundError: tools.validate_data`)

- [ ] **Step 3: Write minimal implementation** — `tools/__init__.py` (empty) and `tools/validate_data.py`

```python
import json, os, sys, datetime

REQ = ("url", "published", "effective", "verified_at")
NUMERIC = ("hours", "fine", "fines", "min", "max")

def _date(s):
    return datetime.date.fromisoformat(s)

def _check_record(rec, where):
    errs = []
    status = rec.get("status", "확인")
    if status == "미확인":
        for k in NUMERIC:
            if k in rec:
                errs.append(f"{where}: 미확인 record must not carry numeric field '{k}'")
        return errs
    src = rec.get("source")
    if not isinstance(src, dict):
        return [f"{where}: missing source"]
    for k in REQ:
        if not src.get(k):
            errs.append(f"{where}: source.{k} missing")
    if all(src.get(k) for k in REQ):
        try:
            eff = _date(src["effective"])
            if eff > datetime.date.today() and not src.get("future_ack"):
                errs.append(f"{where}: effective date in the future without future_ack")
        except ValueError:
            errs.append(f"{where}: source.effective is not ISO date")
    if rec.get("star") and not (rec.get("stats") or {}).get("source"):
        errs.append(f"{where}: star requires stats.source")
    return errs

def validate_file(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    errs = []
    for i, rec in enumerate(data.get("records", [])):
        errs += _check_record(rec, f"{os.path.basename(path)}#{rec.get('id', i)}")
    return errs

def validate_dir(d):
    errs = []
    for n in sorted(os.listdir(d)):
        if n.endswith(".json") and n not in ("nodes.json", "watchlist.json"):
            errs += validate_file(os.path.join(d, n))
    return errs

if __name__ == "__main__":
    e = validate_dir(sys.argv[1])
    print("\n".join(e) if e else "OK")
    sys.exit(1 if e else 0)
```

Note: the test for "future" message expects the word `future` in the error: the message above contains "in the future". The test for unverified expects `미확인` in the message: present.

- [ ] **Step 4: Run test to verify it passes**

Run: `py -m unittest tests.test_validate -v`
Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tools tests && git commit -m "feat: data validator with source and star rules"
```

---

### Task 2: Chuyển dữ liệu đã kiểm chứng sang JSON

**Files:**
- Create: `handbook/tools/export_legacy.py`, `handbook/data/{workers,education,health,foreign,tasks,roles,penalties,env,nodes}.json`
- Modify: `handbook/data/sources.json`

**Interfaces:**
- Consumes: `validate_dir(dir)` từ Task 1; nguồn là `scratchpad/tree.html` (biến JS `W`, `E`, `HL`, `FL`, `T`, `R`, `P`, `VENV`, `NODES`) và `data-draft/role_duties_verified.md`.
- Produces: mỗi file JSON có dạng `{"records": [...]}` (riêng `nodes.json` là `{"nodes": {...}}`); mỗi bản ghi giữ `id`, `status` (`확인`, `일부 확인`, `미확인`), `source` (url, published, effective, verified_at).

- [ ] **Step 1: Write the failing test** — thêm vào `tests/test_validate.py`

```python
class DataDirTests(unittest.TestCase):
    def test_repo_data_is_valid(self):
        from tools.validate_data import validate_dir
        errs = validate_dir(os.path.join(os.path.dirname(__file__), "..", "data"))
        self.assertEqual(errs, [])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `py -m unittest tests.test_validate.DataDirTests -v`
Expected: FAIL (thư mục `data` chưa có file hoặc thiếu nguồn)

- [ ] **Step 3: Write the export script** — `tools/export_legacy.py`

```python
import json, os, re, sys
ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = sys.argv[1]            # đường dẫn tới tree.html
OUT = os.path.join(ROOT, "data")

def grab(src, name):
    i = src.index("var " + name + "=") + len("var " + name + "=")
    depth, q, k = 0, None, i
    while True:
        ch = src[k]
        if q:
            if ch == "\\": k += 2; continue
            if ch == q: q = None
        elif ch in "\"'": q = ch
        elif ch in "[{(": depth += 1
        elif ch in "]})": depth -= 1
        elif ch == ";" and depth == 0: return src[i:k]
        k += 1

def to_json(js):
    js = re.sub(r"\bc\(\s*(\"[^\"]*\")\s*,\s*\"([ypnqx])\"\s*\)", r'{"t":\1,"k":"\2"}', js)
    js = re.sub(r"([{,]\s*)([A-Za-z_가-힣][A-Za-z0-9_가-힣]*)\s*:", r'\1"\2":', js)
    js = re.sub(r",\s*([\]}])", r"\1", js)
    return json.loads(js)

SOURCE = {
    "url": "https://www.law.go.kr/LSW/lsLinkProc.do?lsClsCd=L&mode=11&lsNm=산업안전보건법",
    "published": "2026-07-28", "effective": "2026-08-01", "verified_at": "2026-11-03",
}

def wrap(items, status_of=lambda r: r.get("st", "확인")):
    out = []
    for r in items:
        if "g" in r:
            continue
        rec = dict(r)
        s = {"ok": "확인", "part": "일부 확인", "no": "미확인"}.get(rec.pop("st", "ok"), "확인")
        rec["status"] = s
        if s != "미확인":
            rec["source"] = dict(SOURCE)
        out.append(rec)
    return {"records": out}

if __name__ == "__main__":
    html = open(SRC, encoding="utf-8").read()
    for js_name, file in [("W", "workers"), ("E", "education"), ("HL", "health"),
                          ("FL", "foreign"), ("R", "roles")]:
        data = wrap(to_json(grab(html, js_name)))
        json.dump(data, open(os.path.join(OUT, file + ".json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
    print("exported")
```

- [ ] **Step 4: Run the export, fix mismatches, re-run validator**

Run: `py tools/export_legacy.py "C:\Users\ledin\AppData\Local\Temp\claude\C--Users-ledin--claude-spares-spare-BZmsgM\b6a1eadf-fbf4-448b-aa98-63a127ad0075\scratchpad\tree.html"` then `py tools/validate_data.py data`
Expected: `OK`. Với bản ghi `미확인` (ví dụ `외국인 근로자`, các hàng visa F-2/F-4/F-5/E-7) giữ nguyên không có `source`; bản ghi có số phải có nguồn. Nếu bước chuyển JS sang JSON bằng biểu thức chính quy sai (ví dụ chuỗi có dấu hai chấm), thay `to_json` bằng chạy đoạn dữ liệu trong Node: `node -e "const vm=require('vm'),fs=require('fs');const h=fs.readFileSync(process.argv[1],'utf8');const m=/<script>([\s\S]*)<\/script>/.exec(h)[1];const end=m.indexOf('var NODES=');const ctx={};vm.runInNewContext(m.slice(0,end).replace('var IC={{ICONS}};','var IC={};')+';this.out={W,E,HL,FL,R,T,P}',ctx);fs.writeFileSync('legacy.json',JSON.stringify(ctx.out))" <đường dẫn tree.html>`, rồi đọc `legacy.json` trong Python thay cho `to_json`. Nếu validator báo lỗi cho bản ghi nào, sửa nguồn đúng điều khoản (URL dạng `https://www.law.go.kr/LSW/lsLinkProc.do?lsClsCd=L&mode=11&lsNm=<tên luật>&joNo=<6 chữ số>`), không nới quy tắc.

- [ ] **Step 5: Write the remaining files by hand from the draft** — `tasks.json` (18 việc 특별교육 trong `data-draft/role_duties_verified.md`), `penalties.json` (20 dòng trong tree.html biến `P`, đơn vị `만원`), `env.json` (8 điều khoản 법 제125조 biến `VENV`), `nodes.json` (biến `NODES`). Mỗi dòng phạt ghi `unit` (`1명` hoặc `건`) và `fines: [lần1, lần2, lần3]`.

- [ ] **Step 6: Run test to verify it passes, then commit**

Run: `py -m unittest discover -s tests -v`
Expected: PASS

```bash
git add data tools && git commit -m "feat: migrate verified legal data to JSON"
```

---

### Task 3: Lõi logic thuần (tìm kiếm 초성, giờ, phạt)

**Files:**
- Create: `handbook/js/core.js`, `handbook/tests/core.test.mjs`

**Interfaces:**
- Produces (xuất bằng `export`): `choseong(s: string): string`, `hit(haystack: string, query: string): boolean`, `parseHours(text: string): number`, `clampCount(raw: unknown): number`, `fineTotal(perPerson: number, count: unknown): number`, `alloc(totalHours: number, items: string[]): string[]`, `pathOf(id: string): string[]`.

- [ ] **Step 1: Write the failing test** — `tests/core.test.mjs`

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/core.test.mjs`
Expected: FAIL (`Cannot find module '../js/core.js'`)

- [ ] **Step 3: Write minimal implementation** — `js/core.js`

```js
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

export function choseong(s) {
  return String(s ?? "").replace(/[\s\S]/g, (ch) => {
    const k = ch.charCodeAt(0) - 44032;
    return k >= 0 && k < 11172 ? CHO[Math.floor(k / 588)] : ch;
  });
}

export function hit(haystack, query) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return true;
  const h = String(haystack ?? "").toLowerCase();
  return h.includes(q) || choseong(haystack).toLowerCase().includes(q);
}

export function parseHours(text) {
  const m = /(\d+)\s*시간/.exec(String(text ?? ""));
  return m ? parseInt(m[1], 10) : 0;
}

export function clampCount(raw) {
  const n = Math.floor(Number.parseFloat(String(raw ?? "")));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 9999);
}

export function fineTotal(perPerson, count) {
  return perPerson * clampCount(count);
}

export function alloc(totalHours, items) {
  if (!totalHours || items.length < 4) return [];
  const mins = Math.round((totalHours * 60) / items.length / 5) * 5 || 5;
  return items.map((x) => `${x} — 약 ${mins}분`);
}

export function pathOf(id) {
  if (id === "home") return [];
  const parts = id.split(".");
  return parts.map((_, i) => parts.slice(0, i + 1).join("."));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/core.test.mjs`
Expected: 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/core.js tests/core.test.mjs && git commit -m "feat: pure core helpers with tests"
```

---

### Task 4: Dựng chi tiết đúng một ô (cells.js)

**Files:**
- Create: `handbook/js/cells.js`, `handbook/tests/cells.test.mjs`

**Interfaces:**
- Consumes: `parseHours`, `alloc`, `fineTotal` từ `js/core.js`; dữ liệu JSON từ Task 2.
- Produces: `workerCell(worker, eduByCol, colIndex): CellDetail` với `CellDetail = { title, big, status, sections: [{key, items?: string[], text?: string}], fine?: {perPerson: number[], unit: string}, warn?: string }`. `status` là `"확인" | "일부 확인" | "미확인"`; khi ô có `k === "q"` hoặc `status === "미확인"`, `warn` bằng `"원문 확인 필요"` và `big` không được là số suy đoán.

- [ ] **Step 1: Write the failing test** — `tests/cells.test.mjs`

```js
import test from "node:test";
import assert from "node:assert/strict";
import { workerCell } from "../js/cells.js";

const edu = [
  { id: "e2", name: "채용 시 교육", law: ["법 제29조②"], contents: ["a","b","c","d"], fine: [10,20,50], unit: "1명", who: "사업주" },
];
const reg = { id: "reg", name: "상용·상시 근로자", status: "확인", law: ["시행규칙 별표 4"],
  cells: [{ t: "8시간", k: "y" }], rule: ["채용 시 교육 8시간 이상"] };
const day = { id: "day", name: "일용근로자", status: "일부 확인", law: [],
  cells: [{ t: "확인", k: "q" }], rule: [] };

test("confirmed cell shows hours, rule text, contents and per-person fine", () => {
  const d = workerCell(reg, edu, 0);
  assert.equal(d.big, "8시간");
  assert.equal(d.warn, undefined);
  assert.deepEqual(d.fine.perPerson, [10, 20, 50]);
  assert.ok(d.sections.some((s) => s.key === "rule" && s.items[0].includes("8시간")));
  assert.ok(d.sections.some((s) => s.key === "alloc"));
});

test("unverified cell warns and never shows an invented number", () => {
  const d = workerCell(day, edu, 0);
  assert.equal(d.warn, "원문 확인 필요");
  assert.equal(d.big, "확인");
  assert.equal(d.sections.some((s) => s.key === "alloc"), false);
});

test("title joins worker and education names", () => {
  assert.equal(workerCell(reg, edu, 0).title, "상용·상시 근로자 × 채용 시 교육");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/cells.test.mjs`
Expected: FAIL (`Cannot find module '../js/cells.js'`)

- [ ] **Step 3: Write minimal implementation** — `js/cells.js`

```js
import { parseHours, alloc } from "./core.js";

export function workerCell(worker, eduByCol, col) {
  const edu = eduByCol[col];
  const cell = worker.cells[col];
  const unverified = cell.k === "q" || worker.status === "미확인";
  const hours = unverified ? 0 : parseHours(cell.t);
  const sections = [];
  if (worker.rule && worker.rule.length) sections.push({ key: "rule", items: worker.rule });
  sections.push({ key: "contents", items: edu.contents });
  const a = alloc(hours, edu.contents);
  if (a.length) sections.push({ key: "alloc", items: a });
  sections.push({ key: "who", text: edu.who });
  const out = {
    title: `${worker.name} × ${edu.name}`,
    big: cell.t,
    status: worker.status,
    sections,
    fine: { perPerson: edu.fine, unit: edu.unit },
  };
  if (unverified) out.warn = "원문 확인 필요";
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/cells.test.mjs`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/cells.js tests/cells.test.mjs && git commit -m "feat: single-cell detail builder"
```

---

### Task 5: Cây, bảng và khung chi tiết (giao diện)

**Files:**
- Create: `handbook/index.html`, `handbook/css/app.css`, `handbook/js/tree.js`, `handbook/js/matrix.js`, `handbook/js/app.js`
- Modify: `handbook/js/cells.js` (thêm `healthCell`, `foreignCell`, `taskCell`, `managerCell`, `roleCell`, `penaltyCell`, `envCell` theo cùng khuôn `CellDetail`)

**Interfaces:**
- Consumes: `hit`, `pathOf`, `clampCount`, `fineTotal` từ `core.js`; `workerCell` từ `cells.js`; JSON từ `data/`.
- Produces: `window.location.hash` dạng `#/edu/w`; `renderMatrix(kind, data, query): string` trong `matrix.js`; sự kiện bấm ô `data-cell="kind|rowId|colIndex"` mở khung chi tiết; phím Esc đóng và trả tiêu điểm về ô vừa bấm.

- [ ] **Step 1: Port the layout from the approved sample.** Sao chép CSS và cấu trúc DOM từ `scratchpad/tree.html` (token màu sáng/tối, `.layout`, `.outline`, `.tree`, `.tw`, `.sheet`) vào `css/app.css` và `index.html`. Đổi mọi `onclick` inline thành sự kiện ủy quyền trong `app.js`.

- [ ] **Step 2: Implement hash routing in `js/tree.js`**

```js
import { pathOf } from "./core.js";

export function routeFromHash(hash, nodes) {
  const id = (hash || "").replace(/^#\/?/, "").replace(/\//g, ".") || "home";
  return nodes[id] ? id : "home";
}

export function hashFor(id) {
  return id === "home" ? "#/" : "#/" + id.replace(/\./g, "/");
}

export function breadcrumbs(id, nodes) {
  return pathOf(id).map((x) => ({ id: x, title: nodes[x].t }));
}
```

- [ ] **Step 3: Write a routing test** — `tests/tree.test.mjs`

```js
import test from "node:test";
import assert from "node:assert/strict";
import { routeFromHash, hashFor, breadcrumbs } from "../js/tree.js";
const nodes = { home: { t: "홈" }, edu: { t: "안전보건교육" }, "edu.w": { t: "근로자 교육" } };
test("hash round trip", () => {
  assert.equal(routeFromHash("#/edu/w", nodes), "edu.w");
  assert.equal(hashFor("edu.w"), "#/edu/w");
});
test("unknown or empty hash falls back to home", () => {
  assert.equal(routeFromHash("#/nope", nodes), "home");
  assert.equal(routeFromHash("", nodes), "home");
});
test("breadcrumbs list ancestors", () => {
  assert.deepEqual(breadcrumbs("edu.w", nodes).map((b) => b.title), ["안전보건교육", "근로자 교육"]);
});
```

Run: `node --test tests/tree.test.mjs` → Expected: PASS.

- [ ] **Step 4: Wire matrices and cell detail.** `matrix.js` xuất `renderMatrix(kind, data, query)`; `app.js` nghe sự kiện bấm: ô `[data-cell]` gọi `cellDetail(kind, rowId, col)` (trong `cells.js`) rồi dựng khung chi tiết; nút `[data-info]` chỉ hiện định nghĩa hàng; Esc hoặc nền mờ đóng khung và `focus()` lại nút đã bấm; lưu `window.scrollY` trước khi mở và khôi phục khi đóng.

- [ ] **Step 5: Manual checklist (ghi kết quả vào PR)**
  - Mở `index.html` bằng máy chủ cục bộ: `py -m http.server 8080` trong `handbook/`, vào `http://localhost:8080/#/edu/w`.
  - Bấm ô `8시간` của `상용·상시 근로자 × 채용 시 교육`: khung chỉ hiện nội dung ô đó, có 11 mục nội dung, ví dụ chia giờ, người dạy, hồ sơ, phạt 10 / 20 / 50 만원.
  - Màn hình 360px: dàn ý cây thu thành nút "트리 보기", bảng cuộn trong khung, không cuộn ngang toàn trang.
  - Nhập `ㅇㅇㄱㄹㅈ` vào ô tìm kiếm ở bảng `근로자 교육`: hiện `일용근로자`.

- [ ] **Step 6: Commit**

```bash
git add index.html css js tests && git commit -m "feat: tree navigation, matrices and cell detail UI"
```

---

### Task 6: Icon và hình minh họa vào repo

**Files:**
- Create: `handbook/assets/icons/*.png`, `handbook/tools/check_icons.py`, `handbook/tests/test_icons.py`
- Modify: `handbook/data/nodes.json`, các file JSON có trường `icon`

**Interfaces:**
- Produces: mọi giá trị `icon` trong JSON phải trỏ tới file có thật trong `assets/icons/<icon>.png`.

- [ ] **Step 1: Write the failing test** — `tests/test_icons.py`

```python
import glob, json, os, unittest

ROOT = os.path.join(os.path.dirname(__file__), "..")

def icons_in(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("icon", "i") and isinstance(v, str):
                yield v
            else:
                yield from icons_in(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from icons_in(v)

class IconTests(unittest.TestCase):
    def test_every_icon_reference_exists(self):
        missing = []
        for p in glob.glob(os.path.join(ROOT, "data", "*.json")):
            data = json.load(open(p, encoding="utf-8"))
            for name in icons_in(data):
                if not os.path.exists(os.path.join(ROOT, "assets", "icons", name + ".png")):
                    missing.append((os.path.basename(p), name))
        self.assertEqual(missing, [])

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `py -m unittest tests.test_icons -v` → Expected: FAIL nếu thư mục icon trống.

- [ ] **Step 3: Copy icons.** Sao chép `E:\agent skill\assets\icons\*.png` (40 file, tên `edu_*`, `health_*`, `measure_*`, `role_*`, `doc_*`) và các tile công việc đang dùng (`W1_3`, `W2_4`, `W3_9`, `W2_10`, `W2_5`, `X1_1`, `X1_6`, `W2_14`, `W2_2`, `W4_1`) từ `E:\Claud Cowork\SafePermit\icon image\work_tiles\` vào `assets/icons/`, đổi tên tile công việc thành `trade_rebar`, `trade_form`, `trade_scaf`, `trade_weld`, `trade_conc`, `trade_oper`, `trade_tower`, `trade_elec`, `trade_demo`, `trade_steel` và cập nhật tham chiếu trong JSON.

- [ ] **Step 4: Visual review.** Gọi agent `ks-visual-reviewer` cho 50 icon trong `assets/icons/` (đúng nội dung, không chữ, không lỗi hình). Hình FAIL: tạo lại bằng cách chỉnh trong Flow (dự án "HSE 핸드북 아이콘") rồi chụp lại theo ghi chú `flow-ui-notes.md`.

- [ ] **Step 5: Run test to verify it passes, then commit**

Run: `py -m unittest discover -s tests -v` → Expected: PASS

```bash
git add assets data tests && git commit -m "feat: bundle icons and verify references"
```

---

### Task 7: Lấp dữ liệu còn thiếu (kiểm chứng độc lập)

**Files:**
- Modify: `handbook/data/education.json`, `health.json`, `tasks.json`, `foreign.json`, `penalties.json`, `workers.json`
- Create: `handbook/data/sources.json` (danh sách nguồn đã đọc)

**Interfaces:**
- Consumes: `validate_dir`; kết quả đọc từ law.go.kr hoặc Open API.
- Produces: mỗi bản ghi mới hoặc đã sửa có `source` đầy đủ và `status` đúng.

Mỗi mục dưới đây là một bước; làm xong từng bước thì chạy `py tools/validate_data.py data` và commit riêng. Agent kiểm chứng độc lập (không phải agent nhập liệu) đọc lại nguồn và đối chiếu từng con số trước khi merge.

- [ ] **Step 1: Hạng mục khám 특수건강진단 và 배치전건강진단.** Đọc 고시 「근로자 건강진단 실시기준」 (고시 제2025-131호, hiệu lực 2026-01-01) từ moel.go.kr (trang `훈령·예규·고시`), trích `[별표]` 검사항목 cho: 소음, 광물성 분진, 목재 분진, 석면, 용접흄 và nhóm hóa chất thường gặp. Ghi vào `health.json` trường `items_1st`, `items_2nd`, `source`. Xóa nhận xét "구 기준" khi đã có bản mới.

- [ ] **Step 2: Nội dung 특별교육 cho 18 việc xây dựng** (`tasks.json`). Đọc `시행규칙 별표 5 제1호 라목` bằng trình xem PDF của law.go.kr (nạp từng trang bằng cách nhập số trang vào ô trang), ghi `contents` cho từng việc; kiểm tra tổng số việc là 39 và số của 18 việc xây dựng khớp.

- [ ] **Step 3: Nội dung 기초안전보건교육** (`education.json`, bản ghi `e5`). Đọc `시행규칙 별표 5 제2호` và ghi `contents`; đối chiếu 4 giờ với `별표 4 마목`.

- [ ] **Step 4: Dòng 별표 35 còn thiếu.** Đọc `시행령 별표 35` các dòng cho `법 제125조` (작업환경측정), `제129조`, `제130조`, `제54조②`, `제62조①`, `제68조①`; ghi `fines: [1차,2차,3차]` vào `penalties.json` với `unit` đúng. Nếu một dòng không đọc được thì giữ `status: "미확인"`, không nhập số.

- [ ] **Step 5: Ngoại kiện.** Đọc `법무부 체류자격별 허용 활동` (hikorea.go.kr / immigration.go.kr), `고용24 외국인고용관리`, và nguyên văn `외국인근로자의 고용 등에 관한 법률`; cập nhật `foreign.json` cho E-9, H-2, F-2, F-4, F-5, F-6, E-7, D-2/D-4; xác định `산업안전보건법 제31조의2` có hiệu lực hay không bằng trang `연혁` của 산업안전보건법 trên law.go.kr, ghi rõ ngày hiệu lực. Chỗ nào không xác nhận được thì ghi `미확인`.

- [ ] **Step 6: Giờ 정기교육 của 일용근로자 và 기간제**, giờ 현장실습생, và quy định 일반건강진단 cho từng loại hợp đồng (`시행규칙 별표 4` và các điều liên quan). Cập nhật các ô `확인` trong `workers.json` thành giá trị có nguồn hoặc giữ `확인` nếu nguyên văn không quy định (ghi `note: "별표 4에 칸 없음"`).

- [ ] **Step 7: So sánh bản hiện hành và bản sắp hiệu lực.** Với mỗi điều khoản trong `watchlist.json` (Task 8), mở trang `연혁` và so hai bản; ghi chênh lệch vào `data/sources.json` trường `version_diff`. Điều khoản có `시행일` ở tương lai phải có `future_ack: true` và nhãn "시행 예정" hiện trong chi tiết ô.

---

### Task 8: Kiểm tra cập nhật luật hằng ngày

**Files:**
- Create: `handbook/tools/fetch_law.py`, `handbook/tools/check_updates.py`, `handbook/data/watchlist.json`, `handbook/tests/test_fetch.py`

**Interfaces:**
- Produces: `fetch_article(law_name: str, jo_no: str, backend: str = "html") -> str` (văn bản thuần đã chuẩn hóa khoảng trắng), `text_hash(text: str) -> str` (sha256 hex), `diff_report(watchlist, current) -> list[dict]` mỗi phần tử `{id, old, new, changed}`; `check_updates.py` ghi `reports/YYYY-MM-DD.md`.

- [ ] **Step 1: Write the failing test** — `tests/test_fetch.py`

```python
import os, unittest
from tools.fetch_law import normalize, text_hash, diff_report

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "article_29.html")

class FetchTests(unittest.TestCase):
    def test_normalize_collapses_whitespace_and_strips_tags(self):
        html = "<p>제29조(근로자에 대한   안전보건교육)</p>\n<p>① 사업주는</p>"
        self.assertEqual(normalize(html), "제29조(근로자에 대한 안전보건교육) ① 사업주는")

    def test_same_text_same_hash(self):
        self.assertEqual(text_hash("가 나"), text_hash("가  나"))  # hash is of normalized text

    def test_diff_report_flags_changed_articles_only(self):
        watch = [{"id": "법29", "hash": text_hash("A")}, {"id": "법31", "hash": text_hash("B")}]
        current = {"법29": "A", "법31": "B2"}
        rep = {r["id"]: r["changed"] for r in diff_report(watch, current)}
        self.assertEqual(rep, {"법29": False, "법31": True})

    def test_missing_current_text_is_reported_as_error_not_unchanged(self):
        watch = [{"id": "법29", "hash": text_hash("A")}]
        rep = diff_report(watch, {})
        self.assertEqual(rep[0]["changed"], None)

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `py -m unittest tests.test_fetch -v` → Expected: FAIL (`ModuleNotFoundError: tools.fetch_law`).

- [ ] **Step 3: Write minimal implementation** — `tools/fetch_law.py`

```python
import hashlib, os, re, urllib.parse, urllib.request

def normalize(html):
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()

def text_hash(text):
    return hashlib.sha256(normalize(text).encode("utf-8")).hexdigest()

def diff_report(watchlist, current):
    out = []
    for w in watchlist:
        if w["id"] not in current:
            out.append({"id": w["id"], "old": w["hash"], "new": None, "changed": None})
            continue
        new = text_hash(current[w["id"]])
        out.append({"id": w["id"], "old": w["hash"], "new": new, "changed": new != w["hash"]})
    return out

def fetch_article(law_name, jo_no, backend="html"):
    if backend == "api":
        oc = os.environ.get("LAW_OC")
        if not oc:
            raise RuntimeError("LAW_OC is not set")
        q = urllib.parse.urlencode({"OC": oc, "target": "law", "type": "HTML", "LM": law_name, "JO": jo_no})
        url = "https://www.law.go.kr/DRF/lawService.do?" + q
    else:
        q = urllib.parse.urlencode({"lsClsCd": "L", "mode": "11", "lsNm": law_name, "joNo": jo_no})
        url = "https://www.law.go.kr/LSW/lsLinkProc.do?" + q
    with urllib.request.urlopen(url, timeout=30) as r:
        return normalize(r.read().decode("utf-8", "replace"))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `py -m unittest tests.test_fetch -v` → Expected: 4 tests PASS.

- [ ] **Step 5: Check whether plain HTTP returns the article text.** Run: `py -c "from tools.fetch_law import fetch_article; t=fetch_article('산업안전보건법','002900'); print(t[:200])"`. Nếu in ra nội dung `제29조(...)` thì dùng backend `html`. Nếu rỗng hoặc trang khung, thử `backend="api"` sau khi IP đã có hiệu lực (kiểm tra `curl.exe -4 "https://www.law.go.kr/DRF/lawSearch.do?OC=%LAW_OC%&target=law&type=JSON&query=산업안전보건법"` không còn "검증에 실패"). Nếu cả hai không chạy, ghi kết quả vào `docs/superpowers/notes/fetch-backend.md` và dùng chế độ đọc bằng trình duyệt (Claude in Chrome) cho đợt cập nhật.

- [ ] **Step 6: Write `check_updates.py` and the watchlist.** `data/watchlist.json` chứa `[{id, law, jo_no, hash}]` cho 20 điều khoản lõi: 법 제15·16·17·18·19·22·29·31·32·62·64·68·125·129·130·131·132·164·167·175; 시행령 제15·18·22·53·57; 시행규칙 제26·28·197·198·202·203·204·205; 중처법 제2·4·6. Lần chạy đầu ghi hash gốc. Các lần sau in báo cáo và thoát mã 2 nếu có điều khoản đổi, mã 3 nếu có điều khoản không tải được.

- [ ] **Step 7: Schedule locally and commit**

Chạy mỗi ngày bằng Task Scheduler trên máy cá nhân của bạn: `schtasks /Create /SC DAILY /TN "HSE-law-check" /TR "py E:\agent skill\handbook\tools\check_updates.py" /ST 07:00`. Không đặt trên GitHub Actions nếu API cần IP cố định.

```bash
git add tools data tests && git commit -m "feat: daily law watcher with hash diff"
```

---

### Task 9: Đăng lên GitHub Pages và quy trình duyệt

**Files:**
- Create: `handbook/.github/workflows/pages.yml`, `handbook/docs/RELEASE.md`

**Interfaces:**
- Consumes: kết quả `py tools/validate_data.py data` và `node --test tests` phải thành công trước khi đăng.

- [ ] **Step 1: Workflow đăng bài.** Tạo `.github/workflows/pages.yml` cho `push` lên nhánh `main`: bước 1 `actions/checkout`, bước 2 `py -m unittest discover -s tests`, bước 3 `node --test tests`, bước 4 `py tools/validate_data.py data`, bước 5 `actions/upload-pages-artifact` thư mục `handbook`, bước 6 `actions/deploy-pages`. Các bước kiểm tra phải đứng trước bước đăng.

- [ ] **Step 2: Việc của người dùng (không tự làm thay).** Người dùng tạo tài khoản GitHub, tạo kho và bật Pages (Settings → Pages → Source: GitHub Actions). Không đưa `LAW_OC` vào kho; chỉ lưu ở biến môi trường cục bộ.

- [ ] **Step 3: Quy trình duyệt cập nhật.** `docs/RELEASE.md` mô tả: `check_updates.py` báo điều khoản đổi → tạo nhánh `update/<ngày>` → agent luật sửa dữ liệu → agent kiểm chứng đối chiếu từng số với nguồn → mở Pull Request có bảng cũ/mới → người dùng duyệt rồi merge. Danh sách kiểm trước bản 1.0: chuyên viên pháp chế hoặc người làm giáo dục lâu năm đọc lại 4 bảng chính, so sánh bản hiện hành và bản sắp hiệu lực, xác nhận từng ô `확인` còn lại.

- [ ] **Step 4: Commit**

```bash
git add .github docs && git commit -m "ci: pages deploy gated by validator and tests"
```

---

### Task 10: Hoàn thiện thiết kế (tùy chọn, cần đồng ý)

**Files:**
- Modify: `handbook/css/app.css`, `handbook/index.html`

- [ ] **Step 1: Xin đồng ý.** Hỏi người dùng có đồng ý sao chép thủ công thư mục `skills/impeccable` từ `github.com/pbakaus/impeccable` (Apache 2.0) vào `~/.claude/skills/` hay không. Nếu không, bỏ Task này.

- [ ] **Step 2: Đọc trước khi dùng.** Đọc toàn bộ `SKILL.md` và các tệp trong thư mục đó; không chạy `npx impeccable install`, không cài hook, không tải binary, không bật telemetry. Báo lại người dùng những điểm đáng chú ý.

- [ ] **Step 3: Một lượt tinh chỉnh.** Áp dụng khoảng cách, thứ bậc chữ, trạng thái focus, độ tương phản (WCAG AA) cho `css/app.css`; chạy lại checklist thủ công của Task 5, không đổi dữ liệu.

- [ ] **Step 4: Commit**

```bash
git add css index.html && git commit -m "style: polish pass"
```

---

## Self-Review

**Spec coverage:** kiến trúc cây (Task 5), bảng và chi tiết ô (Tasks 4, 5), dữ liệu có nguồn và validator (Tasks 1, 2), lĩnh vực 교육·보건 và người nước ngoài (Tasks 2, 7), mức phạt theo người (Tasks 3, 4), icon (Task 6), cập nhật hằng ngày và duyệt (Tasks 8, 9), công cụ thiết kế (Task 10), ⭐ chỉ khi có thống kê (Task 1 test `star requires stats.source`). Đã có chỗ cho điểm mở trong spec mục 13: bản hiện hành so với bản sắp hiệu lực (Task 7 Step 7), IP Open API (Task 8 Step 5), tên chức vụ nội bộ do người dùng bổ sung vào `roles.json` (không có task riêng, người dùng cung cấp).

**Gap noted:** hai tên chức vụ nói bằng giọng nói chưa xác nhận ("Phú Công Quản Lý Cha", nhóm "cho cấp khéo so") vẫn chờ người dùng; plan không giả định.

**Placeholder scan:** các bước dữ liệu ở Task 7 là việc đọc nguồn cụ thể có điều khoản và đường dẫn rõ; không có chỗ "TBD".

**Type consistency:** `parseHours`, `alloc`, `clampCount`, `fineTotal`, `pathOf` định nghĩa ở Task 3 và dùng đúng tên ở Tasks 4, 5. `workerCell` ở Task 4; các hàm `healthCell` và các hàm cùng khuôn ở Task 5 theo `CellDetail` đã định nghĩa.

**Review Focus coverage:** (1) ô chưa xác minh: test `unverified cell warns` (Task 4); (2) số người: test `clampCount`, `fineTotal` (Task 3); (3) tìm kiếm ký tự đặc biệt: test `hit` (Task 3); (4) thiếu ngày hiệu lực hoặc ngày tương lai: tests Task 1; (5) màn hình 360px và Esc: checklist thủ công Task 5 Step 5.
