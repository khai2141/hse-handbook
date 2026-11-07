"""Build data/annexes.json (안전보건기준에 관한 규칙 별표 rows) from the captured raw files.

Input:  <dir>/annex_<N>.json (row records written from sources/sr_byeolpyo<N>_raw.txt)
Check:  every item string must occur (whitespace-normalised) in the matching raw file; ids unique.
Usage:  py tools/build_annexes.py <dir>
"""
import glob, json, os, re, sys

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "data", "annexes.json")
col = lambda t: re.sub(r"\s+", "", t.replace("<br>", ""))
URL = "https://www.law.go.kr/LSW/lsLinkProc.do?lsClsCd=L&mode=11&lsNm=%EC%82%B0%EC%97%85%EC%95%88%EC%A0%84%EB%B3%B4%EA%B1%B4%EA%B8%B0%EC%A4%80%EC%97%90%20%EA%B4%80%ED%95%9C%20%EA%B7%9C%EC%B9%99"
SOURCE = {"url": URL, "published": "2025-09-01", "effective": "2026-03-02", "verified_at": "2026-11-07"}


def check(rec, raw):
    bad = []
    for p in rec["parts"]:
        for it in p["items"]:
            if col(it) not in raw:
                bad.append(it)
    for piece in filter(None, rec["name"].split(" / ")):  # one cell may hold two numbered tasks (별표 4 제12·13호)
        if col(piece) not in raw:
            bad.append("name:" + piece)
    return bad


def main():
    d = sys.argv[1]
    recs, problems = [], 0
    for f in sorted(glob.glob(os.path.join(d, "annex_*.json")), key=lambda x: tuple(int(v) for v in re.search(r"annex_(\d+)(?:-(\d+))?", x).groups(0))):
        num = re.search(r"annex_(\d+(?:-\d+)?)\.json", f).group(1)
        raw = col(open(os.path.join(ROOT, "sources", f"sr_byeolpyo{num}_raw.txt"), encoding="utf-8").read())
        for r in json.load(open(f, encoding="utf-8")):
            bad = check(r, raw)
            if bad:
                problems += 1
                print("BAD", r["id"], bad[:3])
            r["status"] = "확인"
            r["source"] = SOURCE
            recs.append(r)
    ids = [r["id"] for r in recs]
    if len(ids) != len(set(ids)):
        print("duplicate ids"); problems += 1
    if problems:
        print("problems:", problems); sys.exit(1)
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps({"records": recs}, ensure_ascii=False, indent=2) + "\n")
    print("annex rows", len(recs))


if __name__ == "__main__":
    main()
