import json, os, re, unittest

ROOT = os.path.join(os.path.dirname(__file__), "..")
DATA = os.path.join(ROOT, "data", "images.json")
BOOK = os.path.join(ROOT, "assets", "book")


class BookImageTests(unittest.TestCase):
    def setUp(self):
        with open(DATA, encoding="utf-8") as f:
            self.doc = json.load(f)

    def test_records_are_well_formed_and_unique(self):
        ids = set()
        for r in self.doc["records"]:
            self.assertRegex(r["article"], r"^sr-\d+(-\d+)?$")
            self.assertRegex(r["file"], r"^[A-Za-z0-9_-]+\.webp$")
            self.assertTrue(r["file"].startswith(r["article"] + "_"))
            self.assertGreater(r["page"], 0)
            self.assertIn(r["how"], ("box", "column", "above"))
            self.assertNotIn(r["id"], ids)
            ids.add(r["id"])

    def test_meta_names_the_book(self):
        self.assertIn("만화로 보는 산업안전보건기준에 관한 규칙", self.doc["meta"]["book"])

    @unittest.skipUnless(os.path.isdir(BOOK), "assets/book is local-only (copyrighted)")
    def test_every_record_has_its_file(self):
        missing = [r["file"] for r in self.doc["records"] if not os.path.exists(os.path.join(BOOK, r["file"]))]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
