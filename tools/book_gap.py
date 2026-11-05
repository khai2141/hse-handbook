"""List the articles printed in the cartoon book that have no card yet, grouped by chapter running header.

Usage: py tools/book_gap.py > gap.txt
"""
import json, os, re, sys
import pymupdf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extract_book_images as e  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
cards = {r["id"] for r in json.load(open(os.path.join(ROOT, "data", "articles.json"), encoding="utf-8"))["records"]}
doc = pymupdf.open(e.DEFAULT_PDF)
rows = {}
chap = ""
for pno, page in enumerate(doc, 1):
    t = page.get_text()
    m = re.search(r"제\s*(\d+)\s*편\s*([^\n]*)", t)
    c = re.search(r"제\s*(\d+)\s*장\s*\n?([^\n]*)", t)
    for h in e.headings(page):
        title = ""
        for b in page.get_text("dict")["blocks"]:
            for ln in b.get("lines", []):
                s = "".join(x["text"] for x in ln["spans"]).strip()
                if e.HEAD.match(s) and e.art_id(*e.HEAD.match(s).groups()) == h["id"]:
                    title = s
        rows.setdefault(h["id"], (pno, h["jo"], title))
missing = {k: v for k, v in rows.items() if k not in cards}
print("book articles", len(rows), "cards", len(cards), "missing", len(missing))
for k, (p, jo, title) in sorted(missing.items(), key=lambda kv: kv[1][0]):
    print(p, k, title)
