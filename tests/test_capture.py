import os, unittest
import tempfile
from unittest import mock
from tools import capture_articles as ca
from tools.capture_articles import jo_to_no, jo_label, parse_header, format_block, capture, main, body_of, describe_diff, cross_check
from tools.fetch_law import extract_article

FIX = os.path.join(os.path.dirname(__file__), "fixtures")
LAW = "산업안전보건기준에 관한 규칙"
GOOD = LAW + " [시행 2025. 12. 1.] [고용노동부령 제454호, 2025. 12. 1., 일부개정] 제13조(안전난간의 구조 및 설치요건) 사업주는 ... 1. 가 2. 나"


class JoTests(unittest.TestCase):
    def test_jo_no(self):
        self.assertEqual(jo_to_no("38"), "003800")
        self.assertEqual(jo_to_no("241-2"), "024102")
        self.assertEqual(jo_to_no("13"), "001300")
        with self.assertRaises(ValueError):
            jo_to_no("x")

    def test_label(self):
        self.assertEqual(jo_label("241-2"), "제241조의2")
        self.assertEqual(jo_label("13"), "제13조")


class HeaderTests(unittest.TestCase):
    def test_parse(self):
        i = parse_header(GOOD, "제13조")
        self.assertEqual(i["effective"], "2025-12-01")
        self.assertEqual(i["published"], "2025-12-01")
        self.assertEqual(i["title"], "안전난간의 구조 및 설치요건")
        self.assertEqual(i["header"], "[시행 2025. 12. 1.] [고용노동부령 제454호, 2025. 12. 1., 일부개정]")

    def test_parse_fixture(self):
        with open(os.path.join(FIX, "article_29.html"), encoding="utf-8") as f:
            i = parse_header(extract_article(f.read()), "제29조")
        self.assertRegex(i["effective"], r"^\d{4}-\d\d-\d\d$")
        self.assertIn("안전보건교육", i["title"])

    def test_missing_header_or_title_or_mismatch(self):
        with self.assertRaises(ValueError):
            parse_header("제13조(가) 본문")
        with self.assertRaises(ValueError):
            parse_header(LAW + " [시행 2025. 12. 1.] [고용노동부령 제454호, 2025. 12. 1., 일부개정] 본문만")
        with self.assertRaises(ValueError):
            parse_header(GOOD, "제14조")

    def test_format_block(self):
        b = format_block(LAW, "제13조", "https://x", "2026-11-04", "[시행 a] [b]", "가  나")
        self.assertTrue(b.startswith("### %s 제13조 | url: https://x | captured: 2026-11-04 | header: [시행 a] [b]\n가 나\n" % LAW))


class CaptureTests(unittest.TestCase):
    def stub(self, law, no, ef_yd=None):
        if no == "009900":
            raise RuntimeError("fetch failed")
        n = int(no[:4])
        return LAW + " [시행 2025. 12. 1.] [고용노동부령 제454호, 2025. 12. 1., 일부개정] 제%d조(제목) 본문" % n

    def test_sorted_and_url_has_efyd(self):
        out = capture(LAW, ["57", "13"], "20261104", fetch=self.stub)
        self.assertTrue(out[0][1].startswith("### %s 제13조" % LAW))
        self.assertIn("efYd=20261104", out[0][1])
        self.assertIn("joNo=001300", out[0][1])

    def test_failure_raises_and_cli_writes_nothing(self):
        with self.assertRaises(RuntimeError):
            capture(LAW, ["13", "99"], "20261104", fetch=self.stub)


H_OLD = " [시행 2025. 12. 1.] [고용노동부령 제454호, 2025. 12. 1., 일부개정] "
H_NEW = " [시행 2025. 9. 1.] [고용노동부령 제450호, 2025. 9. 1., 일부개정] "


def two_version_stub(law, no, ef_yd=None):
    n = int(no[:4])
    tail = " 이 경우 성능인증을 받은 것을 사용해야 한다." if (n == 241 and ef_yd is None) else ""
    return LAW + (H_NEW if ef_yd is None else H_OLD) + "제%d조(제목) 4. 비산방지조치%s 5. 환기" % (n, tail)


class CrossCheckTests(unittest.TestCase):
    def test_body_strips_header(self):
        self.assertEqual(body_of(LAW + H_OLD + "제13조(가)  본문"), "제13조(가) 본문")

    def test_describe_diff(self):
        self.assertEqual(describe_diff("a b c", "a b x y c"), "+[x y]")
        self.assertEqual(describe_diff("a b c", "a c"), "-[b]")
        self.assertEqual(describe_diff("a b", "a b"), "(identical)")

    def test_cross_check_flags_only_differing(self):
        res = cross_check(LAW, ["241", "13"], "20261104", fetch=two_version_stub)
        self.assertEqual([r["label"] for r in res], ["제13조", "제241조"])
        self.assertFalse(res[0]["differs"])  # header differs, body same -> not flagged
        self.assertTrue(res[1]["differs"])
        self.assertIn("성능인증", res[1]["summary"])
        self.assertIn("efYd=20261104", res[1]["efyd"]["url"])
        self.assertNotIn("efYd", res[1]["latest"]["url"])

    def _run(self, prefer):
        d = tempfile.mkdtemp()
        out, rep = os.path.join(d, "raw.txt"), os.path.join(d, "rep.txt")
        with mock.patch.object(ca, "_fetch", two_version_stub), mock.patch("sys.stderr") as err:
            rc = main(["--law", LAW, "--jo", "241", "13", "--out", out, "--date", "20261104",
                       "--prefer", prefer, "--diff-report", rep, "--delay", "0"])
        warn = "".join(str(c.args[0]) for c in err.write.call_args_list)
        return rc, open(out, encoding="utf-8").read(), open(rep, encoding="utf-8").read(), warn

    def test_cli_prefer_latest_writes_in_force_text_and_warns(self):
        rc, raw, rep, warn = self._run("latest")
        self.assertEqual(rc, 0)
        self.assertIn("성능인증", raw)
        self.assertIn("header: [시행 2025. 9. 1.]", raw)
        self.assertIn("1 differ", rep)
        self.assertIn("제241조 |", rep)
        self.assertIn("WARNING: 제241조", warn)
        self.assertNotIn("제13조 differs", warn)

    def test_cli_prefer_efyd(self):
        rc, raw, rep, warn = self._run("efyd")
        self.assertNotIn("성능인증", raw)
        self.assertIn("efYd=20261104", raw)


if __name__ == "__main__":
    unittest.main()
