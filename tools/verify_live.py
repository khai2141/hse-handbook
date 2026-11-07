"""Re-fetch every stored article from law.go.kr and compare its verbatim text with the live body.

산업안전보건법 is compared at efYd=today (its latest version takes effect later); other laws at the current version.
Usage: py tools/verify_live.py [--workers 6]   (writes reports/verify_live.txt; exit 1 on any mismatch)
"""
import concurrent.futures as cf, datetime, json, os, re, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from tools.capture_articles import body_of, jo_to_no  # noqa: E402
from tools.fetch_law import collapse_ws, fetch_article  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "..")


def label_to_arg(jo):
    m = re.fullmatch(r"제(\d+)조(?:의(\d+))?", jo)
    return m.group(1) + ("-" + m.group(2) if m.group(2) else "")


def check(r, today):
    ef = today if r["law"] == "산업안전보건법" else None
    live = body_of(fetch_article(r["law"], jo_to_no(label_to_arg(r["jo"])), ef_yd=ef))
    return r["id"], collapse_ws(r["text"]) == live


def main():
    workers = int(sys.argv[sys.argv.index("--workers") + 1]) if "--workers" in sys.argv else 6
    today = datetime.date.today().strftime("%Y%m%d")
    recs = json.load(open(os.path.join(ROOT, "data", "articles.json"), encoding="utf-8"))["records"]
    bad, err = [], []
    with cf.ThreadPoolExecutor(workers) as ex:
        futs = {ex.submit(check, r, today): r["id"] for r in recs if r["status"] != "미확인"}
        for f in cf.as_completed(futs):
            try:
                i, ok = f.result()
                if not ok:
                    bad.append(i)
            except Exception as e:
                err.append((futs[f], str(e)))
    os.makedirs(os.path.join(ROOT, "reports"), exist_ok=True)
    with open(os.path.join(ROOT, "reports", "verify_live.txt"), "w", encoding="utf-8") as f:
        f.write("checked %d, mismatch %d, error %d\nMISMATCH %s\nERROR %s\n" % (len(futs), len(bad), len(err), sorted(bad), err))
    print("checked", len(futs), "mismatch", len(bad), "error", len(err))
    sys.exit(1 if bad or err else 0)


if __name__ == "__main__":
    main()
