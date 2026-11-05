"""Generate one unique flat icon per tree node (assets/icons/n_<id>.png) and point nodes.json at it.

Each icon is a rounded tile in the PDCA colour of its branch with a 2-syllable Hangul label,
so no two nodes can share an icon. Usage: py tools/make_node_icons.py
"""
import json, os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")
NODES = os.path.join(ROOT, "data", "nodes.json")
OUT = os.path.join(ROOT, "assets", "icons")
FONT = "C:/Windows/Fonts/malgunbd.ttf"

LABEL = {
    "home": "홈", "p": "계획", "p.rule": "방침", "p.org": "조직", "p.risk": "위험", "p.doc": "서류",
    "d": "실행", "d.edu": "교육", "d.edu.w": "근로", "d.edu.w.f": "외국", "d.edu.w.t": "특별", "d.edu.m": "관리",
    "d.hea": "보건", "d.hea.w": "검진", "d.hea.env": "환경", "d.hea.std": "기준", "d.daily": "일상", "d.sub": "도급",
    "d.tech": "공종", "d.tech.com": "공통", "d.tech.mach": "기계", "d.tech.fire": "화재", "d.tech.elec": "전기",
    "d.tech.work": "작업", "d.tech.sp": "특수", "d.tech.tbl": "별표", "d.emg": "비상",
    "c": "점검", "c.insp": "감사", "c.res": "결과", "a": "개선", "a.fix": "시정", "a.rev": "검토",
    "g": "기반", "g.law": "법령", "g.pen": "벌칙",
}
# (top colour, bottom colour) by branch family
COL = {"home": ("#1f3a5f", "#2f5d8c"), "p": ("#2f6fed", "#1f4fb5"), "d": ("#1f9d63", "#12754a"),
       "c": ("#e08a00", "#b86a00"), "a": ("#8b4fd1", "#6a35a8"), "g": ("#586579", "#3b4658")}


def family(nid):
    return nid.split(".")[0]


def tile(nid, text):
    S = 256
    top, bot = COL[family(nid)]
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    grad = Image.new("RGBA", (S, S))
    gd = ImageDraw.Draw(grad)
    t, b = [tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for c in (top, bot)]
    for y in range(S):
        k = y / (S - 1)
        gd.line([(0, y), (S, y)], fill=tuple(round(t[j] + (b[j] - t[j]) * k) for j in range(3)) + (255,))
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([8, 8, S - 8, S - 8], radius=44, fill=255)
    img.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(img)
    # depth marker: top-right dots = depth of the node in the tree
    depth = nid.count(".") + (0 if nid == "home" else 1)
    for i in range(depth):
        d.ellipse([S - 40 - i * 18, 24, S - 28 - i * 18, 36], fill=(255, 255, 255, 190))
    chars = list(text)
    size = 112 if len(chars) == 1 else 92
    font = ImageFont.truetype(FONT, size)
    lines = chars if len(chars) > 1 else chars
    total = len(lines) * size * 1.0
    y0 = (S - total) / 2 - 6
    for k, ch in enumerate(lines):
        w = d.textlength(ch, font=font)
        d.text(((S - w) / 2, y0 + k * size), ch, font=font, fill=(255, 255, 255, 255))
    return img


def main():
    doc = json.load(open(NODES, encoding="utf-8"))
    nodes = doc["nodes"]
    assert set(nodes) == set(LABEL), set(nodes) ^ set(LABEL)
    assert len(set(LABEL.values())) == len(LABEL), "duplicate labels"
    for nid in nodes:
        name = "n_" + nid.replace(".", "_")
        tile(nid, LABEL[nid]).save(os.path.join(OUT, name + ".png"), optimize=True)
        nodes[nid]["i"] = name
    json.dump(doc, open(NODES, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("icons", len(nodes))


if __name__ == "__main__":
    main()
