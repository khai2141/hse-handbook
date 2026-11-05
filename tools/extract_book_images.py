"""Extract the cartoon illustrations of 만화로 보는 산업안전보건기준에 관한 규칙 and map them to articles.

Output (assets/book is git-ignored: the book is copyrighted, images ship only in the offline build):
  assets/book/<article id>_<n>.webp   resized illustrations
  data/images.json                    {"records":[{id, article, file, w, h, page, how}]}

Mapping: every article heading on a page ("제N조(제목)", "제N조의M(제목)") is located; an image is assigned to the
heading above it whose banner overlaps the image horizontally, else the nearest heading above it ("how": "column" | "above").
Pages with no heading above an image are skipped. Decorative items (QR codes, margin tabs, tiny icons, images
repeated on many pages) are dropped.

Usage: py tools/extract_book_images.py [--pdf PATH] [--max-width 380]
"""
import argparse, collections, hashlib, io, json, os, re, sys
import pymupdf
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT_DIR = os.path.join(ROOT, "assets", "book")
OUT_JSON = os.path.join(ROOT, "data", "images.json")
DEFAULT_PDF = r"C:/Users/ledin/Downloads/만화로 보는 산업안전보건기준에 관한 규칙.pdf"
HEAD = re.compile(r"^제\s*(\d+)\s*조\s*(?:의\s*)?(\d+)?\s*\(")  # the book prints 제4조의2 as "제4조2("
BOOK = "만화로 보는 산업안전보건기준에 관한 규칙"


def art_id(n, m):
    return f"sr-{n}" + (f"-{m}" if m else "")


def headings(page):
    out = []
    for b in page.get_text("dict")["blocks"]:
        for ln in b.get("lines", []):
            text = "".join(s["text"] for s in ln["spans"]).strip()
            m = HEAD.match(text)
            if m and ln["spans"][0]["size"] >= 9:
                out.append({"id": art_id(m.group(1), m.group(2)), "jo": "제" + m.group(1) + "조" + ("의" + m.group(2) if m.group(2) else ""), "bbox": pymupdf.Rect(ln["bbox"])})
    return sorted(out, key=lambda h: (h["bbox"].y0, h["bbox"].x0))


def boxes(page):
    pr = page.rect
    out = []
    for d in page.get_drawings():
        r = d["rect"]
        if "s" in (d.get("type") or "") and r.width > 150 and r.height > 100 and r.width < pr.width - 20:
            out.append(r)
    return out


def pick(img_rect, heads, frames=()):
    c = pymupdf.Point((img_rect.x0 + img_rect.x1) / 2, (img_rect.y0 + img_rect.y1) / 2)
    inside = sorted((f for f in frames if f.contains(c)), key=lambda f: f.width * f.height)
    for f in inside[:1]:
        top = [h for h in heads if f.x0 - 6 <= h["bbox"].x0 <= f.x1 and f.y0 - 30 <= h["bbox"].y0 <= f.y0 + 45]
        if top:
            return min(top, key=lambda h: h["bbox"].y0), "box"
    above = [h for h in heads if h["bbox"].y0 <= img_rect.y0 + 4]
    if not above:
        return None, None
    cx = (img_rect.x0 + img_rect.x1) / 2
    col = [h for h in above if h["bbox"].x0 - 6 <= cx <= max(h["bbox"].x1, h["bbox"].x0 + 230) + 6]
    if col:
        return max(col, key=lambda h: h["bbox"].y0), "column"
    return max(above, key=lambda h: h["bbox"].y0), "above"


def load(doc, xref):
    info = doc.extract_image(xref)
    im = Image.open(io.BytesIO(info["image"]))
    sm = info.get("smask")
    if sm:
        a = Image.open(io.BytesIO(doc.extract_image(sm)["image"])).convert("L").resize(im.size)
        im = im.convert("RGBA")
        im.putalpha(a)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    return im.convert("RGB")


def is_qr(im, rect):
    w, h = rect.width, rect.height
    if not (0.85 <= w / h <= 1.18) or w > 70:
        return False
    small = im.resize((32, 32)).convert("L")
    px = list(small.getdata())
    bw = sum(1 for v in px if v < 60 or v > 200) / len(px)
    return bw > 0.9


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=DEFAULT_PDF)
    ap.add_argument("--max-width", type=int, default=380)
    a = ap.parse_args()
    doc = pymupdf.open(a.pdf)
    os.makedirs(OUT_DIR, exist_ok=True)
    cands, seen = [], collections.Counter()
    for pno, page in enumerate(doc, 1):
        heads = headings(page)
        frames = boxes(page)
        if not heads:
            continue
        for info in page.get_image_info(xrefs=True):
            xref = info.get("xref")
            r = pymupdf.Rect(info["bbox"])
            if not xref or r.width < 45 or r.height < 35 or r.x1 < 45 or r.y0 > page.rect.height - 40:
                continue
            h, how = pick(r, heads, frames)
            if not h:
                continue
            cands.append((pno, xref, r, h, how))
            seen[xref] += 1
    kept, per_art, hashes = [], collections.Counter(), set()
    for pno, xref, r, h, how in cands:
        if seen[xref] > 3:
            continue
        try:
            im = load(doc, xref)
        except Exception as e:  # noqa: BLE001
            print("skip", pno, xref, e, file=sys.stderr)
            continue
        if is_qr(im, r):
            continue
        sig = hashlib.sha1(im.resize((24, 24)).convert("L").tobytes()).hexdigest()
        if sig in hashes:
            continue
        hashes.add(sig)
        if im.width > a.max_width:
            im = im.resize((a.max_width, round(im.height * a.max_width / im.width)), Image.LANCZOS)
        per_art[h["id"]] += 1
        name = f"{h['id']}_{per_art[h['id']]}.webp"
        im.save(os.path.join(OUT_DIR, name), "WEBP", quality=72, method=6)
        kept.append({"id": f"{h['id']}#{per_art[h['id']]}", "article": h["id"], "jo": h["jo"], "file": name, "w": im.width, "h": im.height, "page": pno, "how": how})
    kept.sort(key=lambda k: (k["page"], k["id"]))
    json.dump({"meta": {"book": BOOK, "note": "삽화는 책에서 가져온 설명용 그림입니다. 조문 위치는 쪽 배치로 추정했습니다."}, "records": kept}, open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    size = sum(os.path.getsize(os.path.join(OUT_DIR, k["file"])) for k in kept)
    print(f"images {len(kept)} for {len(per_art)} articles, {size/1e6:.1f} MB; column={sum(k['how']=='column' for k in kept)} above={sum(k['how']=='above' for k in kept)}")


if __name__ == "__main__":
    main()
