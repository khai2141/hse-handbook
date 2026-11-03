import hashlib, html as htmllib, os, re, time, urllib.parse, urllib.request


def normalize(html):
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()


def collapse_ws(text):
    return re.sub(r"\s+", " ", text).strip()


def text_hash(text):
    return hashlib.sha256(collapse_ws(text).encode("utf-8")).hexdigest()


def diff_report(watchlist, current):
    out = []
    for w in watchlist:
        if w["id"] not in current:
            out.append({"id": w["id"], "old": w["hash"], "new": None, "changed": None})
            continue
        new = text_hash(current[w["id"]])
        out.append({"id": w["id"], "old": w["hash"], "new": new, "changed": new != w["hash"]})
    return out


def _strip_noise(html):
    html = re.sub(r"<!--.*?-->", " ", html, flags=re.S)
    return re.sub(r"<(script|style)\b.*?</\1\s*>", " ", html, flags=re.S | re.I)


def _blocks(html):
    """Return (header_html, body_html) of the article container, or ('', '')."""
    h = _strip_noise(html)
    th = re.search(r'<th[^>]*class="lnkTh"[^>]*>(.*?)</th>', h, flags=re.S)
    tb = re.search(r'<tbody[^>]*id="lsLinkTable"[^>]*>(.*?)</tbody>', h, flags=re.S)
    return (th.group(1) if th else ""), (tb.group(1) if tb else "")


def header_line(html):
    th, _ = _blocks(html)
    m = re.search(r"<div[^>]*>(.*?)</div>", th, flags=re.S)
    return collapse_ws(htmllib.unescape(re.sub(r"<[^>]+>", " ", m.group(1)))) if m else ""


def extract_article(html):
    """Only the version header and the article body (th.lnkTh + tbody#lsLinkTable)."""
    th, tb = _blocks(html)
    if not th or not tb:
        return ""
    stripped = re.sub(r"<[^>]+>", " ", th + " " + tb)
    return collapse_ws(htmllib.unescape(stripped))


def fetch_article(law_name, jo_no, backend="html"):
    if backend == "api":
        oc = os.environ.get("LAW_OC")
        if not oc:
            raise RuntimeError("LAW_OC is not set")
        q = urllib.parse.urlencode({"OC": oc, "target": "law", "type": "HTML", "LM": law_name, "JO": jo_no})
        url = "https://www.law.go.kr/DRF/lawService.do?" + q
    else:
        q = urllib.parse.urlencode({"lsClsCd": "L", "mode": "11", "lsNm": law_name, "joNo": jo_no},
                                   quote_via=urllib.parse.quote)
        url = "https://www.law.go.kr/LSW/lsLinkProc.do?" + q
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (handbook-law-watcher)"})
            with urllib.request.urlopen(req, timeout=30) as r:
                text = extract_article(r.read().decode("utf-8", "replace"))
            if not text:
                raise ValueError("article container not found")
            return text
        except Exception as e:  # retry twice
            last = e
            time.sleep(1)
    raise RuntimeError("fetch failed: %s" % type(last).__name__)
