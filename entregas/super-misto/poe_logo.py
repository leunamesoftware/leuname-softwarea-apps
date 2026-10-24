#!/usr/bin/env python3
"""Coloca a logo oficial Supermisto no saquinho pronto que o ChatGPT fez (padrão: painel verde à direita).

Uso: python3 poe_logo.py <id>     (lê prontos-chatgpt/<id>.png e grava saquinhos/<id>.png)
A logo fica centralizada na parte verde, entre o furo e o nome do tempero, sempre do mesmo tamanho.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

AQUI = Path(__file__).resolve().parent
LOGO = AQUI / 'logo-nova' / 'logo-supermisto.png'


def painel_verde(a):
    """Caixa da área verde lisa (sem o nome): onde a logo cabe."""
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    verde = (g > r + 25) & (g > b + 5) & (g < 170)
    h, w = verde.shape
    cols = np.where(verde[: h // 2].mean(0) > 0.25)[0]
    x0, x1 = cols.min(), cols.max()
    # faixa vertical verde contínua logo abaixo do furo
    linhas = verde[:, x0:x1].mean(1)
    ys = np.where(linhas[: h // 2] > 0.6)[0]
    return x0, x1, ys


def main(pid, pesos=('10 g',)):
    im = Image.open(AQUI / 'prontos-chatgpt' / f'{pid}.png').convert('RGBA')
    a = np.asarray(im.convert('RGB'))
    x0, x1, ys = painel_verde(a)
    # zona da logo: entre o fim do furo e o começo do nome (as letras brancas)
    branco = (a[:, x0:x1].min(2) > 235).mean(1)
    h = a.shape[0]
    y0 = max(y for y in range(int(h * 0.15)) if branco[y] > 0.2) + 10
    y1 = next(y for y in range(y0 + 20, h) if branco[y] > 0.02) - 6
    # TAMANHO PADRÃO, igual em todos: 46% da largura da solapa, logo abaixo do furo
    lw = int(a.shape[1] * 0.46)
    logo = Image.open(LOGO).convert('RGBA')
    logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    if logo.height > y1 - y0:
        print(f'AVISO: o nome invade o espaço da logo em {logo.height - (y1 - y0)} px; peça ao ChatGPT o nome um pouco mais para baixo')
    y1 = y0 + logo.height
    # posição FIXA (fração da solapa), igual em todos: o painel verde vai de ~44% a ~96% da largura
    cheio = (a.min(2) < 225)
    xs_s = np.where(cheio[(y0 + y1) // 2])[0]
    sx0, sx1 = xs_s.min(), xs_s.max()
    cx, cy = int(sx0 + 0.705 * (sx1 - sx0)), (y0 + y1) // 2
    pos = (cx - logo.width // 2, cy - logo.height // 2)
    sombra = Image.new('RGBA', im.size, (0, 0, 0, 0))
    s = Image.new('RGBA', logo.size, (0, 0, 0, 110)); s.putalpha(logo.split()[-1].point(lambda v: v * 110 // 255))
    sombra.paste(s, (pos[0], pos[1] + 6), s)
    im = Image.alpha_composite(im, sombra.filter(ImageFilter.GaussianBlur(6)))
    im.alpha_composite(logo, pos)
    (AQUI / 'saquinhos').mkdir(exist_ok=True)
    for peso in pesos:
        out = im if peso == '10 g' else troca_peso(im, peso)
        nome = pid if peso == '10 g' else f"{pid}-{peso.replace(' ', '')}"
        out.convert('RGB').save(AQUI / 'saquinhos' / f'{nome}.png')
    print('ok', pid, 'logo', logo.size, 'em', pos)


def troca_peso(im, peso):
    """Reescreve o selo branco do peso (canto inferior direito da solapa) com outro peso: 30 g, 50 g, 100 g."""
    from PIL import ImageDraw, ImageFont
    a = np.asarray(im.convert('RGB')).astype(int)
    h, w = a.shape[:2]
    branco = a.min(2) > 235
    # o selo: linhas, na faixa de baixo à direita da solapa, com muito branco (as letras do nome ficam acima)
    zy0, zy1, zx0, zx1 = int(h * 0.34), int(h * 0.47), int(w * 0.76), int(w * 0.95)
    z = branco[zy0:zy1, zx0:zx1]
    linhas = np.where(z.mean(1) > 0.35)[0]
    y0, y1 = zy0 + linhas.min(), zy0 + linhas.max()
    cols = np.where(z[linhas.min():linhas.max() + 1].mean(0) > 0.5)[0]
    x0, x1 = zx0 + cols.min(), zx0 + cols.max()
    out = im.copy(); d = ImageDraw.Draw(out)
    d.rounded_rectangle([x0, y0, x1, y1], radius=(y1 - y0) // 2, fill='white')
    f = ImageFont.truetype(str(AQUI.parents[1] / 'calculadora' / 'scripts' / 'fontes' / 'Poppins-Bold.ttf'), int((y1 - y0) * 0.62))
    tw = d.textlength(peso, font=f)
    if tw > (x1 - x0) * 0.86:
        f = ImageFont.truetype(f.path, int(f.size * (x1 - x0) * 0.86 / tw)); tw = d.textlength(peso, font=f)
    d.text(((x0 + x1) / 2, (y0 + y1) / 2), peso, font=f, fill=(11, 110, 51), anchor='mm')
    return out


if __name__ == '__main__':
    # ex.: python3 poe_logo.py colorau          (só 10 g)
    #      python3 poe_logo.py colorau 10 30 50 100   (um saquinho de cada peso)
    main(sys.argv[1], tuple(f'{g} g' for g in sys.argv[2:]) or ('10 g',))
