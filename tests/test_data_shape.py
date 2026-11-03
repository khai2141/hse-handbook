import json, os, unittest

DATA = os.path.join(os.path.dirname(__file__), "..", "data")

def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)

def recs(name):
    return load(name)["records"]

class DataShapeTests(unittest.TestCase):
    def test_workers(self):
        rs = [r for r in recs("workers.json") if "g" not in r]
        self.assertEqual(len(rs), 18)
        for r in rs:
            for k in ("name", "sub", "group"):
                self.assertIn(k, r, r["id"])
            self.assertEqual(len(r["cells"]), 5, r["id"])
            for c in r["cells"]:
                self.assertIn("t", c); self.assertIn("k", c)
            self.assertEqual(len(r["rule_by_col"]), 5, r["id"])

    def test_education(self):
        by = {r["id"]: r for r in recs("education.json")}
        for i in ("e1", "e2", "e3", "e4", "e5"):
            r = by[i]
            self.assertTrue(r["name"])
            self.assertTrue(isinstance(r["contents"], list) and r["contents"], i)
            self.assertIsInstance(r["fine"] if r["status"] != "미확인" else [], list)
            self.assertIn(r["unit"], ("1명", "건"))

    def test_nodes(self):
        n = load("nodes.json")["nodes"]
        self.assertIn("home", n); self.assertIn("edu.w", n)

    def test_counts(self):
        self.assertEqual(len(recs("penalties.json")), 20)
        self.assertEqual(len(recs("env.json")), 8)
        self.assertEqual(len(recs("tasks.json")), 18)

    def test_unverified_have_no_source(self):
        for f in os.listdir(DATA):
            if f.endswith(".json") and f not in ("nodes.json", "meta.json"):
                for r in recs(f):
                    if r.get("status") == "미확인":
                        self.assertNotIn("source", r, f"{f}#{r.get('id')}")

    def test_roles_removed(self):
        ids = {r["id"] for r in recs("roles.json")}
        self.assertFalse(ids & {"stf", "cm"})

if __name__ == "__main__":
    unittest.main()
