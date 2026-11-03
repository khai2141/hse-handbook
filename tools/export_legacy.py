"""Export legacy tree.html data arrays to data/*.json.

Usage: py tools/export_legacy.py legacy/tree.html
Extraction is done by tools/extract_legacy.mjs (Node vm).
"""
import json, os, subprocess, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "data")
SOURCE = {
    "url": "https://www.law.go.kr/LSW/lsLinkProc.do?lsClsCd=L&mode=11&lsNm=산업안전보건법",
    "published": "2026-07-28", "effective": "2026-08-01", "verified_at": "2026-11-03",
}
STATUS = {"ok": "확인", "part": "일부 확인", "no": "미확인"}
NUMERIC = ("hours", "fine", "fines", "min", "max")
REMOVED_ROLES = {"stf", "cm"}


def extract(path):
    here = os.path.dirname(os.path.abspath(__file__))
    r = subprocess.run(["node", os.path.join(here, "extract_legacy.mjs"), path],
                       capture_output=True, check=True)
    return json.loads(r.stdout.decode("utf-8"))


def finish(rec):
    """Map legacy st -> status, attach generic source, strip numbers on 미확인."""
    st = STATUS.get(rec.pop("st", "ok"), "확인")
    rec["status"] = st
    if st == "미확인":
        for k in NUMERIC + ("per",):
            rec.pop(k, None)
    else:
        rec["source"] = dict(SOURCE)
    return rec


def first_numeric_list(per):
    for v in (per or {}).values():
        if isinstance(v, list) and v and all(isinstance(x, (int, float)) for x in v):
            return v
    return []


def workers(d):
    out, group = [], None
    for r in d["W"]:
        if "g" in r:
            group = r["g"]
            continue
        rec = dict(r)
        rec["name"], rec["sub"], rec["group"] = r["n"], r["s"], group
        c = d["CHG"][r["id"]]
        rec["cells"] = [r["hire"], r["reg"], c, r["spe"], r["bas"]]
        kws = ["채용", "정기", "변경", "특별", "기초"]
        rec["rule_by_col"] = [[l for l in r.get("edu", []) if k in l] for k in kws]
        out.append(finish(rec))
    return out


def education(d):
    out = []
    for r in d["E"]:
        rec = dict(r)
        rec["name"], rec["contents"] = r["n"], r["ct"]
        rec["fine"] = first_numeric_list(r.get("per"))
        rec["unit"] = "1명" if rec["fine"] else "건"
        out.append(finish(rec))
    return out


def plain(items):
    return [finish(dict(r)) for r in items]


def penalties(d):
    out = []
    for r in d["P"]:
        rec = dict(r)
        rec["name"] = r["t"]
        rec["fines"] = [x for x in r["a"] if x != ""]
        rec["status"] = "확인"
        rec["source"] = dict(SOURCE)
        out.append(rec)
    return out


def write(name, obj):
    with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write("\n")


def main(path):
    d = extract(path)
    os.makedirs(OUT, exist_ok=True)
    write("workers", {"records": workers(d)})
    write("education", {"records": education(d)})
    write("health", {"records": plain(d["HL"])})
    write("foreign", {"records": plain(d["FL"])})
    write("roles", {"records": plain([r for r in d["R"] if r["id"] not in REMOVED_ROLES])})
    write("penalties", {"records": penalties(d)})
    write("tasks", {"records": [
        {"id": t[0], "name": t[1], "trades": t[2], "status": "확인", "source": dict(SOURCE)}
        for t in d["T"]]})
    write("env", {"records": [
        {"id": f"v{i}", "clause": v[0], "name": v[1], "content": v[2], "penalty": v[3],
         "status": "확인", "source": dict(SOURCE)} for i, v in enumerate(d["VENV"])]})
    write("nodes", {"nodes": d["NODES"]})
    print("exported")


if __name__ == "__main__":
    main(sys.argv[1])
