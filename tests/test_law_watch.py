import os, sys, unittest

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, ROOT)
from tools.law_watch import classify, clause_diff, header_key  # noqa: E402

H_OLD = "[시행 2026. 6. 1.] [법률 제21374호, 2026. 2. 19., 일부개정]"
H_NEW = "[시행 2027. 4. 28.] [법률 제22122호, 2026. 10. 27., 일부개정]"
BODY = "제9조(예시) ① 사업주는 난간을 설치하여야 한다. ② 높이는 90센티미터 이상으로 한다."
BODY2 = "제9조(예시) ① 사업주는 난간을 설치하여야 한다. ② 높이는 100센티미터 이상으로 한다. ③ 기록을 보존한다."
page = lambda header, body: "산업안전보건법 %s %s" % (header, body)


def boom():
    raise AssertionError("in-force text must not be fetched when the latest text already matches")


class LawWatchTest(unittest.TestCase):
    def test_unchanged_needs_one_request(self):
        self.assertIsNone(classify(BODY, page(H_NEW, BODY), boom, "20261110"))

    def test_pending_when_only_the_latest_text_differs(self):
        r = classify(BODY, page(H_NEW, BODY2), lambda: page(H_OLD, BODY), "20261110")
        self.assertEqual(r["state"], "pending")
        self.assertEqual(r["effective"], "2027-04-28")
        self.assertEqual(r["lines"], ["변경 전: ② 높이는 90센티미터 이상으로 한다.", "변경 후: ② 높이는 100센티미터 이상으로 한다.", "신설: ③ 기록을 보존한다."])

    def test_stale_when_the_text_in_force_differs(self):
        r = classify(BODY, page(H_NEW, BODY2), lambda: page(H_OLD, BODY2), "20261110")
        self.assertEqual(r["state"], "stale")
        self.assertEqual(r["header"], H_OLD)

    def test_latest_already_in_force_wins_over_the_efyd_text(self):
        # law.go.kr's efYd page can omit a deferred clause; when the latest version is in force, compare with it
        r = classify(BODY, page(H_OLD, BODY2), lambda: page(H_OLD, BODY + " ④ 누락"), "20261110")
        self.assertEqual((r["state"], r["header"]), ("stale", H_OLD))
        self.assertIn("신설: ③ 기록을 보존한다.", r["lines"])

    def test_amendment_date_tags_alone_are_not_a_change(self):
        tagged = BODY.replace("설치하여야 한다.", "설치하여야 한다. <개정 2026.2.19>")
        self.assertEqual(clause_diff(BODY, tagged), [])
        self.assertIsNone(classify(BODY, page(H_NEW, tagged), lambda: page(H_OLD, BODY), "20261110"))

    def test_long_diffs_are_capped(self):
        new = BODY + "".join(" %d. 항목%d" % (i, i) for i in range(1, 30))
        self.assertTrue(clause_diff(BODY, new)[-1].startswith("… 외"))

    def test_header_key_orders_by_promulgation_date_not_by_text(self):
        a = "[시행 2025. 9. 1.] [고용노동부령 제450호, 2025. 9. 1., 일부개정]"
        b = "[시행 2026. 3. 2.] [고용노동부령 제454호, 2025. 12. 1., 일부개정]"
        self.assertGreater(header_key(b), header_key(a))


if __name__ == "__main__":
    unittest.main()
