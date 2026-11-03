import json, os, re, unittest
from tools.fetch_law import normalize, text_hash, diff_report, extract_article, header_line

HERE = os.path.dirname(__file__)
FIX = os.path.join(HERE, "fixtures")
WATCH = os.path.join(HERE, "..", "data", "watchlist.json")


def read(name):
    with open(os.path.join(FIX, name), encoding="utf-8") as f:
        return f.read()


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


class ExtractTests(unittest.TestCase):
    CASES = [("article_29.html", "제29조(근로자에 대한 안전보건교육)"),
             ("decree_15.html", "제15조(관리감독자의 업무 등)")]

    def test_extract_contains_title_and_header(self):
        for name, title in self.CASES:
            t = extract_article(read(name))
            self.assertIn(title, t, name)
            self.assertRegex(t, r"\[시행 [^\]]+\] \[[^\]]+\]", name)
            self.assertRegex(header_line(read(name)), r"^\[시행 .*\]$")

    def test_extract_keeps_unescaped_annotation(self):
        t = extract_article(read("article_29.html"))
        self.assertIn("<개정 2020.6.9>", t)
        self.assertRegex(t, r"\[시행 [^\]]+\] \[[^\]]+\]")

    def test_hash_differs_on_annotation_only_change(self):
        self.assertNotEqual(text_hash("① 가 <개정 2020.6.9>"), text_hash("① 가 <개정 2021.1.1>"))

    def test_extract_has_no_script_or_nav(self):
        for name, _ in self.CASES:
            t = extract_article(read(name))
            for bad in ("<script", "function(", "var ", "jquery", "전체보기"):
                self.assertNotIn(bad, t, name)

    def test_extract_stable_when_script_token_changes(self):
        for name, _ in self.CASES:
            html = read(name)
            mutated = re.sub(r"Time=\d+", "Time=1234567890", html)
            mutated = mutated.replace("</script>", "/*tok9f3a*/</script>", 1)
            self.assertNotEqual(html, mutated)
            self.assertEqual(text_hash(extract_article(html)), text_hash(extract_article(mutated)))


EXPECTED_IDS = (["법%d" % n for n in (15, 16, 17, 18, 19, 22, 29, 31, 32, 62, 64, 68, 125, 129, 130, 131, 132, 164, 167, 175)]
                + ["령%d" % n for n in (15, 18, 22, 53, 57)]
                + ["규칙%d" % n for n in (26, 28, 197, 198, 202, 203, 204, 205)]
                + ["중처%d" % n for n in (2, 4, 6, 7)])


class WatchlistTests(unittest.TestCase):
    def test_watchlist_has_37_ids_with_hashes(self):
        with open(WATCH, encoding="utf-8") as f:
            w = json.load(f)
        self.assertEqual(sorted(e["id"] for e in w), sorted(EXPECTED_IDS))
        self.assertEqual(len(w), 37)
        for e in w:
            self.assertRegex(e["hash"], r"^[0-9a-f]{64}$")


if __name__ == "__main__":
    unittest.main()
