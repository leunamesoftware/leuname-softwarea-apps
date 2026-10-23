#!/usr/bin/env python3
"""Vetoriza a logo Supermisto (faixa verde + borda branca + nome) e gera SVG/PNG limpos, sem o ®."""
import sys
import numpy as np, potrace
from PIL import Image
from scipy import ndimage

src = sys.argv[1]
im = Image.open(src).convert('RGBA')
im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)  # traço mais suave
a = np.array(im).astype(int)
alpha = a[..., 3] > 128
branco = alpha & (a[..., 0] > 170) & (a[..., 1] > 170) & (a[..., 2] > 170)
# tira o ® (pequena área branca isolada no canto de cima à direita)
rot, n = ndimage.label(branco)
H, W = branco.shape
for i in range(1, n + 1):
    ys, xs = np.where(rot == i)
    if len(ys) < 0.004 * H * W and xs.mean() > 0.85 * W and ys.mean() < 0.4 * H:
        branco[rot == i] = False
# preenche os buracos internos do ® apagado e alisa
branco = ndimage.binary_opening(branco, iterations=1)
contorno = ndimage.binary_fill_holes(alpha)


def caminho(mask):
    bm = potrace.Bitmap(~mask)  # potracer traça o lado False
    pl = bm.trace(turdsize=40, alphamax=1.1, opticurve=True, opttolerance=0.3)
    d = []
    for c in pl:
        s = c.start_point; d.append(f'M{s.x:.1f},{s.y:.1f}')
        for seg in c.segments:
            if seg.is_corner:
                d.append(f'L{seg.c.x:.1f},{seg.c.y:.1f}L{seg.end_point.x:.1f},{seg.end_point.y:.1f}')
            else:
                d.append(f'C{seg.c1.x:.1f},{seg.c1.y:.1f} {seg.c2.x:.1f},{seg.c2.y:.1f} {seg.end_point.x:.1f},{seg.end_point.y:.1f}')
        d.append('Z')
    return ''.join(d)


d_fundo, d_branco = caminho(contorno), caminho(branco)
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 {W + 40} {H + 50}" width="{(W + 40) // 2}" height="{(H + 50) // 2}">
<defs>
 <linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A8A45"/><stop offset=".55" stop-color="#0B6E33"/><stop offset="1" stop-color="#045424"/></linearGradient>
 <filter id="s" x="-5%" y="-10%" width="110%" height="130%"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#002b12" flood-opacity=".35"/></filter>
 <filter id="t" x="-5%" y="-10%" width="110%" height="130%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#002b12" flood-opacity=".35"/></filter>
</defs>
<path d="{d_fundo}" fill="url(#v)" fill-rule="evenodd" filter="url(#s)"/>
<path d="{d_branco}" fill="#FFFFFF" fill-rule="evenodd" filter="url(#t)"/>
</svg>'''
open('logo-supermisto.svg', 'w').write(svg)
print('ok', W, H, len(svg))
