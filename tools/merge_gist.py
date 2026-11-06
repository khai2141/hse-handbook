"""Merge one-line summaries (`gist`) into data/articles.json after checking them against the verbatim text.

Input: out_NN.json files ({id: gist}) in a directory. Checks per gist: <= 45 chars, one line, and every number/unit
it quotes appears in the article text. Prints problems and writes nothing if any exist (use --force-ok to skip none).
Usage: py tools/merge_gist.py <dir>
"""
import glob, json, os, re, sys

ROOT = os.path.join(os.path.dirname(__file__), "..")
ART = os.path.join(ROOT, "data", "articles.json")
NUM = re.compile(r"\d+(?:[.,]\d+)?\s*(?:미터|센티미터|밀리미터|킬로그램|킬로와트|킬로볼트|볼트|암페어|헤르츠|데시벨|퍼센트|%|도|초|분|시간|일|개월|년|명|톤|배|세제곱미터|제곱미터|m|cm|mm|kg)?")
col = lambda t: re.sub(r"\s+", "", t)


def problems(r, g):
    out = []
    if not g or "\n" in g:
        out.append("empty/multiline")
    if len(g) > 45:
        out.append(f"len {len(g)}")
    text = col(r["text"])
    for m in NUM.finditer(g):
        if col(m.group(0)) not in text:
            out.append("number not in text: " + m.group(0))
    return out


def main():
    d = sys.argv[1]
    doc = json.load(open(ART, encoding="utf-8"))
    gist = {}
    for f in sorted(glob.glob(os.path.join(d, "out_*.json"))):
        gist.update(json.load(open(f, encoding="utf-8")))
    bad = 0
    for r in doc["records"]:
        if r["status"] == "미확인":
            continue
        g = gist.get(r["id"])
        if g is None:
            print("MISSING", r["id"]); bad += 1; continue
        p = problems(r, g)
        if p:
            print("BAD", r["id"], p, g); bad += 1
    extra = set(gist) - {r["id"] for r in doc["records"]}
    if extra:
        print("EXTRA", sorted(extra)[:5]); bad += 1
    if bad:
        print("problems:", bad); sys.exit(1)
    for r in doc["records"]:
        if r["id"] in gist:
            r["gist"] = gist[r["id"]].strip()
    with open(ART, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(doc, ensure_ascii=False, indent=2) + "\n")
    print("merged", len(gist))


if __name__ == "__main__":
    main()
