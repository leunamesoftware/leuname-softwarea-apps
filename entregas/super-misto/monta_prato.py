#!/usr/bin/env python3
"""Foto de prato com os sachês de verdade (com logo) do lado direito.
Uso: python3 monta_prato.py   → pratos/<prato>-pronto.jpg
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
AQUI = Path(__file__).resolve().parent
PRATOS = {
    'feijao': ['colorau', 'cominho', 'alho-em-po'],
    'arroz': ['curcuma', 'alho-em-po', 'cebola-em-po'],
    'carne-de-panela': ['tempero-completo', 'pimenta-do-reino', 'paprica-doce'],
    'churrasco': ['chimichurri', 'paprica-defumada', 'pimenta-calabresa'],
}

def saquinho(pid, altura):
    im = Image.open(AQUI / 'saquinhos' / f'{pid}.png').convert('RGBA')
    a = np.array(im); a[..., 3] = np.where(a[..., :3].min(2) > 242, 0, 255)
    im = Image.fromarray(a); im = im.crop(im.getbbox())
    return im.resize((round(im.width * altura / im.height), altura), Image.LANCZOS)

for prato, sabores in PRATOS.items():
    fundo = Image.open(AQUI / 'pratos' / f'{prato}.jpg').convert('RGBA').resize((1024, 1024))
    W = 1024
    pos = [(640, 70, -4), (700, 360, 3), (610, 640, -2)]   # x, y, giro (escada)
    for pid, (x, y, giro) in zip(sabores, pos):
        s = saquinho(pid, 360).rotate(giro, expand=True, resample=Image.BICUBIC)
        sh = Image.new('RGBA', s.size, (0, 0, 0, 0)); sh.putalpha(s.split()[3].point(lambda v: v * 110 // 255))
        fundo.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)), (x + 10, y + 14))
        fundo.alpha_composite(s, (x, y))
    fundo.convert('RGB').save(AQUI / 'pratos' / f'{prato}-pronto.jpg', quality=90)
print('ok')
