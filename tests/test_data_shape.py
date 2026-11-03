import json, os, unittest

DATA = os.path.join(os.path.dirname(__file__), "..", "data")

def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)

def recs(name):
    return load(name)["records"]

class DataShapeTests(unittest.TestCase):
    def test_workers(self):
        rs = [r for r in recs("workers.json") if "g" not in r]
        self.assertEqual(len(rs), 18)
        for r in rs:
            for k in ("name", "sub", "group"):
                self.assertIn(k, r, r["id"])
            self.assertEqual(len(r["cells"]), 5, r["id"])
            for c in r["cells"]:
                self.assertIn("t", c); self.assertIn("k", c)
            self.assertEqual(len(r["rule_by_col"]), 5, r["id"])

    def test_education(self):
        by = {r["id"]: r for r in recs("education.json")}
        for i in ("e1", "e2", "e3", "e4", "e5"):
            r = by[i]
            self.assertTrue(r["name"])
            self.assertTrue(isinstance(r["contents"], list) and r["contents"], i)
            self.assertIsInstance(r["fine"] if r["status"] != "미확인" else [], list)
            self.assertIn(r["unit"], ("1명", "건"))

    def test_nodes(self):
        n = load("nodes.json")["nodes"]
        self.assertIn("home", n); self.assertIn("edu.w", n)

    def test_counts(self):
        pens = recs("penalties.json")
        self.assertEqual([r["id"] for r in pens], ["p%d" % (i + 1) for i in range(len(pens))])
        self.assertGreaterEqual(len(pens), 32)
        self.assertEqual(len(recs("env.json")), 8)
        self.assertEqual(len(recs("tasks.json")), 18)

    def test_unverified_have_no_source(self):
        for f in os.listdir(DATA):
            if f.endswith(".json") and f not in ("nodes.json", "meta.json"):
                for r in recs(f):
                    if r.get("status") == "미확인":
                        self.assertNotIn("source", r, f"{f}#{r.get('id')}")

    def test_roles_removed(self):
        ids = {r["id"] for r in recs("roles.json")}
        self.assertFalse(ids & {"stf", "cm"})

    def test_byeolpyo5_contents(self):
        import re
        norm = lambda x: re.sub(r"\s+", " ", x).strip()
        with open(os.path.join(os.path.dirname(__file__), "..", "sources", "byeolpyo5_raw.txt"), encoding="utf-8") as f:
            raw = norm(f.read())
        tasks = recs("tasks.json")
        self.assertEqual(len(tasks), 18)
        for t in tasks:
            self.assertTrue(isinstance(t.get("contents"), list) and t["contents"], t["id"])
            for c in t["contents"]:
                self.assertIn(norm(c), raw, f"task {t['id']}: {c}")
        e5 = {r["id"]: r for r in recs("education.json")}["e5"]
        self.assertTrue(e5["contents"])
        for c in e5["contents"]:
            self.assertNotIn("읽지 못했습니다", c)
            self.assertIn(norm(c), raw, f"e5: {c}")
        hrs = e5.get("contents_hours")
        if hrs:
            self.assertEqual(sum(h["hours"] for h in hrs), 4)

    # ---- Task 7B: verbatim checks against captured raw text ----
    NEW_PEN = {
        "p21": (r"법\s*제125조제1항\s*및법제175조제4", [20, 50, 100], "1명"),
        "p22": (r"법\s*제125조제1항\s*및법제175조제5", [100, 300, 500], "건"),
        "p23": (r"법\s*제125조제4항", [500, 500, 500], "건"),
        "p24": (r"법\s*제125조제6항", [100, 300, 500], "건"),
        "p25": (r"법\s*제125조제7항", [100, 300, 500], "건"),
        "p26": (r"법\s*제129조제1항또는", [10, 20, 30], "1명"),
        "p27": (r"법\s*제132조제1항", [500, 500, 500], "건"),
        "p28": (r"법\s*제132조제2항전단", [100, 300, 500], "건"),
        "p29": (r"법\s*제132조제3항", [300, 300, 300], "건"),
        "p30": (r"법\s*제54조제2항\(", [3000, 3000, 3000], "건"),
        "p31": (r"법\s*제62조제1항", [500, 500, 500], "건"),
        "p32": (r"법\s*제68조제1항", [500, 500, 500], "건"),
    }

    def test_byeolpyo35_verbatim(self):
        import re
        here = os.path.dirname(__file__)
        with open(os.path.join(here, "..", "sources", "byeolpyo35_raw.txt"), encoding="utf-8") as f:
            raw = re.sub(r"\s+", " ", f.read())
        by = {r["id"]: r for r in recs("penalties.json")}
        for pid, (marker, amts, unit) in self.NEW_PEN.items():
            self.assertIn(pid, by)
            r = by[pid]
            self.assertEqual(r["a"], amts, pid)
            self.assertEqual(r["fines"], amts, pid)
            self.assertEqual(r["unit"], unit, pid)
            self.assertEqual(r["k"], "과태료")
            self.assertEqual(r["status"], "확인")
            self.assertEqual(r["max"], max(amts))
            self.assertTrue(r["art"].startswith("별표 35 · 법 제"), pid)
            m = re.search(marker, raw)
            self.assertIsNotNone(m, f"{pid} marker {marker}")
            fmt = lambda n: f"{n:,}"
            tri = r"[ ¦]+".join(re.escape(fmt(n)) for n in amts)
            window = raw[m.start(): m.start() + 450]
            self.assertRegex(window, r"(?<![\d,])" + tri + r"(?![\d,])", f"{pid} triple {amts}")

    def test_byeolpyo4_hours_verbatim(self):
        import re
        here = os.path.dirname(__file__)
        with open(os.path.join(here, "..", "sources", "byeolpyo4_raw.txt"), encoding="utf-8") as f:
            raw = re.sub(r"\s+", "", f.read())
        for w in recs("workers.json"):
            if "cells" not in w:
                continue
            for i, c in enumerate(w["cells"]):
                if c["k"] == "y":
                    for h in re.findall(r"\d+시간", c["t"]):
                        self.assertIn(h, raw, f"{w['id']} cell {i}: {c['t']}")
                if c["t"] == "확인":
                    self.assertEqual(c["k"], "q")
                    self.assertEqual(c.get("note"), "별표 4에 칸 없음", f"{w['id']} cell {i}")

    def test_health_items_verbatim(self):
        import re
        here = os.path.dirname(__file__)
        with open(os.path.join(here, "..", "sources", "geonganjindan_raw.txt"), encoding="utf-8") as f:
            raw = re.sub(r"\s+", "", f.read())
        by_id = {r["id"]: r for r in recs("health.json")}
        self.assertIn("items_source_note", load("health.json"))
        for hid in ("h2", "h3"):
            rec = by_id[hid]
            self.assertTrue(rec["by_hazard"], hid)
            self.assertEqual(rec["source"]["effective"], "2026-01-01")
            for e in rec["by_hazard"]:
                self.assertIn(re.sub(r"\s+", "", e["hazard"]), raw)
                self.assertTrue(e["items_1st"] and e["items_2nd"])
                for s in e["items_1st"] + e["items_2nd"]:
                    self.assertIn(re.sub(r"\s+", "", s), raw, f"{hid} {e['hazard']}: {s}")
            self.assertFalse([l for l in rec["it"] if "아직 읽지 못함" in l or "구 기준" in l])

    def test_foreign_records(self):
        import re
        here = os.path.dirname(__file__)
        with open(os.path.join(here, "..", "sources", "foreign_raw.txt"), encoding="utf-8") as f:
            raw = re.sub(r"\s+", "", f.read())
        generic = "https://www.law.go.kr/LSW/lsLinkProc.do?lsClsCd=L&mode=11&lsNm=산업안전보건법"
        recs_f = recs("foreign.json")
        self.assertTrue(any(r["status"] != "미확인" for r in recs_f))
        for r in recs_f:
            if r["status"] in ("확인", "일부 확인"):
                src = r.get("source") or {}
                self.assertTrue(src.get("url"), r["id"])
                self.assertNotEqual(src["url"], generic, r["id"])
                self.assertTrue(r.get("quotes"), f"{r['id']}: no quotes")
                for q in r["quotes"]:
                    self.assertTrue(q["article"] and q["text"], r["id"])
                    self.assertIn(re.sub(r"\s+", "", q["text"]), raw, f"{r['id']} {q['article']}")
            else:
                self.assertNotIn("source", r, r["id"])
                for c in (r["c"], r["pr"], r["ed"]):
                    self.assertFalse(re.search(r"\d", c["t"]), f"{r['id']}: {c['t']}")
        meta = load("meta.json")
        self.assertFalse([l for l in meta["foreign_edu"] if "확인하지 못했습니다" in l and "31조의2" in l])
        self.assertTrue(any("제31조의2" in l and "2027" in l for l in meta["foreign_edu"]))
        self.assertTrue(any("정책 발표(법령 아님)" in l for l in meta["foreign_edu"]))

if __name__ == "__main__":
    unittest.main()
