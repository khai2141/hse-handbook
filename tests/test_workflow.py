import re
import unittest
from pathlib import Path

WF = Path(__file__).resolve().parent.parent / ".github" / "workflows" / "pages.yml"


class WorkflowTest(unittest.TestCase):
    def setUp(self):
        self.assertTrue(WF.exists(), "pages.yml missing")
        self.text = WF.read_text(encoding="utf-8")
        self.t_idx = self.text.index("\n  test:")
        self.d_idx = self.text.index("\n  deploy:")
        self.test_job = self.text[self.t_idx:self.d_idx]
        self.deploy_job = self.text[self.d_idx:]

    def test_three_commands_in_test_job(self):
        for cmd in ("python3 -m unittest discover -s tests",
                    "node --test tests/*.test.mjs",
                    "python3 tools/validate_data.py data"):
            self.assertIn("run: " + cmd, self.test_job)

    def test_deploy_after_test_and_needs(self):
        self.assertLess(self.t_idx, self.d_idx)
        self.assertRegex(self.deploy_job, r"needs:\s*test\b")

    def test_no_py_launcher_no_secret(self):
        self.assertIsNone(re.search(r"\bpy\b -m", self.text))
        self.assertNotIn("LAW_OC", self.text)
        self.assertNotIn("secrets.", self.text)

    def test_upload_path(self):
        self.assertRegex(self.text, r"path:\s*_site\b")

    def test_cp_lists_only_site_files(self):
        m = re.search(r"cp -r (.+?) _site/", self.text)
        self.assertIsNotNone(m)
        self.assertEqual(m.group(1).split(),
                         ["index.html", "css", "js", "data", "assets"])


if __name__ == "__main__":
    unittest.main()
