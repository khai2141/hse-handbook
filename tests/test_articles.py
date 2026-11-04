import json, os, re, unittest

ROOT = os.path.join(os.path.dirname(__file__), "..")
col = lambda t: re.sub(r"\s+", " ", t).strip()
UNIT = re.compile(r"\d+(\.\d+)?\s*(미터|센티미터|밀리미터|킬로그램|도|초|분|시간|m|cm|mm|kg)")


def load(*p):
    with open(os.path.join(ROOT, *p), encoding="utf-8") as f:
        return json.load(f)


PILOT = ["제13조", "제32조", "제35조", "제37조", "제38조", "제39조", "제42조", "제43조", "제44조", "제57조", "제59조", "제68조"]


class ArticleDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.recs = load("data", "articles.json")["records"]
        cls.raws = {}
        for r in cls.recs:
            name = r.get("raw")
            if not name:
                raise AssertionError("%s: raw missing" % r["id"])
            if name not in cls.raws:
                path = os.path.join(ROOT, "sources", name)
                if not os.path.isfile(path):
                    raise AssertionError("%s: raw file absent: %s" % (r["id"], name))
                cls.raws[name] = col(open(path, encoding="utf-8").read())

    def rawof(self, r):
        return self.raws[r["raw"]]

    def test_pilot_cards_present_and_law_set(self):
        jos = [r["jo"] for r in self.recs]
        for j in PILOT:
            self.assertIn(j, jos)
        pilot = [r for r in self.recs if r["jo"] in PILOT]
        self.assertEqual({r["raw"] for r in pilot}, {"safety_rules_raw.txt"})
        for r in self.recs:
            self.assertEqual(r["law"], "산업안전보건기준에 관한 규칙")

    def test_ids_unique_and_references_resolve(self):
        ids = [r["id"] for r in self.recs]
        self.assertEqual(len(ids), len(set(ids)))
        pen = {p["id"] for p in load("data", "penalties.json")["records"]}
        nodes = load("data", "nodes.json")["nodes"]
        for r in self.recs:
            self.assertIn(r["branch"], nodes, r["id"])
            for s in r["see"]:
                self.assertIn(s, ids, r["id"])
                self.assertNotEqual(s, r["id"])
            for p in r["penalty_ids"]:
                self.assertIn(p, pen, r["id"])

    def test_text_is_verbatim_from_capture(self):
        for r in self.recs:
            self.assertIn(col(r["text"]), self.rawof(r), r["id"])
            self.assertTrue(r["text"].startswith(r["jo"] + "(" + r["title"] + ")"), r["id"])
            self.assertNotIn("[시행", r["text"], r["id"])

    def test_source_matches_capture_header(self):
        for r in self.recs:
            s = r["source"]
            self.assertTrue(s["url"].startswith("https://www.law.go.kr/"), r["id"])
            m = re.search(r"### 산업안전보건기준에 관한 규칙 %s \| url: (\S+) \| captured: \S+ \| header: \[시행 (\d+)\. (\d+)\. (\d+)\.\]" % r["jo"], self.rawof(r))
            self.assertTrue(m, r["id"])
            self.assertEqual(s["url"], m.group(1))
            self.assertEqual(s["effective"], "%s-%02d-%02d" % (m.group(2), int(m.group(3)), int(m.group(4))))
            self.assertEqual(s["verified_at"], "2026-11-04")

    def test_source_note_and_in_force_241(self):
        for r in self.recs:
            if "note" in r["source"]:
                self.assertIsInstance(r["source"]["note"], str, r["id"])
                self.assertTrue(r["source"]["note"].strip(), r["id"])
        r241 = [r for r in self.recs if r["id"] == "sr-241"][0]
        self.assertIn("성능인증을 받은 것을 사용해야 한다", r241["text"])
        self.assertIn("2026-03-02", r241["source"]["note"])

    def test_numbers_with_units_come_from_text(self):
        for r in self.recs:
            text = col(r["text"])
            for field in ("must", "check"):
                for item in r[field]:
                    for m in UNIT.finditer(item):
                        self.assertIn(col(m.group(0)), text, (r["id"], field, m.group(0)))

    def test_shape(self):
        for r in self.recs:
            self.assertEqual(r["status"], "확인")
            self.assertTrue(2 <= len(r["must"]) <= 6, r["id"])
            self.assertTrue(r["check"], r["id"])
            self.assertIsInstance(r["records"], list)
            self.assertTrue(r["group"])


if __name__ == "__main__":
    unittest.main()
