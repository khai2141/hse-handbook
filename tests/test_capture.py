import os, unittest
from tools.capture_articles import jo_to_no, jo_label, parse_header, format_block, capture, main
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


if __name__ == "__main__":
    unittest.main()
