"""Fill `penalty_ids` on article cards from the penalty provisions themselves (no hand-picked links).

Sources (all already captured in sources/ or data/penalties.json):
  * 법 제167조 / 제168조 / 제170조 / 제171조 (sources/criminal_raw.txt): the article numbers they cite decide which 법 cards link to p1 / p3 / p4 / p5.
  * 시행령 별표 35 records p6..p32 (data/penalties.json): the "법 제N조" in each record's `art` decides the 법 cards.
  * 안전보건기준에 관한 규칙 제3조~제670조 are the 고용노동부령 that 법 제38조④ and 제39조② delegate to
    (제2편 안전기준, 제3편 보건기준), so violating them is violating 제38조/제39조 -> 제168조 제1호 (p3), 사망 시 제167조 (p1).
    제1조·제2조 (총칙), 제672조~ (특수형태근로종사자·배달종사자, 법 제77조·제78조 위임) and 제674조 (규제의 재검토) get none.
  * 중처법 제4~7조 -> p2.
Usage: py tools/link_penalties.py [--check]
"""
import json, os, re, sys

ROOT = os.path.join(os.path.dirname(__file__), "..")
ART = os.path.join(ROOT, "data", "articles.json")
PEN = os.path.join(ROOT, "data", "penalties.json")
CRIM = os.path.join(ROOT, "sources", "criminal_raw.txt")

LAW = "산업안전보건법"
RULE = "산업안전보건기준에 관한 규칙"
JUNG = "중대재해 처벌 등에 관한 법률"
JUNG_ARTS = {"제4조", "제5조", "제6조", "제7조"}
SR_RANGE = (3, 670)


def blocks():
    t = open(CRIM, encoding="utf-8").read()
    out = {}
    for m in re.finditer(r"=== 법 제(\d+)조 ===\n(.*?)(?=\n=== |\Z)", t, flags=re.S):
        body = m.group(2).split("text:", 1)[1]
        body = re.sub(r"^.*?(제%s조\(벌칙\))" % m.group(1), "", body, flags=re.S)  # drop header + own title
        out[int(m.group(1))] = body
    return out


def refs(body):
    return {int(n) for n in re.findall(r"제(\d+)조(?!의)", body)}


def art_numbers(art):
    nums = set()
    for grp in re.findall(r"제(\d+(?:·\d+)*)조", art):
        nums.update(int(x) for x in grp.split("·"))
    return nums


def compute(arts, pens):
    b = blocks()
    law_map = {}  # 법 article number -> [penalty ids]

    def add(n, pid):
        lst = law_map.setdefault(n, [])
        if pid not in lst:
            lst.append(pid)

    r167, r168, r170, r171 = refs(b[167]), refs(b[168]), refs(b[170]), refs(b[171])
    for n in sorted(r168):
        add(n, "p3")
    for n in sorted(r167):
        add(n, "p1")
    for n in sorted(r170 & {56, 57}):
        add(n, "p4")
    for n in sorted(r171 & {125, 132}):
        add(n, "p5")
    for p in pens:
        if p["k"] == "과태료":
            for n in sorted(art_numbers(p["art"])):
                add(n, p["id"])
    # p3 before p1 for the same article (처벌 일반 -> 사망 가중)
    for lst in law_map.values():
        lst.sort(key=lambda x: (x not in ("p3",), int(x[1:])))
    out = {}
    for r in arts:
        m = re.fullmatch(r"제(\d+)조", r["jo"])
        n = int(m.group(1)) if m else None
        ids = []
        if r["law"] == LAW and n in law_map:
            ids = list(law_map[n])
        elif r["law"] == RULE and n is not None and SR_RANGE[0] <= n <= SR_RANGE[1]:
            ids = ["p3", "p1"]
        elif r["law"] == JUNG and r["jo"] in JUNG_ARTS:
            ids = ["p2"]
        if ids == ["p1"]:  # 제63조: 제167조(사망)만 수집됨. 사망 아닌 경우(제169조)는 아직 읽지 않아 연결하지 않는다.
            ids = []
        out[r["id"]] = ids
    return out


def main():
    check = "--check" in sys.argv
    doc = json.load(open(ART, encoding="utf-8"))
    pens = json.load(open(PEN, encoding="utf-8"))["records"]
    new = compute(doc["records"], pens)
    changed = 0
    for r in doc["records"]:
        if r["penalty_ids"] != new[r["id"]]:
            changed += 1
            r["penalty_ids"] = new[r["id"]]
    linked = sum(1 for v in new.values() if v)
    print("linked", linked, "of", len(new), "changed", changed)
    if check:
        sys.exit(1 if changed else 0)
    with open(ART, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(doc, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
