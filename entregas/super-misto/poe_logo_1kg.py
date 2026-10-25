#!/usr/bin/env python3
"""Logo oficial no pacote de 1 kg: no alto do painel verde da etiqueta, centralizada, acima do nome.
Uso: python3 poe_logo_1kg.py <id>   (lê prontos-chatgpt/1kg/<id>.png e grava saquinhos/<id>-1kg.png)
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd

AQUI = Path(__file__).resolve().parent
LOGO = AQUI / 'logo-roxa' / 'logo-branca-risco.png'  # logo nova: branca, folhas e risco dourados


def main(pid):
    im = Image.open(AQUI / 'prontos-chatgpt' / '1kg' / f'{pid}.png').convert('RGBA')
    hsv = np.asarray(im.convert('RGB').convert('HSV')).astype(int)
    verde = (hsv[..., 0] > 70) & (hsv[..., 0] < 130) & (hsv[..., 1] > 70) & (hsv[..., 2] < 170)
    lab, _ = nd.label(nd.binary_opening(verde, iterations=2))
    painel = lab == (np.bincount(lab.ravel())[1:].argmax() + 1)
    ys, xs = np.where(painel)
    top = int(ys.min())
    # largura do painel no alto (o lado esquerdo é diagonal)
    linha = np.where(painel[top + 25])[0]
    x0, x1 = int(linha.min()), int(linha.max())
    # onde começa o nome: primeira linha, abaixo do topo, em que o verde some bastante no meio do painel
    meio = painel[:, x0 + (x1 - x0) // 4:x1 - (x1 - x0) // 8]
    base = next(y for y in range(top + 30, int(ys.max())) if meio[y].mean() < 0.7) - 10
    logo = Image.open(LOGO).convert('RGBA')
    lw = round((x1 - x0) * 0.62)
    lh = round(logo.height * lw / logo.width)
    if lh > base - top - 20:
        lh = base - top - 20; lw = round(logo.width * lh / logo.height)
    logo = logo.resize((lw, lh), Image.LANCZOS)
    pos = ((x0 + x1) // 2 - lw // 2, top + (base - top - lh) // 2)
    sombra = Image.new('RGBA', im.size, (0, 0, 0, 0))
    s = Image.new('RGBA', logo.size, (0, 0, 0, 0)); s.putalpha(logo.split()[-1].point(lambda v: v * 150 // 255))
    sombra.paste(s, (pos[0] + 3, pos[1] + 6), s)
    im = Image.alpha_composite(im, sombra.filter(ImageFilter.GaussianBlur(6)))
    im.alpha_composite(logo, pos)
    im.convert('RGB').save(AQUI / 'saquinhos' / f'{pid}-1kg.png')
    print('ok', pid, logo.size, pos)


if __name__ == '__main__':
    main(sys.argv[1])
