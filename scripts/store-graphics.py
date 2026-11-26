"""Draws the Play Store app icon (512x512) and feature graphic (1024x500).

Usage: python scripts/store-graphics.py store-assets
"""
import io, json, math, sys
from PIL import Image, ImageDraw, ImageFont

out = sys.argv[1]
grades = sorted(json.load(io.open('src/data/physiognomy-rules.json', encoding='utf-8'))['grades'], key=lambda g: g['min'])
S = 2  # supersampling
BG, MINT, WHITE, GREY = (10, 15, 28), (0, 255, 170), (244, 248, 255), (165, 190, 199)
bold, regular = 'C:/Windows/Fonts/malgunbd.ttf', 'C:/Windows/Fonts/malgun.ttf'
font = lambda path, size: ImageFont.truetype(path, size * S)
rgb = lambda value: tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))
P = lambda *values: [v * S for v in values]


def face(draw, x, y, r, color, angel):
    if angel:
        draw.ellipse(P(x - r * .85, y - r * 1.75, x + r * .85, y - r * 1.2), outline=(255, 216, 74), width=int(r * .2 * S))
    else:
        for side in (-1, 1):
            draw.polygon(P(x + side * r * .95, y - r * .35, x + side * r * .75, y - r * 1.75, x + side * r * .15, y - r * .85), fill=color)
    draw.ellipse(P(x - r, y - r, x + r, y + r), fill=color)
    for side in (-1, 1):
        if angel:
            draw.arc(P(x + side * r * .38 - r * .2, y - r * .25, x + side * r * .38 + r * .2, y + r * .15), 200, 340, fill=BG, width=int(r * .14 * S))
        else:
            draw.ellipse(P(x + side * r * .38 - r * .16, y - r * .2, x + side * r * .38 + r * .16, y + r * .12), fill=BG)
    draw.arc(P(x - r * .5, y - r * .12, x + r * .5, y + r * .58), 20, 160, fill=BG, width=int(r * .14 * S))


def gauge(draw, cx, cy, radius, score):
    angle = lambda value: 180 + value * 1.8
    for index, grade in enumerate(grades):
        end = grades[index + 1]['min'] if index + 1 < len(grades) else 100
        draw.arc(P(cx - radius, cy - radius, cx + radius, cy + radius), angle(grade['min']) + (1 if index else 0),
                 angle(end) - (1 if index + 1 < len(grades) else 0), fill=rgb(grade['color']), width=int(radius * .22 * S))
    r = radius * .15
    face(draw, cx - radius + radius * .11, cy + radius * .3, r, rgb(grades[0]['color']), False)
    face(draw, cx + radius - radius * .11, cy + radius * .3, r, WHITE, True)
    a = math.radians(angle(score))
    length, half = radius * .7, radius * .065
    draw.polygon(P(cx + length * math.cos(a), cy + length * math.sin(a),
                   cx + half * math.cos(a + math.pi / 2), cy + half * math.sin(a + math.pi / 2),
                   cx - half * math.cos(a + math.pi / 2), cy - half * math.sin(a + math.pi / 2)), fill=WHITE)
    draw.ellipse(P(cx - radius * .115, cy - radius * .115, cx + radius * .115, cy + radius * .115), fill=WHITE)
    draw.ellipse(P(cx - radius * .05, cy - radius * .05, cx + radius * .05, cy + radius * .05), fill=BG)


def grid(draw, width, height):
    for x in range(0, width, 40):
        draw.line(P(x, 0, x, height), fill=(14, 28, 40), width=S)
    for y in range(0, height, 40):
        draw.line(P(0, y, width, y), fill=(14, 28, 40), width=S)


# Feature graphic. Play may crop the edges, so the content stays away from them.
image = Image.new('RGB', (1024 * S, 500 * S), BG)
draw = ImageDraw.Draw(image)
grid(draw, 1024, 500)
gauge(draw, 250, 300, 170, 78)
draw.text(P(480, 128), '모두의 인성측정', font=font(bold, 68), fill=WHITE)
draw.text(P(483, 232), '얼굴에 다 써 있어요', font=font(bold, 40), fill=MINT)
draw.text(P(483, 292), '내 인성, 몇 점일까?', font=font(bold, 40), fill=MINT)
draw.text(P(483, 368), '옛 관상서로 풀어 보는 재미용 얼굴 테스트', font=font(regular, 25), fill=GREY)
image.resize((1024, 500), Image.LANCZOS).save(f'{out}/feature-graphic-1024x500.png', optimize=True)

# App icon. Play applies its own rounded mask, so the square is full-bleed with no transparency.
source = Image.open('public/icons/icon-maskable-512.png').convert('RGB')
assert source.size == (512, 512)
source.save(f'{out}/app-icon-512.png', optimize=True)
