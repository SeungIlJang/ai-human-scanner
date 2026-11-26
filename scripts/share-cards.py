"""Draws one link-preview card per kindness score (0-100): a devil-to-angel gauge with the score and grade."""
import io, json, math, sys
from PIL import Image, ImageDraw, ImageFont

out = sys.argv[1]
only = [int(n) for n in sys.argv[2:]] or range(101)
grades = json.load(io.open('src/data/physiognomy-rules.json', encoding='utf-8'))['grades']
S = 2  # supersampling
BG, MINT, WHITE, GREY = (10, 15, 28), (0, 255, 170), (244, 248, 255), (165, 190, 199)
bold, regular = 'C:/Windows/Fonts/malgunbd.ttf', 'C:/Windows/Fonts/malgun.ttf'
font = lambda path, size: ImageFont.truetype(path, size * S)
rgb = lambda value: tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))
P = lambda *values: [v * S for v in values]
CX, CY, R = 300, 400, 205


def angle(score):
    return 180 + score * 1.8


def devil(draw, x, y, r, color):
    draw.polygon(P(x - r * .95, y - r * .35, x - r * .75, y - r * 1.75, x - r * .15, y - r * .85), fill=color)
    draw.polygon(P(x + r * .95, y - r * .35, x + r * .75, y - r * 1.75, x + r * .15, y - r * .85), fill=color)
    draw.ellipse(P(x - r, y - r, x + r, y + r), fill=color)
    for side in (-1, 1):
        draw.ellipse(P(x + side * r * .38 - r * .16, y - r * .2, x + side * r * .38 + r * .16, y + r * .12), fill=BG)
    draw.arc(P(x - r * .5, y - r * .1, x + r * .5, y + r * .6), 20, 160, fill=BG, width=int(r * .14 * S))


def angel(draw, x, y, r, color):
    draw.ellipse(P(x - r * .85, y - r * 1.75, x + r * .85, y - r * 1.2), outline=(255, 216, 74), width=int(r * .2 * S))
    draw.ellipse(P(x - r, y - r, x + r, y + r), fill=color)
    for side in (-1, 1):
        draw.arc(P(x + side * r * .38 - r * .2, y - r * .25, x + side * r * .38 + r * .2, y + r * .15), 200, 340, fill=BG, width=int(r * .14 * S))
    draw.arc(P(x - r * .5, y - r * .15, x + r * .5, y + r * .55), 20, 160, fill=BG, width=int(r * .14 * S))


def card(score):
    grade = next(g for g in grades if score >= g['min'])
    image = Image.new('RGB', (1200 * S, 630 * S), BG)
    draw = ImageDraw.Draw(image)
    for x in range(0, 1200, 40):
        draw.line(P(x, 0, x, 630), fill=(14, 28, 40), width=S)
    for y in range(0, 630, 40):
        draw.line(P(0, y, 1200, y), fill=(14, 28, 40), width=S)
    # Gauge: one arc segment per grade, from the lowest scores on the left.
    bounds = [0] + sorted(g['min'] for g in grades if g['min'] > 0) + [100]
    ordered = sorted(grades, key=lambda g: g['min'])
    for index, g in enumerate(ordered):
        start, end = angle(bounds[index]) + (1 if index else 0), angle(bounds[index + 1]) - (1 if index < len(ordered) - 1 else 0)
        draw.arc(P(CX - R, CY - R, CX + R, CY + R), start, end, fill=rgb(g['color']), width=46 * S)
    devil(draw, CX - R + 23, CY + 62, 30, rgb(ordered[0]['color']))
    angel(draw, CX + R - 23, CY + 62, 30, WHITE)
    a = math.radians(angle(score))
    tip = (CX + (R - 62) * math.cos(a), CY + (R - 62) * math.sin(a))
    side = (math.cos(a + math.pi / 2) * 13, math.sin(a + math.pi / 2) * 13)
    draw.polygon(P(tip[0], tip[1], CX + side[0], CY + side[1], CX - side[0], CY - side[1]), fill=WHITE)
    draw.ellipse(P(CX - 24, CY - 24, CX + 24, CY + 24), fill=WHITE)
    draw.ellipse(P(CX - 10, CY - 10, CX + 10, CY + 10), fill=BG)
    draw.text(P(CX, CY + 92), f'{score}점', font=font(bold, 78), fill=rgb(grade['color']), anchor='mm')

    draw.text(P(600, 96), '모두의 인성측정', font=font(bold, 34), fill=GREY)
    draw.text(P(596, 150), f'내 인성 {score}점', font=font(bold, 92), fill=WHITE)
    draw.text(P(600, 282), f'"{grade["name"]}"', font=font(bold, 52), fill=rgb(grade['color']))
    draw.text(P(600, 366), '너는 몇 점? 얼굴에 다 써 있대', font=font(regular, 38), fill=WHITE)
    label = '얼굴 찍고 확인하기  ▶'
    width = draw.textlength(label, font=font(bold, 40)) / S
    draw.rounded_rectangle(P(600, 450, 600 + width + 80, 534), radius=42 * S, fill=MINT)
    draw.text(P(640, 463), label, font=font(bold, 40), fill=(6, 35, 27))
    return image.resize((1200, 630), Image.LANCZOS).quantize(colors=96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)


for score in only:
    card(score).save(f'{out}/{score}.png', optimize=True)
