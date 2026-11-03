import glob, json, os, struct, unittest

ROOT = os.path.join(os.path.dirname(__file__), "..")
ICONS = os.path.join(ROOT, "assets", "icons")
PNG_SIG = b"\x89PNG\r\n\x1a\n"


def icons_in(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("icon", "i") and isinstance(v, str):
                yield v
            else:
                yield from icons_in(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from icons_in(v)


def png_width(path):
    with open(path, "rb") as f:
        head = f.read(24)
    if len(head) < 24 or head[:8] != PNG_SIG or head[12:16] != b"IHDR":
        return None
    return struct.unpack(">I", head[16:20])[0]


class IconTests(unittest.TestCase):
    def test_every_icon_reference_exists(self):
        missing = []
        for p in sorted(glob.glob(os.path.join(ROOT, "data", "*.json"))):
            with open(p, encoding="utf-8") as f:
                data = json.load(f)
            for name in icons_in(data):
                if not os.path.exists(os.path.join(ICONS, name + ".png")):
                    missing.append((os.path.basename(p), name))
        self.assertEqual(missing, [])

    def test_every_bundled_icon_is_valid_png_up_to_256(self):
        bad = []
        files = sorted(glob.glob(os.path.join(ICONS, "*.png")))
        self.assertTrue(files, "no icons found in assets/icons")
        for p in files:
            w = png_width(p)
            if w is None or not (0 < w <= 256):
                bad.append((os.path.basename(p), w))
        self.assertEqual(bad, [])


if __name__ == "__main__":
    unittest.main()
