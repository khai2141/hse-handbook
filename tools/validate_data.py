import json, os, sys, datetime

REQ = ("url", "published", "effective", "verified_at")
NUMERIC = ("hours", "fine", "fines", "min", "max")

def _date(s):
    return datetime.date.fromisoformat(s)

def _check_record(rec, where):
    errs = []
    status = rec.get("status", "확인")
    if status == "미확인":
        for k in NUMERIC:
            if k in rec:
                errs.append(f"{where}: 미확인 record must not carry numeric field '{k}'")
        return errs
    src = rec.get("source")
    if not isinstance(src, dict):
        return [f"{where}: missing source"]
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
    if rec.get("star") and not (rec.get("stats") or {}).get("source"):
        errs.append(f"{where}: star requires stats.source")
    return errs

def validate_file(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    errs = []
    for i, rec in enumerate(data.get("records", [])):
        errs += _check_record(rec, f"{os.path.basename(path)}#{rec.get('id', i)}")
    return errs

def validate_dir(d):
    errs = []
    for n in sorted(os.listdir(d)):
        if n.endswith(".json") and n not in ("nodes.json", "watchlist.json"):
            errs += validate_file(os.path.join(d, n))
    return errs

if __name__ == "__main__":
    e = validate_dir(sys.argv[1])
    print("\n".join(e) if e else "OK")
    sys.exit(1 if e else 0)
