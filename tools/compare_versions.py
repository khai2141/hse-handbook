"""Compare the version in force today with the latest (upcoming) version of each watched article.
Writes data/versions.json. Exit: 0 all fetched, 3 at least one fetch failed."""
import datetime, json, os, re, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from tools.fetch_law import fetch_article  # noqa: E402
from tools.check_updates import header_of  # noqa: E402

WATCH = os.path.join(ROOT, "data", "watchlist.json")
OUT = os.path.join(ROOT, "data", "versions.json")
_SPLIT = re.compile(r"(?=[\u2460-\u2473])|\s+(?=\d+(?:의\d+)?\.\s[가-힣])")


def split_paragraphs(text):
    """Body paragraphs (version header removed), split before circled numbers and '1. ' items."""
    h = header_of(text)
    body = text[text.find(h) + len(h):] if h and h in text else text
    return [p.strip() for p in _SPLIT.split(body) if p.strip()]


def diff_lines(in_force_text, latest_text, limit=6):
    a, b = split_paragraphs(in_force_text), split_paragraphs(latest_text)
    sa, sb = set(a), set(b)
    out = ["현행: " + p for p in a if p not in sb] + ["예정: " + p for p in b if p not in sa]
    return out[:limit]


def effective_date(header):
    m = re.search(r"시행\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})", header or "")
    return "%04d-%02d-%02d" % tuple(map(int, m.groups())) if m else None


def compare_entry(in_force_text, latest_text):
    ih, lh = header_of(in_force_text), header_of(latest_text)
    lines = diff_lines(in_force_text, latest_text)
    return {"in_force_header": ih, "latest_header": lh, "latest_effective": effective_date(lh),
            "differs": bool(lines),
            "diff_lines": lines}


def main():
    today = datetime.date.today()
    ef = today.strftime("%Y%m%d")
    with open(WATCH, encoding="utf-8") as f:
        watch = json.load(f)
    entries, failed = {}, 0
    for k, w in enumerate(watch):
        if k:
            time.sleep(1)
        try:
            cur = fetch_article(w["law"], w["jo_no"], ef_yd=ef)
            time.sleep(1)
            new = fetch_article(w["law"], w["jo_no"])
            entries[w["id"]] = compare_entry(cur, new)
        except Exception as ex:
            failed += 1
            entries[w["id"]] = {"error": type(ex).__name__}
            print("ERROR %s: %s" % (w["id"], type(ex).__name__))
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump({"checked_at": today.isoformat(), "entries": entries}, f, ensure_ascii=False, indent=2)
        f.write("\n")
    n = sum(1 for e in entries.values() if e.get("differs"))
    print("%d entries, %d differ, %d errors" % (len(entries), n, failed))
    return 3 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
