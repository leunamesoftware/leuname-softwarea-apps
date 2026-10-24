#!/usr/bin/env python3
"""Foto do kit: os saquinhos de verdade (prontos-chatgpt/ ou saquinhos/ com logo) dentro da caixa do cenário.

Uso: python3 monta_kit.py   → kits/kit-10-temperos-10g.png (1254 x 1254, para a Shopee)
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = Path(__file__).resolve().parent
FONTES = AQUI.parents[1] / 'calculadora' / 'scripts' / 'fontes'
FUNDO = ['oregano', 'cominho', 'pimenta-do-reino', 'alho-em-po', 'cebola-em-po']
FRENTE = ['colorau', 'paprica-doce', 'tempero-completo', 'curcuma', 'chimichurri']


def saquinho(pid, altura):
    """Saquinho recortado (fundo branco vira transparente). Usa a versão com logo se já existir."""
    f = AQUI / 'saquinhos' / f'{pid}.png'
    if not f.exists() or not (AQUI / '.logo-final').exists():
        f = AQUI / 'prontos-chatgpt' / f'{pid}.png'
    im = Image.open(f).convert('RGBA')
    a = np.array(im)
    claro = a[..., :3].min(2) > 242
    a[..., 3] = np.where(claro, 0, 255)
    im = Image.fromarray(a)
    im = im.crop(im.getbbox())
    return im.resize((round(im.width * altura / im.height), altura), Image.LANCZOS)


def fileira(cena, pids, altura, base, x0, x1):
    sq = [saquinho(p, altura) for p in pids]
    passo = (x1 - x0 - sq[0].width) / (len(sq) - 1)
    # da direita para a esquerda: cada saquinho cobre só a foto do vizinho, o nome de todos fica à mostra
    for i, s in reversed(list(enumerate(sq))):
        x, y = round(x0 + i * passo), base - s.height
        sombra = Image.new('RGBA', s.size, (0, 0, 0, 0)); sombra.putalpha(s.split()[3].point(lambda v: v * 90 // 255))
        cena.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(8)), (x + 6, y + 8))
        cena.alpha_composite(s, (x, y))


def main():
    cena = Image.open(AQUI / 'kits' / 'cenario-caixa.png').convert('RGBA')
    parede = cena.crop((225, 1032, 1035, 1125))          # parede da frente da caixa (fica por cima)
    fileira(cena, FUNDO, 255, 625, 256, 1000)
    fileira(cena, FRENTE, 255, 1055, 252, 1004)
    cena.alpha_composite(parede, (225, 1032))
    d = ImageDraw.Draw(cena)
    f1 = ImageFont.truetype(str(FONTES / 'Poppins-ExtraBold.ttf'), 62)
    f2 = ImageFont.truetype(str(FONTES / 'Poppins-Bold.ttf'), 34)
    t1, t2 = 'KIT 10 TEMPEROS', '10 sachês de 10 g · 100% naturais'
    w = max(d.textlength(t1, font=f1), d.textlength(t2, font=f2)) + 90
    x0 = (cena.width - w) / 2
    d.rounded_rectangle([x0, 28, x0 + w, 168], radius=40, fill=(11, 110, 51, 240), outline='white', width=5)
    d.text((cena.width / 2, 80), t1, font=f1, fill='white', anchor='mm')
    d.text((cena.width / 2, 135), t2, font=f2, fill=(255, 225, 120), anchor='mm')
    cena.convert('RGB').save(AQUI / 'kits' / 'kit-10-temperos-10g.png')
    print('ok')


if __name__ == '__main__':
    main()
