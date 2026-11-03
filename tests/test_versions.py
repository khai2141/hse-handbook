import json, os, sys, unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from tools.compare_versions import diff_lines, effective_date  # noqa: E402


def load(n):
    with open(os.path.join(ROOT, "data", n), encoding="utf-8") as f:
        return json.load(f)


class DiffLines(unittest.TestCase):
    A = "[시행 2026. 6. 1.] [법률 제1호] 제1조(목적) ① 가나다. ② 라마바."
    B = "[시행 2027. 4. 28.] [법률 제2호] 제1조(목적) ① 가나다. ② 라마바 수정."

    def test_prefixes(self):
        d = diff_lines(self.A, self.B)
        self.assertEqual(d, ["현행: ② 라마바.", "예정: ② 라마바 수정."])

    def test_same_body_no_diff(self):
        self.assertEqual(diff_lines(self.A, self.A.replace("2026. 6. 1.", "2027. 1. 1.")), [])

    def test_limit(self):
        a = "[시행 2026. 1. 1.] " + " ".join("① x%d." % i for i in range(10))
        self.assertEqual(len(diff_lines(a, "[시행 2027. 1. 1.] 없음")), 6)

    def test_effective_date(self):
        self.assertEqual(effective_date("[시행 2027. 4. 28.] [법률]"), "2027-04-28")
        self.assertIsNone(effective_date(""))


class VersionsFile(unittest.TestCase):
    def test_every_watch_id(self):
        v = load("versions.json")
        self.assertRegex(v["checked_at"], r"^\d{4}-\d{2}-\d{2}$")
        for w in load("watchlist.json"):
            e = v["entries"].get(w["id"])
            self.assertIsNotNone(e, w["id"])
            if "error" in e:
                continue
            self.assertIsInstance(e["differs"], bool, w["id"])
            self.assertTrue(e["in_force_header"] and e["latest_header"], w["id"])


if __name__ == "__main__":
    unittest.main()
