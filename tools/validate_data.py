import json, os, re, sys, datetime

REQ = ("url", "published", "effective", "verified_at")
NUMERIC = ("hours", "fine", "fines", "min", "max")

def _date(s):
    return datetime.date.fromisoformat(s)

def _check_record(rec, where):
    errs = []
    if rec.get("star") and not (rec.get("stats") or {}).get("source"):
        errs.append(f"{where}: star requires stats.source")
    status = rec.get("status", "확인")
    if status == "미확인":
        for k in NUMERIC:
            if k in rec:
                errs.append(f"{where}: 미확인 record must not carry numeric field '{k}'")
        return errs
    src = rec.get("source")
    if not isinstance(src, dict):
        return errs + [f"{where}: missing source"]
    for k in REQ:
        if not src.get(k):
            errs.append(f"{where}: source.{k} missing")
    if all(src.get(k) for k in REQ):
        try:
            eff = _date(src["effective"])
            if eff > datetime.date.today() and not src.get("future_ack"):
                errs.append(f"{where}: effective date in the future without future_ack")
        except ValueError:
            errs.append(f"{where}: source.effective is not ISO date")
    return errs

ART_STR = ("id", "law", "jo", "title", "branch", "group", "text", "who", "status", "raw")
ART_LIST = ("must", "check", "records", "see", "penalty_ids")


def single_sentence(text):
    """True if an article text is one operative sentence: no 항 marker and at most one sentence end."""
    t = re.sub(r"<[^>]*>|\[제목개정[^\]]*\]", "", text or "")
    return "①" not in t and len(re.findall(r"다\.(?:\s|$)", t)) <= 1


def _check_article(rec, where):
    errs = []
    for k in ART_STR:
        if not isinstance(rec.get(k), str) or (k != "who" and not rec.get(k)):
            errs.append(f"{where}: article field '{k}' must be a non-empty string")
    for k in ART_LIST:
        if not isinstance(rec.get(k), list) or not all(isinstance(x, str) for x in rec.get(k)):
            errs.append(f"{where}: article field '{k}' must be a list of strings")
    must = rec.get("must")
    if isinstance(must, list) and len(must) != 0:
        lo = 1 if single_sentence(rec.get("text")) else 2
        if not (lo <= len(must) <= 6):
            errs.append(f"{where}: must needs {lo}-6 bullets")
    if rec.get("status") == "미확인":
        for k in ("text", "must", "check"):
            if re.search(r"\d", json.dumps(rec.get(k), ensure_ascii=False)):
                errs.append(f"{where}: 미확인 article must not show numbers in '{k}'")
    return errs


def validate_file(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    errs = []
    is_art = os.path.basename(path) == "articles.json"
    ids = set()
    for i, rec in enumerate(data.get("records", [])):
        where = f"{os.path.basename(path)}#{rec.get('id', i)}"
        errs += _check_record(rec, where)
        if is_art:
            errs += _check_article(rec, where)
            if rec.get("id") in ids:
                errs.append(f"{where}: duplicate id")
            ids.add(rec.get("id"))
    return errs

def validate_dir(d):
    errs = []
    for n in sorted(os.listdir(d)):
        if n.endswith(".json") and n not in ("nodes.json", "watchlist.json", "versions.json", "images.json"):
            errs += validate_file(os.path.join(d, n))
    return errs

if __name__ == "__main__":
    e = validate_dir(sys.argv[1])
    print("\n".join(e) if e else "OK")
    sys.exit(1 if e else 0)
