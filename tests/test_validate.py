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
