"""Daily law watcher. `--init` writes baseline hashes; otherwise diffs and reports.
Exit: 0 nothing changed, 2 something changed, 3 only fetch errors (no changes)."""
import datetime, json, os, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from tools.fetch_law import fetch_article, text_hash, diff_report  # noqa: E402

WATCH = os.path.join(ROOT, "data", "watchlist.json")
LAWS = {"법": "산업안전보건법", "령": "산업안전보건법 시행령", "규칙": "산업안전보건법 시행규칙",
        "중처": "중대재해 처벌 등에 관한 법률"}
ARTICLES = {"법": [15, 16, 17, 18, 19, 22, 29, 31, 32, 62, 64, 68, 125, 129, 130, 131, 132, 164, 167, 175],
            "령": [15, 18, 22, 53, 57],
            "규칙": [26, 28, 197, 198, 202, 203, 204, 205],
            "중처": [2, 4, 6]}


def default_entries():
    return [{"id": "%s%d" % (p, n), "law": LAWS[p], "jo_no": "%04d00" % n, "hash": "", "header": ""}
            for p, ns in ARTICLES.items() for n in ns]


def header_of(text):
    i = text.find("[시행")
    if i < 0:
        return ""
    j = text.find("]", text.find("]", i) + 1)
    return text[i:j + 1] if j > 0 else ""


def fetch_all(entries):
    texts, errors = {}, []
    for k, e in enumerate(entries):
        if k:
            time.sleep(1)
        try:
            texts[e["id"]] = fetch_article(e["law"], e["jo_no"])
        except Exception as ex:
            errors.append(e["id"])
            print("ERROR %s: %s" % (e["id"], ex))
    return texts, errors


def init():
    entries = default_entries()
    texts, errors = fetch_all(entries)
    now = datetime.datetime.now().isoformat(timespec="seconds")
    for e in entries:
        if e["id"] in texts:
            e["hash"] = text_hash(texts[e["id"]])
            e["header"] = header_of(texts[e["id"]])
            e["fetched_at"] = now
    if errors:
        print("init incomplete, not written; failed: " + ", ".join(errors))
        return 3
    with open(WATCH, "w", encoding="utf-8", newline="\n") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("baseline written: %d articles" % len(entries))
    return 0


def check():
    with open(WATCH, encoding="utf-8") as f:
        watch = json.load(f)
    texts, errors = fetch_all(watch)
    rep = diff_report(watch, texts)
    by = {w["id"]: w for w in watch}
    rows = ["| id | changed | old header | new header |", "|---|---|---|---|"]
    changed = 0
    for r in rep:
        st = "ERROR" if r["changed"] is None else ("yes" if r["changed"] else "no")
        changed += r["changed"] is True
        new_h = header_of(texts[r["id"]]) if r["id"] in texts else ""
        rows.append("| %s | %s | %s | %s |" % (r["id"], st, by[r["id"]].get("header", ""), new_h))
    today = datetime.date.today().isoformat()
    os.makedirs(os.path.join(ROOT, "reports"), exist_ok=True)
    path = os.path.join(ROOT, "reports", today + ".md")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("# Law check %s\n\n" % today + "\n".join(rows) + "\n")
    print("%d changed, %d errors, %d checked -> %s" % (changed, len(errors), len(rep), path))
    if changed:
        return 2
    return 3 if errors else 0


if __name__ == "__main__":
    sys.exit(init() if "--init" in sys.argv[1:] else check())
