"""Weekly law watch: compare every stored article with law.go.kr and write data/lawwatch.json.

For each verified card (data/articles.json):
  L = 최신 공포본 (no efYd), E = 오늘 시행본 (efYd=today), S = stored verbatim text.
  S == L                    -> ok (one request)
  S != L and S == E         -> "pending": a promulgated amendment is not in force yet (diff S -> L)
  S != L and S != E         -> "stale": the text in force changed; the card's summary needs review (diff S -> E),
                               unless L's own 시행일 <= today and S != L only: then E is law.go.kr's deferred-clause
                               quirk (see capture_articles.py) and the in-force text is L (diff S -> L).
Also records the newest 공포 header per law, and which laws got a new header since the previous run
(tables taken from 별표 — 교육시간, 과태료, 별표 rows — must then be re-checked by hand).

Nothing in data/articles.json is rewritten: summaries are human-reviewed, so a changed article is flagged, not auto-edited.
Usage: py tools/law_watch.py [--workers 4] [--limit N]     exit 0 = ran (even with changes), 3 = too many fetch errors
"""
import concurrent.futures as cf, datetime, difflib, json, os, re, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from tools.capture_articles import HEADER_RE, body_of, jo_to_no, parse_header  # noqa: E402
from tools.fetch_law import collapse_ws, fetch_article, text_hash  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ART = os.path.join(ROOT, "data", "articles.json")
OUT = os.path.join(ROOT, "data", "lawwatch.json")
CLAUSE = re.compile(r" (?=[①-⑳]|\d{1,2}(?:의\d+)?\. |[가-하]\. )")
AMEND = re.compile(r"\s*<(?:개정|신설|삭제)[^>]*>|\s*\[(?:전문개정|본조신설|제목개정|종전)[^\]]*\]")


def jo_arg(jo):
    m = re.fullmatch(r"제(\d+)조(?:의(\d+))?", jo)
    return m.group(1) + ("-" + m.group(2) if m.group(2) else "")


def clauses(text):
    return [c.strip() for c in CLAUSE.split(collapse_ws(text)) if c.strip()]


def clause_diff(old, new, cap=14):
    """Clause-level change list: ['삭제: …', '신설: …', '변경 전: …', '변경 후: …'] (amendment-date tags ignored)."""
    a, b = clauses(old), clauses(new)
    ka, kb = [AMEND.sub("", x) for x in a], [AMEND.sub("", x) for x in b]
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, ka, kb, autojunk=False).get_opcodes():
        if op == "equal":
            continue
        k = min(i2 - i1, j2 - j1) if op == "replace" else 0  # pair replaced clauses in order; the rest are pure adds/removes
        for x, y in zip(a[i1:i1 + k], b[j1:j1 + k]):
            out += ["변경 전: " + x, "변경 후: " + y]
        out += ["삭제: " + x for x in a[i1 + k:i2]]
        out += ["신설: " + y for y in b[j1 + k:j2]]
    if len(out) > cap:
        out = out[:cap] + ["… 외 %d줄 (law.go.kr에서 전체 확인)" % (len(out) - cap)]
    return out


def classify(stored, latest_text, fetch_in_force, today):
    """Return None (unchanged) or dict(state, header, effective, lines). fetch_in_force() is called only when needed."""
    s = collapse_ws(stored)
    info = parse_header(latest_text)
    if s == body_of(latest_text):
        return None
    in_force_text = fetch_in_force()
    if s == body_of(in_force_text):
        lines = clause_diff(s, body_of(latest_text))
        if not lines:
            return None  # only amendment-date tags differ
        return {"state": "pending", "header": info["header"], "effective": info["effective"], "lines": lines}
    target, tinfo = in_force_text, parse_header(in_force_text)
    if info["effective"].replace("-", "") <= today:
        target, tinfo = latest_text, info  # latest is already in force; efYd text may omit deferred clauses
    lines = clause_diff(s, body_of(target))
    if not lines:
        return None
    return {"state": "stale", "header": tinfo["header"], "effective": tinfo["effective"], "lines": lines}


def check(r, today, fetch=fetch_article):
    no = jo_to_no(jo_arg(r["jo"]))
    latest = fetch(r["law"], no, ef_yd=None)
    res = classify(r["text"], latest, lambda: fetch(r["law"], no, ef_yd=today), today)
    return r["id"], r["law"], HEADER_RE.search(latest).group(0), res


def check_extra(w, today, prev_hash, fetch=fetch_article):
    """Watchlist article that is not a card (it backs a table: 벌칙, 교육, 건강진단 …). No stored text, so:
    pending = today's text differs from the latest; stale = today's text differs from last run's hash."""
    latest = fetch(w["law"], w["jo_no"], ef_yd=None)
    now = fetch(w["law"], w["jo_no"], ef_yd=today)
    info, body = parse_header(latest), body_of(now)
    h = text_hash(AMEND.sub("", body))
    res = None
    lines = clause_diff(body, body_of(latest))
    if prev_hash and prev_hash != h:
        res = {"state": "stale", "header": parse_header(now)["header"], "effective": parse_header(now)["effective"],
               "lines": ["지난 점검 이후 시행 중인 원문이 바뀌었습니다. 이 조문에 근거한 표를 다시 확인해야 합니다."]}
    elif lines and info["effective"].replace("-", "") > today:
        res = {"state": "pending", "header": info["header"], "effective": info["effective"], "lines": lines}
    return w["id"], w["law"], HEADER_RE.search(latest).group(0), res, h, info["title"]


def header_key(h):
    m = HEADER_RE.search(h)
    p = re.search(r"(\d{4})\. (\d{1,2})\. (\d{1,2})\.", m.group(4))
    return (int(p.group(1)), int(p.group(2)), int(p.group(3)), int(m.group(1)), int(m.group(2)), int(m.group(3)))


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    workers = int(argv[argv.index("--workers") + 1]) if "--workers" in argv else 4
    limit = int(argv[argv.index("--limit") + 1]) if "--limit" in argv else None
    today = datetime.date.today().strftime("%Y%m%d")
    recs = [r for r in json.load(open(ART, encoding="utf-8"))["records"] if r["status"] != "미확인"][:limit]
    prev = {}
    if os.path.exists(OUT):
        prev = json.load(open(OUT, encoding="utf-8"))
    entries, errors, headers, hashes = {}, [], {}, {}
    have = {(r["law"], jo_to_no(jo_arg(r["jo"]))) for r in recs}
    extras = [] if limit else [w for w in json.load(open(os.path.join(ROOT, "data", "watchlist.json"), encoding="utf-8"))
                               if (w["law"], w["jo_no"]) not in have]

    def newer(law, header):
        if law not in headers or header_key(header) > header_key(headers[law]):
            headers[law] = header

    with cf.ThreadPoolExecutor(workers) as ex:
        futs = {ex.submit(check, r, today): r for r in recs}
        for f in cf.as_completed(futs):
            r = futs[f]
            try:
                i, law, header, res = f.result()
            except Exception as e:  # network or parse failure: report, never guess
                errors.append({"id": r["id"], "error": str(e)[:120]})
                continue
            newer(law, header)
            if res:
                entries[i] = {"jo": r["jo"], "title": r["title"], "law": law, "branch": r["branch"], **res}
        futs = {ex.submit(check_extra, w, today, prev.get("extra_hash", {}).get(w["id"])): w for w in extras}
        for f in cf.as_completed(futs):
            w = futs[f]
            try:
                i, law, header, res, h, title = f.result()
            except Exception as e:
                errors.append({"id": w["id"], "error": str(e)[:120]})
                if w["id"] in prev.get("extra_hash", {}):
                    hashes[w["id"]] = prev["extra_hash"][w["id"]]
                continue
            newer(law, header)
            hashes[i] = h
            if res:
                jo = "제%d조" % int(w["jo_no"][:4])
                entries[i] = {"jo": jo, "title": title, "law": law, "branch": None, **res}
    if len(errors) > max(5, len(recs) // 10):
        print("too many fetch errors (%d of %d); lawwatch.json not written" % (len(errors), len(recs)))
        return 3
    old_laws = {x["law"]: x["header"] for x in prev.get("laws", [])}
    laws = [{"law": k, "header": v, "new": bool(old_laws.get(k)) and old_laws[k] != v} for k, v in sorted(headers.items())]
    order = {r["id"]: n for n, r in enumerate(recs)}
    order.update({w["id"]: len(recs) + n for n, w in enumerate(extras)})
    doc = {
        "checked_at": datetime.date.today().isoformat(),
        "checked": len(recs) + len(extras) - len(errors),
        "errors": sorted(errors, key=lambda e: e["id"]),
        "laws": laws,
        "entries": dict(sorted(entries.items(), key=lambda kv: order[kv[0]])),
        "extra_hash": dict(sorted(hashes.items())),
    }
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
    n = lambda s: sum(1 for e in entries.values() if e["state"] == s)
    # alert = something a person must look at: in-force change, new law version, fetch errors, or a new pending amendment
    new_pending = sorted(set(k for k, e in entries.items() if e["state"] == "pending") - set(prev.get("entries", {})))
    alert = bool(n("stale") or any(x["new"] for x in laws) or errors or new_pending)
    os.makedirs(os.path.join(ROOT, "reports"), exist_ok=True)
    with open(os.path.join(ROOT, "reports", "lawwatch.md"), "w", encoding="utf-8", newline="\n") as f:
        f.write("점검일 %s · 대조 %d개 · 시행 중 변경 %d · 시행 예정 %d · 조회 실패 %d\n\n" % (doc["checked_at"], doc["checked"], n("stale"), n("pending"), len(errors)))
        for x in laws:
            if x["new"]:
                f.write("- 새 공포본: %s %s (별표에서 옮긴 표를 다시 확인)\n" % (x["law"], x["header"]))
        for k, e in doc["entries"].items():
            f.write("\n### %s %s %s — %s\n%s\n\n" % (e["law"], e["jo"], e["title"], "시행 중 변경" if e["state"] == "stale" else "시행 예정", e["header"]))
            f.writelines("- %s\n" % line for line in e["lines"])
        for e in errors:
            f.write("\n- 조회 실패 %s: %s\n" % (e["id"], e["error"]))
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as f:
            f.write("alert=%d\n" % alert)
    print("checked %d, stale %d, pending %d, errors %d, new law versions %d"
          % (doc["checked"], n("stale"), n("pending"), len(errors), sum(x["new"] for x in laws)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
