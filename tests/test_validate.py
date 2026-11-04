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

    def test_unverified_star_requires_stats_source(self):
        rec = {"id": "x", "status": "미확인", "star": True}
        with tempfile.TemporaryDirectory() as t:
            errs = validate_file(write(t, "a.json", {"records": [rec]}))
            self.assertTrue(any("star" in e for e in errs))

    def test_unverified_star_with_stats_source_passes(self):
        rec = {"id": "x", "status": "미확인", "star": True,
               "stats": {"source": "https://www.kosha.or.kr/x"}}
        with tempfile.TemporaryDirectory() as t:
            self.assertEqual(validate_file(write(t, "a.json", {"records": [rec]})), [])

    def test_future_effective_must_be_flagged(self):
        rec = json.loads(json.dumps(GOOD)); rec["source"]["effective"] = "2099-01-01"
        with tempfile.TemporaryDirectory() as t:
            errs = validate_file(write(t, "a.json", {"records": [rec]}))
            self.assertTrue(any("future" in e for e in errs))
            rec["source"]["future_ack"] = True
            self.assertEqual(validate_file(write(t, "b.json", {"records": [rec]})), [])

class DataDirTests(unittest.TestCase):
    DATA = os.path.join(os.path.dirname(__file__), "..", "data")

    def test_core_files_exist(self):
        for n in ("workers.json", "education.json", "penalties.json"):
            self.assertTrue(os.path.exists(os.path.join(self.DATA, n)), n)

    def test_repo_data_is_valid(self):
        from tools.validate_data import validate_dir
        self.assertEqual(validate_dir(self.DATA), [])

if __name__ == "__main__":
    unittest.main()


ART = {"id": "sr-1", "law": "L", "jo": "제1조", "title": "t", "branch": "b", "group": "g", "text": "제1조(t) 본문",
       "must": ["가", "나"], "who": "사업주", "check": ["다"], "records": [], "see": [], "penalty_ids": [],
       "status": "확인", "raw": "r.txt",
       "source": {"url": "https://www.law.go.kr/x", "published": "2025-12-01", "effective": "2025-12-01", "verified_at": "2026-11-04"}}


class ArticleValidateTests(unittest.TestCase):
    def run_one(self, rec):
        with tempfile.TemporaryDirectory() as t:
            return validate_file(write(t, "articles.json", {"records": [rec]}))

    def test_good_article_passes(self):
        self.assertEqual(self.run_one(ART), [])

    def test_article_required_fields_and_must_size(self):
        bad = dict(ART); del bad["text"]
        self.assertTrue(any("text" in e for e in self.run_one(bad)))
        bad = dict(ART, must=["a"] * 7)
        self.assertTrue(any("must" in e for e in self.run_one(bad)))
        bad = dict(ART, see="sr-2")
        self.assertTrue(any("see" in e for e in self.run_one(bad)))

    def test_article_requires_raw(self):
        bad = dict(ART)
        del bad["raw"]
        self.assertTrue(any("'raw'" in e for e in self.run_one(bad)))

    def test_future_article_needs_ack(self):
        bad = json.loads(json.dumps(ART)); bad["source"]["effective"] = "2999-01-01"
        self.assertTrue(any("future" in e for e in self.run_one(bad)))
        bad["source"]["future_ack"] = True
        self.assertEqual(self.run_one(bad), [])

    def test_unverified_article_carries_no_numbers(self):
        rec = dict(ART, status="미확인", must=["2미터"])
        self.assertTrue(any("미확인" in e for e in self.run_one(rec)))
