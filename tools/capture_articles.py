"""Capture law articles from law.go.kr into one raw text file, cross-checking two versions.

py tools/capture_articles.py --law "산업안전보건기준에 관한 규칙" --jo 13 32 241-2 --out sources/safety_rules_raw.txt
    [--date YYYYMMDD] [--prefer latest|efyd] [--diff-report sources/capture_diff_report.txt] [--check-only]

Every article is fetched twice: with efYd=<date> ("efyd") and without efYd ("latest", law.go.kr's 현행).
Bodies are normalized (header stripped, whitespace collapsed) and compared; every differing article
gets a loud WARNING and a line in the diff report.

--prefer (policy, default "latest"):
  latest  write the 현행 text. Use this when --date is today. law.go.kr's efYd lookup returns the
          newest 연혁 version whose 시행일 <= date, but that version's text omits clauses of an earlier
          amendment whose 시행 was deferred (부칙 "공포 후 6개월이 경과한 날부터 시행") if the deferred date
          falls after that version's own 시행일. Example: 제241조제2항제4호 후단 (제450호, 공포 2025-09-01,
          시행 2026-03-02) is missing from the 제453호/제454호 versions that efYd=20261104 returns.
  efyd    write the efYd text. Use this only for a past --date (latest would then be too new).
--check-only  compare and report, do not write --out.
"""
import argparse, datetime, difflib, os, re, sys, time

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


def body_of(text):
    """Normalized article body: everything from the article title on, whitespace collapsed."""
    m = HEADER_RE.search(text)
    t = TITLE_RE.search(text, m.end() if m else 0)
    return collapse_ws(text[t.start():] if t else text)


def describe_diff(a, b, width=60):
    """One-line description of how body b differs from body a (token level)."""
    ta, tb = a.split(" "), b.split(" ")
    parts = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, ta, tb, autojunk=False).get_opcodes():
        if op == "equal":
            continue
        old, new = " ".join(ta[i1:i2])[:width], " ".join(tb[j1:j2])[:width]
        parts.append({"insert": "+[%s]" % new, "delete": "-[%s]" % old}.get(op, "-[%s] +[%s]" % (old, new)))
    return "; ".join(parts) or "(identical)"


def cross_check(law, jos, date, fetch=fetch_article, delay=0.0):
    """For each jo fetch the efYd and the latest version. Returns a list of dicts sorted by article."""
    out = []
    for j in sorted(jos, key=jo_sort_key):
        no, label = jo_to_no(j), jo_label(j)
        res = {"jo": j, "label": label}
        for kind, ef in (("efyd", date), ("latest", None)):
            text = fetch(law, no, ef_yd=ef)
            info = parse_header(text, label)
            res[kind] = {"text": text, "header": info["header"], "url": article_url(law, no, ef_yd=ef), "body": body_of(text)}
            if delay:
                time.sleep(delay)
        res["differs"] = res["efyd"]["body"] != res["latest"]["body"]
        res["summary"] = describe_diff(res["efyd"]["body"], res["latest"]["body"]) if res["differs"] else ""
        out.append(res)
    return out


def diff_report_text(law, date, results):
    lines = ["capture diff report: %s, efYd=%s vs latest (no efYd)" % (law, date)]
    diffs = [r for r in results if r["differs"]]
    lines.append("checked %d articles, %d differ" % (len(results), len(diffs)))
    for r in diffs:
        lines.append("%s | efyd %s | latest %s | efyd->latest: %s" % (r["label"], r["efyd"]["header"], r["latest"]["header"], r["summary"]))
    return "\n".join(lines) + "\n"


_fetch = fetch_article  # replaced by tests


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--law", required=True)
    ap.add_argument("--jo", nargs="+", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--date", default=datetime.date.today().strftime("%Y%m%d"))
    ap.add_argument("--prefer", choices=("latest", "efyd"), default="latest",
                    help="which version to write when they differ (see module docstring)")
    ap.add_argument("--diff-report", default=os.path.join("sources", "capture_diff_report.txt"))
    ap.add_argument("--delay", type=float, default=1.0, help="seconds between requests")
    ap.add_argument("--check-only", action="store_true")
    a = ap.parse_args(argv)
    if not re.fullmatch(r"\d{8}", a.date):
        print("--date must be YYYYMMDD", file=sys.stderr)
        return 2
    try:
        results = cross_check(a.law, a.jo, a.date, fetch=_fetch, delay=a.delay)
    except Exception as e:
        print("capture failed: %s" % e, file=sys.stderr)
        return 1
    for r in results:
        if r["differs"]:
            print("!!! WARNING: %s differs between efYd=%s (%s) and latest (%s); writing %s. %s"
                  % (r["label"], a.date, r["efyd"]["header"], r["latest"]["header"], a.prefer, r["summary"]), file=sys.stderr)
    with open(a.diff_report, "w", encoding="utf-8", newline="\n") as f:
        f.write(diff_report_text(a.law, a.date, results))
    print("%d of %d articles differ; report: %s" % (sum(r["differs"] for r in results), len(results), a.diff_report))
    if a.check_only:
        return 0
    captured = "%s-%s-%s" % (a.date[:4], a.date[4:6], a.date[6:])
    blocks = [format_block(a.law, r["label"], r[a.prefer]["url"], captured, r[a.prefer]["header"], r[a.prefer]["text"]) for r in results]
    with open(a.out, "w", encoding="utf-8", newline="\n") as f:
        f.write("".join(blocks))
    print("wrote %d articles to %s" % (len(blocks), a.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
