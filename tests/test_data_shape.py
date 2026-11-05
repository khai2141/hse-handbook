import json, os, re, unittest

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

    def test_criminal_penalties_quoted_verbatim(self):
        import re
        col = lambda t: re.sub(r"\s+", " ", t).strip()
        with open(os.path.join(os.path.dirname(__file__), "..", "sources", "criminal_raw.txt"), encoding="utf-8") as f:
            raw = col(f.read())
        by = {r["id"]: r for r in recs("penalties.json")}
        for i in ("p1", "p2", "p3", "p4", "p5"):
            r = by[i]
            qs = r.get("quotes")
            self.assertTrue(qs, i)
            for q in qs:
                self.assertTrue(q["article"], i)
                self.assertIn(col(q["text"]), raw, i)
            for a in r["a"]:
                if a:
                    fig = re.sub(r"^법인 ", "", col(a))
                    self.assertTrue(any(fig in re.sub(r"(이하|이상)의 ", r"\1 ", col(q["text"])) for q in qs), (i, a))

    def test_nodes(self):
        n = load("nodes.json")["nodes"]
        self.assertIn("home", n)
        kinds = set()
        for k, v in n.items():
            for kid in v.get("kids", []):
                self.assertIn(kid, n, (k, kid))
                self.assertTrue(kid.startswith(k + ".") or k == "home", (k, kid))
            if "kind" in v:
                kinds.add(v["kind"])
            if k != "home" and not v.get("kids") and "kind" not in v:
                self.assertTrue(v.get("plan"), k)
        self.assertEqual(kinds, set("WFTMHVRPA"))
        self.assertEqual(n["home"]["kids"], ["p", "d", "c", "a", "g"])

    def test_counts(self):
        pens = recs("penalties.json")
        self.assertEqual([r["id"] for r in pens], ["p%d" % (i + 1) for i in range(len(pens))])
        self.assertGreaterEqual(len(pens), 32)
        self.assertEqual(len(recs("env.json")), 8)
        self.assertEqual(len(recs("tasks.json")), 39)

    def test_unverified_have_no_source(self):
        for f in os.listdir(DATA):
            if f.endswith(".json") and f not in ("nodes.json", "meta.json", "watchlist.json", "versions.json"):
                for r in recs(f):
                    if r.get("status") == "미확인":
                        self.assertNotIn("source", r, f"{f}#{r.get('id')}")

    def test_roles_removed(self):
        ids = {r["id"] for r in recs("roles.json")}
        self.assertFalse(ids & {"stf", "cm"})

    def test_byeolpyo5_contents(self):
        import re
        norm = lambda x: re.sub(r"\s+", " ", x).strip()
        with open(os.path.join(os.path.dirname(__file__), "..", "sources", "byeolpyo5_raw.txt"), encoding="utf-8") as f:
            raw = norm(f.read())
        with open(os.path.join(os.path.dirname(__file__), "..", "sources", "byeolpyo5_mcp_raw.txt"), encoding="utf-8") as f:
            mcp = norm(f.read())
        squash = lambda x: re.sub(r"\s+", "", x)
        raw_sq, mcp_sq = squash(raw), squash(mcp.replace("<br>", " "))
        tasks = recs("tasks.json")
        self.assertEqual(len(tasks), 39)
        self.assertEqual([t["id"] for t in tasks], [str(i) for i in range(1, 40)])
        for t in tasks:
            self.assertTrue(isinstance(t.get("contents"), list) and t["contents"], t["id"])
            self.assertIn(squash(t["name"]), mcp_sq, f"task {t['id']} name")
            row = re.search(r"\| (?:<개별내용><br>)?%s\. (.*?) \| (○ .*?) \|" % t["id"], mcp)
            self.assertIsNotNone(row, t["id"])
            self.assertEqual(t["contents"], [re.sub(r"^○ ", "", x) for x in row.group(2).split("<br>")], f"task {t['id']}")
            viewer = int(t["id"]) >= 15 and re.search(r"(?m)^%s\. " % t["id"], open(os.path.join(os.path.dirname(__file__), "..", "sources", "byeolpyo5_raw.txt"), encoding="utf-8").read())
            for c in t["contents"]:
                self.assertIn(norm(c), mcp, f"task {t['id']}: {c}")
                if viewer:
                    self.assertIn(squash(c), raw_sq, f"task {t['id']} (viewer): {c}")
        e5 = {r["id"]: r for r in recs("education.json")}["e5"]
        self.assertTrue(e5["contents"])
        for c in e5["contents"]:
            self.assertNotIn("읽지 못했습니다", c)
            self.assertIn(norm(c), raw, f"e5: {c}")
        hrs = e5.get("contents_hours")
        if hrs:
            self.assertEqual(sum(h["hours"] for h in hrs), 4)

    def test_byeolpyo5_other_contents_verbatim(self):
        norm = lambda x: re.sub(r"\s+", " ", x).strip()
        here = os.path.dirname(__file__)
        with open(os.path.join(here, "..", "sources", "byeolpyo5_mcp_raw.txt"), encoding="utf-8") as f:
            mcp = f.read()
        with open(os.path.join(here, "..", "sources", "byeolpyo4_raw.txt"), encoding="utf-8") as f:
            b4 = re.sub(r"\s+", "", f.read())
        sec = lambda a, b: mcp.split(a, 1)[1].split(b, 1)[0]
        bullets = lambda s: [l[2:] for l in s.splitlines() if l.startswith("○ ")]
        by = {r["id"]: r for r in recs("education.json")}
        s12 = sec("1의2. 관리감독자 안전보건교육", "2. 건설업 기초안전보건교육")
        e8 = by["e8"]
        self.assertEqual(e8["contents"], bullets(s12.split("가. 정기교육", 1)[1].split("나. 채용 시", 1)[0]))
        self.assertEqual(e8["contents_hire"], bullets(s12.split("나. 채용 시 교육 및 작업내용 변경 시 교육", 1)[1].split("다. 특별교육", 1)[0]))
        self.assertEqual((len(e8["contents"]), len(e8["contents_hire"])), (13, 13))
        for c in e8["contents_special"]:
            self.assertIn(norm(c.split("> ", 1)[1]), norm(s12))
        for h in re.findall(r"\d+시간", e8["hr"]):
            self.assertIn(h, b4)
        e6 = by["e6"]
        s3 = norm(sec("3. 안전보건관리책임자 등에 대한 교육", "4. 특수형태근로종사자"))
        self.assertEqual([t["target"][0] for t in e6["contents_by_target"]], list("가나다라마바사"))
        for t in e6["contents_by_target"]:
            self.assertIn("<td>%s</td>" % t["target"], s3)
            for i, c in enumerate(t["new"]):
                self.assertIn("%d) %s" % (i + 1, c), s3, t["target"])
            for i, c in enumerate(t["refresher"]):
                self.assertIn("%d) %s" % (i + 1, c), s3, t["target"])
        for h in re.findall(r"\d+시간", e6["hr"]):
            self.assertIn(h, b4)
        s4 = sec("4. 특수형태근로종사자에 대한 안전보건교육", "5. 검사원")
        e7 = by["e7"]
        self.assertEqual(e7["contents"], bullets(s4))
        self.assertEqual(len(e7["contents"]), 14)
        self.assertIn(e7["contents_rule"], s4)
        self.assertIn(e7["contents_special"], s4)
        e9 = by["e9"]
        self.assertEqual(e9["contents"], bullets(mcp.split("6. 물질안전보건자료에 관한 교육", 1)[1]))
        self.assertEqual(len(e9["contents"]), 6)

    # ---- Task 7B: verbatim checks against captured raw text ----
    NEW_PEN = {
        "p21": (r"법\s*제125조제1항\s*및법제175조제4", [20, 50, 100], "1명"),
        "p22": (r"법\s*제125조제1항\s*및법제175조제5", [100, 300, 500], "건"),
        "p23": (r"법\s*제125조제4항", [500, 500, 500], "건"),
        "p24": (r"법\s*제125조제6항", [100, 300, 500], "건"),
        "p25": (r"법\s*제125조제7항", [100, 300, 500], "건"),
        "p26": (r"법\s*제129조제1항또는", [10, 20, 30], "1명"),
        "p27": (r"법\s*제132조제1항", [500, 500, 500], "건"),
        "p28": (r"법\s*제132조제2항전단", [100, 300, 500], "건"),
        "p29": (r"법\s*제132조제3항", [300, 300, 300], "건"),
        "p30": (r"법\s*제54조제2항\(", [3000, 3000, 3000], "건"),
        "p31": (r"법\s*제62조제1항", [500, 500, 500], "건"),
        "p32": (r"법\s*제68조제1항", [500, 500, 500], "건"),
    }

    def test_byeolpyo35_verbatim(self):
        import re
        here = os.path.dirname(__file__)
        with open(os.path.join(here, "..", "sources", "byeolpyo35_raw.txt"), encoding="utf-8") as f:
            raw = re.sub(r"\s+", " ", f.read())
        by = {r["id"]: r for r in recs("penalties.json")}
        for pid, (marker, amts, unit) in self.NEW_PEN.items():
            self.assertIn(pid, by)
            r = by[pid]
            self.assertEqual(r["a"], amts, pid)
            self.assertEqual(r["fines"], amts, pid)
            self.assertEqual(r["unit"], unit, pid)
            self.assertEqual(r["k"], "과태료")
            self.assertEqual(r["status"], "확인")
            self.assertEqual(r["max"], max(amts))
            self.assertTrue(r["art"].startswith("별표 35 · 법 제"), pid)
            m = re.search(marker, raw)
            self.assertIsNotNone(m, f"{pid} marker {marker}")
            fmt = lambda n: f"{n:,}"
            tri = r"[ ¦]+".join(re.escape(fmt(n)) for n in amts)
            window = raw[m.start(): m.start() + 450]
            self.assertRegex(window, r"(?<![\d,])" + tri + r"(?![\d,])", f"{pid} triple {amts}")

    def test_byeolpyo4_hours_verbatim(self):
        import re
        here = os.path.dirname(__file__)
        with open(os.path.join(here, "..", "sources", "byeolpyo4_raw.txt"), encoding="utf-8") as f:
            raw = re.sub(r"\s+", "", f.read())
        for w in recs("workers.json"):
            if "cells" not in w:
                continue
            for i, c in enumerate(w["cells"]):
                if c["k"] == "y":
                    for h in re.findall(r"\d+시간", c["t"]):
                        self.assertIn(h, raw, f"{w['id']} cell {i}: {c['t']}")
                if c["t"] == "확인":
                    self.assertEqual(c["k"], "q")
                    self.assertEqual(c.get("note"), "별표 4에 칸 없음", f"{w['id']} cell {i}")

    def test_health_items_verbatim(self):
        import re
        here = os.path.dirname(__file__)
        with open(os.path.join(here, "..", "sources", "geonganjindan_raw.txt"), encoding="utf-8") as f:
            raw = re.sub(r"\s+", "", f.read())
        by_id = {r["id"]: r for r in recs("health.json")}
        self.assertIn("items_source_note", load("health.json"))
        for hid in ("h2", "h3"):
            rec = by_id[hid]
            self.assertTrue(rec["by_hazard"], hid)
            self.assertEqual(rec["source"]["effective"], "2026-01-01")
            for e in rec["by_hazard"]:
                self.assertIn(re.sub(r"\s+", "", e["hazard"]), raw)
                self.assertTrue(e["items_1st"] and e["items_2nd"])
                for s in e["items_1st"] + e["items_2nd"]:
                    self.assertIn(re.sub(r"\s+", "", s), raw, f"{hid} {e['hazard']}: {s}")
            self.assertFalse([l for l in rec["it"] if "아직 읽지 못함" in l or "구 기준" in l])

    def test_foreign_records(self):
        import re
        here = os.path.dirname(__file__)
        with open(os.path.join(here, "..", "sources", "foreign_raw.txt"), encoding="utf-8") as f:
            raw = re.sub(r"\s+", "", f.read())
        generic = "https://www.law.go.kr/LSW/lsLinkProc.do?lsClsCd=L&mode=11&lsNm=산업안전보건법"
        recs_f = recs("foreign.json")
        self.assertTrue(any(r["status"] != "미확인" for r in recs_f))
        for r in recs_f:
            if r["status"] in ("확인", "일부 확인"):
                src = r.get("source") or {}
                self.assertTrue(src.get("url"), r["id"])
                self.assertNotEqual(src["url"], generic, r["id"])
                self.assertTrue(r.get("quotes"), f"{r['id']}: no quotes")
                for q in r["quotes"]:
                    self.assertTrue(q["article"] and q["text"], r["id"])
                    self.assertIn(re.sub(r"\s+", "", q["text"]), raw, f"{r['id']} {q['article']}")
            else:
                self.assertNotIn("source", r, r["id"])
                for c in (r["c"], r["pr"], r["ed"]):
                    self.assertFalse(re.search(r"\d", c["t"]), f"{r['id']}: {c['t']}")
        today = "2026-11-04"
        for r in recs_f:
            if r.get("source") and r["source"]["effective"] > today:
                self.assertIs(r["source"].get("future_ack"), True, r["id"])
            self.assertNotIn("future_ack", r, r["id"])
        s31 = [r for r in recs_f if r["source"]["effective"] == "2027-01-08"] if all("source" in r for r in recs_f) else [r for r in recs_f if r.get("source", {}).get("effective") == "2027-01-08"]
        self.assertEqual(len(s31), 1)
        self.assertIn("제31조의2", s31[0]["n"])
        self.assertIs(s31[0]["source"]["future_ack"], True)
        meta = load("meta.json")
        self.assertFalse([l for l in meta["foreign_edu"] if "확인하지 못했습니다" in l and "31조의2" in l])
        self.assertTrue(any("제31조의2" in l and "2027" in l for l in meta["foreign_edu"]))
        self.assertTrue(any("정책 발표(법령 아님)" in l for l in meta["foreign_edu"]))

    # ---- Article card fidelity guards (pure checks on data/articles.json) ----
    def test_article_cards_carry_exceptions(self):
        bad = [r["id"] for r in recs("articles.json") if g1_fails(r)]
        self.assertEqual(bad, [], "G1: text has a 단서/제외/한정 but must+check do not carry it")

    def test_article_records_are_required_by_text(self):
        bad = [r["id"] for r in recs("articles.json") if g2_fails(r)]
        self.assertEqual(bad, [], "G2: records not backed by text")

    def test_article_check_carries_each_proviso(self):
        bad = {r["id"]: miss for r in recs("articles.json") for miss in [g5_missing(r)] if miss and r["id"] not in PROVISO_ALLOWLIST}
        self.assertEqual(bad, {}, "G5: a 다만-clause key phrase is missing from must+check")
        ids = {r["id"] for r in recs("articles.json")}
        self.assertFalse(set(PROVISO_ALLOWLIST) - ids, "G5 allowlist has unknown ids")

    def test_article_must_not_overstate(self):
        bad = [r["id"] for r in recs("articles.json") if g4_fails(r)]
        self.assertEqual(bad, [], "G4: 반드시/항상/모든 not in text")


# G1: markers in `text` that signal a 단서, exclusion or limitation.
EXCEPTION_MARKERS = ("다만,", "제외한다", "제외하고", "한정한다", "그러하지 아니하다")
# G1: at least one of these must appear in the card's must+check so the exception is carried.
EXCEPTION_CARRIERS = ("다만", "예외", "제외", "한정", "아니하다", "아니한다")
# G2: `records` may be non-empty only if `text` names a record-type duty.
# "적어야" covers 제439조 ("특별관리물질 취급 시 적어야 하는 사항"), a pure recording duty.
# "갖추어 두어야" covers 시행령 제53조제3항 ("…증명할 수 있는 서류를 갖추어 두어야 한다"), a keep-on-file duty.
RECORD_WORDS = ("기록", "보존", "작성", "게시", "서면", "보관", "제출", "신고", "보고", "적어야", "갖추어 두어야")
# G4: absolute words a `must` bullet may use only if `text` uses them too.
ABSOLUTE_WORDS = ("반드시", "항상", "모든")


def g1_fails(r):
    if not any(m in r["text"] for m in EXCEPTION_MARKERS):
        return False
    joined = " ".join(r["must"] + r["check"]).lower()
    return not any(c in joined for c in EXCEPTION_CARRIERS)


def record_key_noun(entry):
    import re
    head = re.match(r"[^\s(]*", entry).group(0)
    m = re.search(r"[가-힣]{2,}", head)
    return m.group(0) if m else None


def g2_fails(r):
    if not r["records"]:
        return False
    if not any(w in r["text"] for w in RECORD_WORDS):
        return True
    for e in r["records"]:
        k = record_key_noun(e)
        if not k or k not in r["text"]:
            return True
    return False


def g4_fails(r):
    return any(w in m and w not in r["text"] for m in r["must"] for w in ABSOLUTE_WORDS)



# G5: each 다만-clause (단서) must leave a trace in must+check, not just a generic "예외" word.
# Heuristic: for every "다만" in `text`, take the clause up to the end of its sentence ("다."),
# split it into Hangul runs, strip one trailing particle, and pick the FIRST run that is
#   - 4 or more Hangul characters long,
#   - not a stop word (근로자, 사업주, 경우, 그 ... see PROVISO_STOP),
#   - not a verb/adverb form (ends in one of PROVISO_VERB_ENDINGS, e.g. 하거나, 하여, 한다, 로서).
# That run is the clause's key noun phrase. It must occur in the card's must+check joined text
# (whitespace ignored). Cards that cannot satisfy it for a legitimate reason go in
# PROVISO_ALLOWLIST with a reason.
PROVISO_STOP = {"근로자", "사업주", "경우", "그", "작업장소", "고용노동부령", "산업안전보건법", "안전하게", "부득이하게"}
PROVISO_VERB_ENDINGS = ("거나", "하여", "하기", "하지", "하게", "하고", "되어", "하는", "한다", "된다", "로서",
                        "하면서", "해질", "음에", "시켜야", "해야", "이루어지", "행하여지", "그러하지", "아니하다",
                        "되거나", "있는", "없는", "없거나", "하였음에", "준수하기", "여야")
PROVISO_PARTICLE = re.compile(r"(으로|에서|에는|에게|이나|와|과|을|를|이|가|은|는|의|에|로|도|만|인)$")
PROVISO_ALLOWLIST = {
}


def proviso_keys(text):
    keys = []
    for m in re.finditer(r"다만", text):
        seg = re.split(r"(?<=다)\.", text[m.end():], maxsplit=1)[0]
        for t in re.findall(r"[가-힣]+", seg):
            st = PROVISO_PARTICLE.sub("", t)
            if len(st) < 4 or st in PROVISO_STOP or st.endswith(PROVISO_VERB_ENDINGS):
                continue
            keys.append(st)
            break
    return keys


def g5_missing(r):
    joined = re.sub(r"\s+", "", " ".join(r["must"] + r["check"]))
    return [k for k in proviso_keys(r["text"]) if k not in joined]


if __name__ == "__main__":
    unittest.main()
