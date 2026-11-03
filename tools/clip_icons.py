"""Clip icon PNGs to their rounded-tile shape (in place).

Pixels whose centre lies outside a rounded rectangle of the given corner
radius get alpha 0, so bleeding edges of a tile do not remain visible.

Usage:
    py tools/clip_icons.py NAME [NAME ...]    # names without .png
    py tools/clip_icons.py --measure NAME ... # report changed-pixel share only, no write

Requires Pillow.
"""
import os
import sys

from PIL import Image

ICONS = os.path.join(os.path.dirname(__file__), "..", "assets", "icons")
RADIUS = 26  # fitted on clean tiles (doc_law, doc_fine, doc_checklist): 1-3 mismatches of 676 corner px


def inside_rounded(x, y, w, h, r):
    cx, cy = x + 0.5, y + 0.5
    if cx < 0 or cy < 0 or cx > w or cy > h:
        return False
    left, top = cx < r, cy < r
    right, bottom = cx > w - r, cy > h - r
    if (left or right) and (top or bottom):
        ax = r if left else w - r
        ay = r if top else h - r
        return (cx - ax) ** 2 + (cy - ay) ** 2 <= r * r
    return True


def clip(path, r=RADIUS, write=True):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    alpha = im.split()[3]
    changed = 0
    new_alpha = alpha.copy()
    for y in range(h):
        for x in range(w):
            if not inside_rounded(x, y, w, h, r):
                if alpha.getpixel((x, y)) != 0:
                    changed += 1
                new_alpha.putpixel((x, y), 0)
    share = changed / float(w * h)
    if write and changed:
        im.putalpha(new_alpha)
        im.save(path, "PNG")
    return changed, w * h, share


def main(argv):
    measure = "--measure" in argv
    names = [a for a in argv if not a.startswith("--")]
    if not names:
        print(__doc__)
        return 2
    for n in names:
        path = os.path.join(ICONS, n + ".png")
        changed, total, share = clip(path, write=not measure)
        verb = "would change" if measure else "changed"
        print(f"{n}: {verb} {changed} of {total} px ({share * 100:.3f}%)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
