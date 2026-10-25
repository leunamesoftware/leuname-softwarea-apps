#!/usr/bin/env python3
"""Coloca a logo oficial Supermisto no saquinho pronto que o ChatGPT fez (padrão: painel verde à direita).

Uso: python3 poe_logo.py <id>     (lê prontos-chatgpt/<id>.png e grava saquinhos/<id>.png)
A logo fica centralizada na parte verde, entre o furo e o nome do tempero, sempre do mesmo tamanho.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

AQUI = Path(__file__).resolve().parent
LOGO = AQUI / 'logo-bordo' / 'logo-supermisto.png'


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
    """Logo no canto de cima à esquerda da solapa (sobre a foto), tamanho fixo, sem encostar no furo nem no nome."""
    im = Image.open(AQUI / 'prontos-chatgpt' / f'{pid}.png').convert('RGBA')
    a = np.asarray(im.convert('RGB'))
    cheio = a.min(2) < 225
    y0 = next(y for y in range(a.shape[0]) if cheio[y].mean() > 0.5)
    xs = np.where(cheio[y0 + 60])[0]; sx0 = int(xs.min())
    # furo: branco na faixa de cima, no meio da solapa
    faixa = a[y0 + 20:y0 + 110].min(2) > 235
    cols = np.where(faixa.mean(0) > 0.3)[0]
    cols = cols[(cols > a.shape[1] * 0.25) & (cols < a.shape[1] * 0.75)]
    furo_x0 = int(cols.min()) if len(cols) else a.shape[1] // 2
    # 1) furo: apaga o furo grande da arte e desenha um furo borboleta menor, encostado no topo (abre espaço no verde)
    import cv2
    W = a.shape[1]
    zona = np.zeros(a.shape[:2], np.uint8)
    fz = (a[y0 + 5:y0 + 170, int(W * .3):int(W * .75)].min(2) > 228)
    ys, xs = np.where(fz)
    fx0, fx1 = int(xs.min() + W * .3), int(xs.max() + W * .3)
    fy0, fy1 = int(ys.min() + y0 + 5), int(ys.max() + y0 + 5)
    zona[fy0 - 6:fy1 + 8, fx0 - 8:fx1 + 8] = 255
    limpa = cv2.inpaint(np.ascontiguousarray(a[..., ::-1]), zona, 9, cv2.INPAINT_TELEA)[..., ::-1]
    base_img = Image.fromarray(limpa.copy()).convert('RGBA')
    base_img.putalpha(im.split()[-1])
    im = base_img
    d = ImageDraw.Draw(im)
    cxf, hf = (fx0 + fx1) // 2, 34
    ny0 = y0 + 14
    d.rounded_rectangle([cxf - 120, ny0, cxf + 120, ny0 + hf], radius=hf // 2, fill=(255, 255, 255, 255))
    d.ellipse([cxf - 26, ny0 - 8, cxf + 26, ny0 + hf + 8], fill=(255, 255, 255, 255))
    a = np.asarray(im.convert('RGB'))
    # 2) espaço no VERDE entre o furo novo e o nome
    topo = ny0 + hf + 8 + 14
    r_, g_, b_ = (a[:, int(W * .55):int(W * .9), i].astype(int) for i in range(3))
    verde = (g_ > r_ + 15) & (g_ > b_) & (g_ < 150)
    base = next(y for y in range(topo + 30, a.shape[0]) if verde[y].mean() < 0.75) - 16
    meio = (topo + base) // 2
    rr, gg, bb = (a[meio, :, i].astype(int) for i in range(3))
    vcols = np.where((gg > rr + 15) & (gg > bb) & (gg < 150))[0]
    vcols = vcols[vcols > W * 0.35]
    cx = int((vcols.min() + vcols.max()) // 2)
    logo = Image.open(LOGO).convert('RGBA')
    lh = min(base - topo, 128)  # mesmo tamanho em todos (o menor espaço da linha)
    lw = round(logo.width * lh / logo.height)
    logo = logo.resize((lw, lh), Image.LANCZOS)
    pos = (cx - lw // 2, topo + (base - topo - lh) // 2)
    sombra = Image.new('RGBA', im.size, (0, 0, 0, 0))
    s_ = Image.new('RGBA', logo.size, (0, 0, 0, 0)); s_.putalpha(logo.split()[-1].point(lambda v: v * 120 // 255))
    sombra.paste(s_, (pos[0] + 4, pos[1] + 8), s_)
    im = Image.alpha_composite(im, sombra.filter(ImageFilter.GaussianBlur(7)))
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
