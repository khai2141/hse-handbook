import os
import sys
import unittest

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, ROOT)

try:
    from PIL import Image
    from tools.clip_icons import inside_rounded, RADIUS
except ImportError:
    Image = None

ICONS = os.path.join(ROOT, "assets", "icons")
CLIPPED = ["edu_signin", "health_dust", "doc_checklist"]


@unittest.skipIf(Image is None, "Pillow not available")
class IconClipTests(unittest.TestCase):
    def test_clipped_icons_have_transparent_corners_and_outside(self):
        for name in CLIPPED:
            with self.subTest(icon=name):
                im = Image.open(os.path.join(ICONS, name + ".png")).convert("RGBA")
                w, h = im.size
                a = im.split()[3]
                for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
                    self.assertEqual(a.getpixel((x, y)), 0, f"corner ({x},{y})")
                for y in range(h):
                    for x in range(w):
                        if not inside_rounded(x, y, w, h, RADIUS):
                            self.assertEqual(a.getpixel((x, y)), 0, f"outside ({x},{y})")

    def test_clipped_icons_centre_is_opaque(self):
        for name in CLIPPED:
            with self.subTest(icon=name):
                im = Image.open(os.path.join(ICONS, name + ".png")).convert("RGBA")
                w, h = im.size
                self.assertGreater(im.split()[3].getpixel((w // 2, h // 2)), 0)


if __name__ == "__main__":
    unittest.main()
