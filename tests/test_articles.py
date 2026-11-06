import json, os, re, sys, unittest

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, ROOT)
from tools.capture_articles import LAW_PREFIX, card_id, raw_name  # noqa: E402
from tools.validate_data import single_sentence  # noqa: E402
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
        pilot = [r for r in self.recs if r["jo"] in PILOT and r["law"] == "산업안전보건기준에 관한 규칙"]
        self.assertEqual({r["raw"] for r in pilot}, {"safety_rules_raw.txt"})
        for r in self.recs:
            self.assertIn(r["law"], LAW_PREFIX, r["id"])

    def test_id_prefix_and_raw_name_follow_law(self):
        for r in self.recs:
            self.assertEqual(r["id"], card_id(r["law"], r["jo"]), r["id"])
            if r["raw"] != "safety_rules_raw.txt" and r["law"] != "산업안전보건기준에 관한 규칙":
                self.assertEqual(r["raw"], raw_name(r["law"], r["branch"]), r["id"])

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
            m = re.search(r"### %s %s \| url: (\S+) \| captured: \S+ \| header: \[시행 (\d+)\. (\d+)\. (\d+)\.\] \[[^\]]*?제\d+호, (\d{4})\. (\d+)\. (\d+)\." % (re.escape(r["law"]), r["jo"]), self.rawof(r))
            self.assertTrue(m, r["id"])
            self.assertEqual(s["url"], m.group(1))
            self.assertEqual(s["effective"], "%s-%02d-%02d" % (m.group(2), int(m.group(3)), int(m.group(4))))
            self.assertEqual(s["published"], "%s-%02d-%02d" % (m.group(5), int(m.group(6)), int(m.group(7))), r["id"])
            self.assertIn(s["verified_at"], ("2026-11-04", "2026-11-05"))

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
            lo = 1 if single_sentence(r["text"]) else 2  # a one-sentence article gets one honest bullet
            self.assertTrue(lo <= len(r["must"]) <= 6, r["id"])
            self.assertTrue(r["check"], r["id"])
            self.assertIsInstance(r["records"], list)
            self.assertTrue(r["group"])


if __name__ == "__main__":
    unittest.main()


class PenaltyLinkTest(unittest.TestCase):
    def test_penalty_ids_match_link_tool(self):
        from tools.link_penalties import compute, ART, PEN
        arts = load("data", "articles.json")["records"]
        pens = load("data", "penalties.json")["records"]
        want = compute(arts, pens)
        for r in arts:
            self.assertEqual(r["penalty_ids"], want[r["id"]], r["id"])
