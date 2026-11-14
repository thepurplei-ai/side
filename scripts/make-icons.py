"""Makes the side logo and app icons (run: python3 scripts/make-icons.py).

The logo is the word "side" in lowercase. The dot on the "i" is a gold play button.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', 'assets', 'images')
FONT = os.path.join(HERE, '..', 'node_modules', '@expo-google-fonts', 'manrope', '800ExtraBold', 'Manrope_800ExtraBold.ttf')
CREAM, GOLD = (247, 240, 227), (242, 181, 68)
TOP, BOTTOM = (40, 32, 92), (10, 10, 22)


def gradient(size):
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = tuple(int(TOP[i] * (1 - t) + BOTTOM[i] * t) for i in range(3))
    return img


def wordmark(height, color=CREAM, dot=GOLD):
    """Draws "side" with a play-button dot on the i. Returns a tight transparent image."""
    font = ImageFont.truetype(FONT, int(height))
    pad = int(height * 0.6)
    canvas = Image.new('RGBA', (int(height * 4) + 2 * pad, int(height * 2) + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    x, base = pad, pad + int(height * 0.6)
    parts = ['s', 'ı', 'de']  # dotless i, so we can draw our own dot
    i_box = None
    for p in parts:
        box = d.textbbox((x, base), p, font=font, anchor='ls')
        d.text((x, base), p, font=font, fill=color, anchor='ls')
        if p == 'ı':
            i_box = box
        x = box[2] + int(height * 0.02)
    # Play-button dot above the i.
    cx = (i_box[0] + i_box[2]) / 2
    s = height * 0.2
    top = i_box[1] - height * 0.07 - s
    # Rounded play triangle, centred over the i.
    tri = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(tri).polygon([(cx - s * 0.38, top), (cx - s * 0.38, top + s), (cx + s * 0.5, top + s / 2)], fill=dot)
    tri = tri.filter(ImageFilter.GaussianBlur(height * 0.012))
    alpha = tri.split()[3].point(lambda v: 255 if v > 110 else 0)
    canvas.paste(dot, mask=alpha)
    return canvas.crop(canvas.getbbox())


def place(base, mark, width_ratio):
    w = int(base.size[0] * width_ratio)
    h = int(mark.size[1] * w / mark.size[0])
    m = mark.resize((w, h), Image.LANCZOS)
    base = base.convert('RGBA')
    shadow = Image.new('RGBA', base.size, (0, 0, 0, 0))
    pos = ((base.size[0] - w) // 2, (base.size[1] - h) // 2)
    shadow.paste((0, 0, 0, 120), (pos[0], pos[1] + base.size[0] // 90), mask=m.split()[3])
    base.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(base.size[0] // 70)))
    base.alpha_composite(m, pos)
    return base


S = 1024
mark = wordmark(400)
# In-app logo (used in the Home header and sign-up screen).
mark.resize((int(mark.size[0] * 120 / mark.size[1]), 120), Image.LANCZOS).save(f'{OUT}/logo.png')
# Main icon (iPhone and older Android).
place(gradient(S), mark, 0.66).convert('RGB').save(f'{OUT}/icon.png')
# Android adaptive icon: the word must fit inside the middle safe zone.
fg = place(Image.new('RGBA', (S, S), (0, 0, 0, 0)), mark, 0.5)
fg.save(f'{OUT}/android-icon-foreground.png')
place(Image.new('RGBA', (S, S), (0, 0, 0, 0)), wordmark(400, (255, 255, 255), (255, 255, 255)), 0.5).save(f'{OUT}/android-icon-monochrome.png')
place(Image.new('RGBA', (S, S), (0, 0, 0, 0)), mark, 0.8).resize((512, 512), Image.LANCZOS).save(f'{OUT}/splash-icon.png')
place(gradient(S), mark, 0.8).convert('RGB').resize((48, 48), Image.LANCZOS).save(f'{OUT}/favicon.png')
print('logo and icons written')
