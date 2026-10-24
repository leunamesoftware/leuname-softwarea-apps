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


def main(pid):
    im = Image.open(AQUI / 'prontos-chatgpt' / f'{pid}.png').convert('RGBA')
    a = np.asarray(im.convert('RGB'))
    x0, x1, ys = painel_verde(a)
    # zona da logo: entre o fim do furo e o começo do nome (as letras brancas)
    branco = (a[:, x0:x1].min(2) > 235).mean(1)
    h = a.shape[0]
    y0 = max(y for y in range(int(h * 0.15)) if branco[y] > 0.2) + 10
    y1 = next(y for y in range(y0 + 20, h) if branco[y] > 0.02) - 6
    lw = int((x1 - x0) * 0.75)
    logo = Image.open(LOGO).convert('RGBA')
    logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    if logo.height > (y1 - y0) * 0.95:
        k = (y1 - y0) * 0.95 / logo.height
        logo = logo.resize((round(logo.width * k), round(logo.height * k)), Image.LANCZOS)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    pos = (cx - logo.width // 2, cy - logo.height // 2)
    sombra = Image.new('RGBA', im.size, (0, 0, 0, 0))
    s = Image.new('RGBA', logo.size, (0, 0, 0, 110)); s.putalpha(logo.split()[-1].point(lambda v: v * 110 // 255))
    sombra.paste(s, (pos[0], pos[1] + 6), s)
    im = Image.alpha_composite(im, sombra.filter(ImageFilter.GaussianBlur(6)))
    im.alpha_composite(logo, pos)
    (AQUI / 'saquinhos').mkdir(exist_ok=True)
    im.convert('RGB').save(AQUI / 'saquinhos' / f'{pid}.png')
    print('ok', pid, 'verde', x0, x1, 'logo em', pos, logo.size)


if __name__ == '__main__':
    main(sys.argv[1])
