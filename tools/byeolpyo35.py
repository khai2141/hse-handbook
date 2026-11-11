"""시행령 별표 35 (과태료의 부과기준) -> data/penalties.json.

sources/byeolpyo35_full_raw.txt holds the annex as returned by 법제처 (HTML table). parse() turns its 개별기준 table
into rows keyed like "가", "가의2", "자-2", "리-1가" (목 - 세부번호 + 세부 가나다). Every 과태료 record names the
row(s) it was taken from in `rows`; --apply adds a record for each row no record names yet.
Names are the row's own wording (위반행위 — 세부내용), nothing is reworded; amounts are the row's three cells.

Usage: py tools/byeolpyo35.py [--apply]     without --apply: list rows that have no record
"""
import json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
RAW = os.path.join(ROOT, "sources", "byeolpyo35_full_raw.txt")
PEN = os.path.join(ROOT, "data", "penalties.json")
URL = "https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsNm=%EC%82%B0%EC%97%85%EC%95%88%EC%A0%84%EB%B3%B4%EA%B1%B4%EB%B2%95%20%EC%8B%9C%ED%96%89%EB%A0%B9&bylNo=0035&bylBrNo=00&bylCls=BE"
CIRC = "①②③④⑤⑥⑦⑧⑨⑩"
WHO_UNKNOWN = "위반 조문의 의무자 (별표 35에는 따로 적혀 있지 않음)"
# amounts given in words: a short form for the summary column (the full wording stays in `a`)
BRIEF = {
    "히": "1차: 공사 금액의 100분의 5 (10만~100만원) · 2차 200만원 · 3차 300만원",
    "갸-1": "1차: 공사 금액의 100분의 5 (50만~500만원) · 2차 1,000만원 · 3차 1,500만원",
    "갸-2": "1차: 공사 금액의 100분의 5 (150만~1,500만원) · 2차 3,000만원 · 3차 5,000만원",
}


def cell_text(html):
    t = re.sub(r"<br\s*/?>", " ", html)
    t = re.sub(r"<[^>]+>", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return re.sub(r"(\d만원) 을", r"\1을", t)  # "1,000만원<br>을 초과할" is one word broken by the cell width


def amount(t):
    return int(t.replace(",", "")) if re.fullmatch(r"[\d,]+", t) else t


def parse(text):
    """-> [{"key", "violation", "basis", "group", "detail", "a": [1차, 2차, 3차]}] in table order."""
    table = text[text.index("<table>"):text.index("</table>")]
    carry = [None] * 6  # per column: [text, rows still covered by a rowspan]
    rows, label, violation, num, group = [], "", "", "", ""
    for tr in re.findall(r"<tr>(.*?)</tr>", table, flags=re.S):
        cells = re.findall(r"<t[dh]([^>]*)>(.*?)</t[dh]>", tr, flags=re.S)
        if "<th" in tr or (cells and "차" in cell_text(cells[0][1]) and len(cells) == 3):
            continue  # the two header lines
        cols, it = [], iter(cells)
        for c in range(6):
            if carry[c] and carry[c][1] > 0:
                carry[c][1] -= 1
                cols.append(carry[c][0])
                continue
            attr, body = next(it)
            t = cell_text(body)
            span = re.search(r'rowspan="(\d+)"', attr)
            carry[c] = [t, int(span.group(1)) - 1] if span else None
            cols.append(t)
        assert next(it, None) is None, tr[:80]
        m = re.match(r"([가-힣]+(?:의\d+)?)\. (.*)", cols[0])
        if (m.group(1), m.group(2)) != (label, violation):
            label, violation, num, group = m.group(1), m.group(2), "", ""
        detail, a = cols[2], [amount(x) for x in cols[3:6]]
        n = re.match(r"(\d+)\) ?(.*)", detail)
        g = re.match(r"([가-하])\) ?(.*)", detail)
        if n:
            num, sub, body = n.group(1), "", n.group(2)
            if a == ["", "", ""]:
                group = body  # a heading for the 가) 나) lines below it
                continue
            group = ""
        elif g:
            sub, body = g.group(1), g.group(2)
        else:
            num, sub, body, group = "", "", detail, ""
        key = label + ("-" + num + sub if num else "")
        rows.append({"key": key, "violation": violation, "basis": cols[1], "group": group if g else "", "detail": body, "a": a})
    return rows


def name_of(r):
    return " — ".join(x for x in (r["violation"], r["group"], r["detail"]) if x)


def art_of(violation):
    m = re.match(r"법 제(\d+)조(의\d+)?(?:제(\d+)항)?", violation)
    if m:
        return "별표 35 · 법 제%s조%s%s" % (m.group(1), m.group(2) or "", CIRC[int(m.group(3)) - 1] if m.group(3) else "")
    m = re.match(r"법 제(\d+)제(\d+)항", violation)  # 원문 표기 "법 제145제1항" (조 빠짐)
    return "별표 35 · 법 제%s조%s (원문 표기: %s)" % (m.group(1), CIRC[int(m.group(2)) - 1], m.group(0))


def law_of(basis):
    m = re.fullmatch(r"법 제175조제(\d+)항제(\d+)호(의\d+)?", basis)
    return "법 제175조%s%s%s" % (CIRC[int(m.group(1)) - 1], m.group(2), m.group(3) or "")


def unit_of(r):
    t = " ".join((r["violation"], r["group"], r["detail"]))
    u = []
    for n, w in re.findall(r"(\d)(명|인|대|종|개소|건|회)당", t):
        w = n + ("명" if w == "인" else w)
        if w not in u:
            u.append(w)
    if "각 서류당" in t:
        u.append("서류")
    return "·".join("건" if x == "1건" else x for x in u) if u else "건"


def who_of(r):
    d = r["detail"] or r["group"]
    return "근로자" if d.startswith("근로자가") else "사업주" if d.startswith("사업주가") else WHO_UNKNOWN


def max_of(a):
    n = [x for x in a if isinstance(x, int)]
    for x in a:
        if isinstance(x, str):
            n += [int(v.replace(",", "")) for v in re.findall(r"([\d,]+)만원", x)]
    return max(n)


def record(r, pid, today):
    rec = {"id": pid, "t": name_of(r), "art": art_of(r["violation"]), "k": "과태료", "unit": unit_of(r), "a": r["a"], "max": max_of(r["a"]),
           "law": law_of(r["basis"]), "who": who_of(r), "name": name_of(r), "fines": list(r["a"]), "rows": [r["key"]]}
    if r["key"] in BRIEF:
        rec["brief"] = BRIEF[r["key"]]
    rec["status"] = "확인"
    rec["source"] = {"url": URL, "published": "2026-07-28", "effective": "2026-08-01", "verified_at": today}
    return rec


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    rows = parse(open(RAW, encoding="utf-8").read())
    raw = open(PEN, encoding="utf-8").read()
    doc = json.loads(raw)
    have = {k for p in doc["records"] for k in p.get("rows", [])}
    missing = [r for r in rows if r["key"] not in have]
    print("rows", len(rows), "covered", len(rows) - len(missing), "missing", len(missing))
    if "--apply" not in argv:
        for r in missing:
            print(" ", r["key"], name_of(r)[:70], r["a"])
        return 0
    import datetime
    n = len(doc["records"])
    for i, r in enumerate(missing):
        doc["records"].append(record(r, "p%d" % (n + 1 + i), datetime.date.today().isoformat()))
    line = raw.split("\n")[1]
    with open(PEN, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(doc, ensure_ascii=False, indent=len(line) - len(line.lstrip())) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
