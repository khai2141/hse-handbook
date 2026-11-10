import os, sys, unittest

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, ROOT)
from tools.law_watch import apply_dates, check_extra, classify, clause_diff, header_key, horizon, split_tail  # noqa: E402

H_OLD = "[시행 2026. 6. 1.] [법률 제21374호, 2026. 2. 19., 일부개정]"
H_NEW = "[시행 2027. 4. 28.] [법률 제22122호, 2026. 10. 27., 일부개정]"
BODY = "제9조(예시) ① 사업주는 난간을 설치하여야 한다. ② 높이는 90센티미터 이상으로 한다."
BODY2 = "제9조(예시) ① 사업주는 난간을 설치하여야 한다. ② 높이는 100센티미터 이상으로 한다. <개정 2026.10.27> ③ 기록을 보존한다."
TAG = " [시행일 : 2027. 10. 28] 제9조"
page = lambda header, body: "산업안전보건법 %s %s" % (header, body)


class LawWatchTest(unittest.TestCase):
    def test_unchanged_when_current_and_horizon_texts_match(self):
        self.assertIsNone(classify(BODY, page(H_NEW, BODY), lambda: page(H_NEW, BODY + TAG)))

    def test_pending_when_only_the_horizon_text_differs(self):
        # the page without efYd carries the newest header but still the text in force (산업안전보건법 제52조, 2026-11-11)
        r = classify(BODY, page(H_NEW, BODY), lambda: page(H_NEW, BODY2 + TAG))
        self.assertEqual(r["state"], "pending")
        self.assertEqual(r["effective"], "")  # the page cannot tell a clause's own 시행일; the 부칙 does
        self.assertEqual(r["lines"], ["변경 전: ② 높이는 90센티미터 이상으로 한다.", "변경 후: ② 높이는 100센티미터 이상으로 한다. <개정 2026.10.27>", "신설: ③ 기록을 보존한다."])

    def test_stale_when_the_text_in_force_differs_and_horizon_is_not_needed(self):
        def boom():
            raise AssertionError("horizon text must not be fetched for a stale card")

        r = classify(BODY, page(H_OLD, BODY2), boom)
        self.assertEqual((r["state"], r["header"]), ("stale", H_OLD))
        self.assertIn("신설: ③ 기록을 보존한다.", r["lines"])

    def test_amendment_date_tags_alone_are_not_a_change(self):
        tagged = BODY.replace("설치하여야 한다.", "설치하여야 한다. <개정 2026.2.19>")
        self.assertEqual(clause_diff(BODY, tagged), [])
        self.assertIsNone(classify(BODY, page(H_NEW, tagged), lambda: page(H_NEW, tagged + TAG)))

    def test_version_label_and_staged_dates_are_split_off_the_text(self):
        stages = "1. 상시 50명 이상의 근로자를 사용하는 사업장: 2027년 1월 1일 2. 상시 50명 미만의 근로자를 사용하는 사업장: 2028년 1월 1일"
        self.assertEqual(split_tail(BODY + " " + stages + TAG), (BODY, stages))
        self.assertEqual(split_tail(BODY), (BODY, ""))
        r = classify(BODY, page(H_NEW, BODY), lambda: page(H_NEW, BODY2 + " " + stages + TAG))
        self.assertEqual(r["stages"], stages)
        self.assertFalse(any("2027년" in x for x in r["lines"]))

    def test_table_article_without_stored_text(self):
        w = {"id": "법175", "law": "산업안전보건법", "jo_no": "017500"}
        fetch = lambda law, no, ef_yd=None: page(H_NEW, BODY2 + TAG if ef_yd else BODY)
        i, law, header, res, h, title = check_extra(w, "20261111", None, fetch)
        self.assertEqual((res["state"], title), ("pending", "예시"))
        same = lambda law, no, ef_yd=None: page(H_NEW, BODY)
        self.assertIsNone(check_extra(w, "20261111", h, same)[3])
        self.assertEqual(check_extra(w, "20261111", "other", same)[3]["state"], "stale")

    def test_hand_checked_dates_apply_only_to_the_same_promulgation(self):
        e = {"a": {"state": "pending", "header": H_NEW, "effective": "", "lines": ["x"]}, "b": {"state": "pending", "header": H_OLD, "effective": "", "lines": ["x"]}}
        d = {"a": {"header": H_NEW, "effective": "2027-04-28", "dates": ["2027-04-28: 전부"], "checked_at": "2026-11-11"}, "b": {"header": H_NEW, "effective": "2027-04-28", "dates": ["y"]}}
        apply_dates(e, d)
        self.assertEqual((e["a"]["effective"], e["a"]["dates"]), ("2027-04-28", ["2027-04-28: 전부"]))
        self.assertNotIn("dates", e["b"])

    def test_a_shorter_horizon_text_without_a_newer_amendment_date_is_not_a_change(self):
        # 안전보건규칙 제241조 (2026-11-11): every efYd page lacks a sentence that is in force
        full = "제9조(예시) ① 사업주는 덮개를 쓴다. 이 경우 인증품을 사용해야 한다. <개정 2025.9.1>"
        short = "제9조(예시) ① 사업주는 덮개를 쓴다. <개정 2025.9.1>"
        self.assertEqual(classify(full, page(H_OLD, full), lambda: page(H_OLD, short)), {"state": "skipped"})
        newer = short.replace("2025.9.1", "2025.9.1, 2026.10.27")
        self.assertEqual(classify(full, page(H_OLD, full), lambda: page(H_NEW, newer))["state"], "pending")

    def test_horizon_is_two_years_ahead(self):
        self.assertEqual(horizon("20261111"), "20281110")

    def test_long_diffs_are_capped(self):
        new = BODY + "".join(" %d. 항목%d" % (i, i) for i in range(1, 30))
        self.assertTrue(clause_diff(BODY, new)[-1].startswith("… 외"))

    def test_header_key_orders_by_promulgation_date_not_by_text(self):
        a = "[시행 2025. 9. 1.] [고용노동부령 제450호, 2025. 9. 1., 일부개정]"
        b = "[시행 2026. 3. 2.] [고용노동부령 제454호, 2025. 12. 1., 일부개정]"
        self.assertGreater(header_key(b), header_key(a))


if __name__ == "__main__":
    unittest.main()
