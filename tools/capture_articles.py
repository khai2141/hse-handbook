"""Capture law articles (version in force on a date) from law.go.kr into one raw text file.

py tools/capture_articles.py --law "산업안전보건기준에 관한 규칙" --jo 13 32 241-2 --out sources/safety_rules_raw.txt [--date YYYYMMDD]
"""
import argparse, datetime, os, re, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from tools.fetch_law import article_url, collapse_ws, fetch_article  # noqa: E402

HEADER_RE = re.compile(r"\[시행 (\d{4})\. (\d{1,2})\. (\d{1,2})\.\] \[([^\]]+)\]")
TITLE_RE = re.compile(r"(제(\d+)조(?:의(\d+))?)\(([^)]+)\)")
PUB_RE = re.compile(r"(\d{4})\. (\d{1,2})\. (\d{1,2})\.")


def jo_to_no(label):
    """'38' -> '003800', '241-2' -> '024102'."""
    m = re.fullmatch(r"(\d{1,4})(?:-(\d{1,2}))?", str(label).strip())
    if not m:
        raise ValueError("bad --jo value: %r" % (label,))
    return "%04d%02d" % (int(m.group(1)), int(m.group(2) or 0))


def jo_label(label):
    m = re.fullmatch(r"(\d+)(?:-(\d+))?", str(label).strip())
    return "제%d조" % int(m.group(1)) + ("의%d" % int(m.group(2)) if m.group(2) else "")


def jo_sort_key(label):
    n = jo_to_no(label)
    return (int(n[:4]), int(n[4:]))


def _iso(m):
    return "%04d-%02d-%02d" % (int(m.group(1)), int(m.group(2)), int(m.group(3)))


def parse_header(text, expect_label=None):
    """Return dict(header, effective, published, title) from extract_article output; raise ValueError if absent."""
    m = HEADER_RE.search(text)
    if not m:
        raise ValueError("missing 시행 header")
    t = TITLE_RE.search(text, m.end())
    if not t or text[m.end():t.start()].strip():
        raise ValueError("missing article title right after header")
    if expect_label and t.group(1) != expect_label:
        raise ValueError("article mismatch: wanted %s got %s" % (expect_label, t.group(1)))
    p = PUB_RE.search(m.group(4))
    if not p:
        raise ValueError("missing promulgation date in header")
    return {
        "header": m.group(0),
        "effective": "%04d-%02d-%02d" % (int(m.group(1)), int(m.group(2)), int(m.group(3))),
        "published": _iso(p),
        "title": t.group(4),
    }


def format_block(law, label, url, captured, header, text):
    return "### %s %s | url: %s | captured: %s | header: %s\n%s\n" % (law, label, url, captured, header, collapse_ws(text))


def capture(law, jos, date, fetch=fetch_article):
    """Return list of (sortkey, block). Raises on first failure; nothing partial is returned."""
    captured = "%s-%s-%s" % (date[:4], date[4:6], date[6:])
    blocks = []
    for j in jos:
        no = jo_to_no(j)
        label = jo_label(j)
        text = fetch(law, no, ef_yd=date)
        info = parse_header(text, label)
        blocks.append((jo_sort_key(j), format_block(law, label, article_url(law, no, ef_yd=date), captured, info["header"], text)))
    return sorted(blocks)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--law", required=True)
    ap.add_argument("--jo", nargs="+", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--date", default=datetime.date.today().strftime("%Y%m%d"))
    a = ap.parse_args(argv)
    if not re.fullmatch(r"\d{8}", a.date):
        print("--date must be YYYYMMDD", file=sys.stderr)
        return 2
    try:
        blocks = capture(a.law, a.jo, a.date)
    except Exception as e:
        print("capture failed: %s" % e, file=sys.stderr)
        return 1
    with open(a.out, "w", encoding="utf-8", newline="\n") as f:
        f.write("".join(b for _, b in blocks))
    print("wrote %d articles to %s" % (len(blocks), a.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
