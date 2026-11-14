"""Makes the Side app icons (run: python3 scripts/make-icons.py)."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images')
FONT = '/usr/share/fonts/opentype/inter/Inter-BlackItalic.otf'
PINK, PURPLE, BG = (255, 61, 127), (124, 58, 237), (7, 6, 11)


def gradient(size):
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = tuple(int(PINK[i] * (1 - t) + PURPLE[i] * t) for i in range(3))
    return img


def mark(size, scale, color='white'):
    """The 'S' with a small sparkle, centred, on a transparent layer."""
    layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    font = ImageFont.truetype(FONT, int(size * 0.62 * scale))
    box = d.textbbox((0, 0), 'S', font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((size - w) / 2 - box[0], (size - h) / 2 - box[1]), 'S', font=font, fill=color)
    cx, cy, r = size * (0.5 + 0.25 * scale), size * (0.5 - 0.25 * scale), size * 0.07 * scale
    d.polygon([(cx, cy - r), (cx + r * 0.3, cy - r * 0.3), (cx + r, cy), (cx + r * 0.3, cy + r * 0.3),
               (cx, cy + r), (cx - r * 0.3, cy + r * 0.3), (cx - r, cy), (cx - r * 0.3, cy - r * 0.3)], fill=color)
    return layer


def shadowed(base, layer):
    shadow = Image.new('RGBA', base.size, (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 110), mask=layer.split()[3])
    shadow = shadow.filter(ImageFilter.GaussianBlur(base.size[0] // 60))
    base = base.convert('RGBA')
    base.alpha_composite(shadow, (0, base.size[0] // 80))
    base.alpha_composite(layer)
    return base


S = 1024
# Main icon (iOS and old Android): full gradient square.
shadowed(gradient(S), mark(S, 1.0)).convert('RGB').save(f'{OUT}/icon.png')
# Android adaptive foreground: gradient circle inside the safe zone, on transparent.
fg = Image.new('RGBA', (S, S), (0, 0, 0, 0))
circle = Image.new('L', (S, S), 0)
ImageDraw.Draw(circle).ellipse([S * 0.19, S * 0.19, S * 0.81, S * 0.81], fill=255)
fg.paste(gradient(S), mask=circle)
shadowed(fg, mark(S, 0.55)).save(f'{OUT}/android-icon-foreground.png')
mark(S, 0.55).save(f'{OUT}/android-icon-monochrome.png')
# Splash and web favicon.
shadowed(fg, mark(S, 0.55)).resize((512, 512)).save(f'{OUT}/splash-icon.png')
shadowed(gradient(S), mark(S, 1.0)).convert('RGB').resize((48, 48)).save(f'{OUT}/favicon.png')
print('icons written')
