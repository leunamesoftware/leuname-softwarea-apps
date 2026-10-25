"""Muda a cor do tempero dentro do saquinho (só o recheio, abaixo da solapa) para cada sabor ficar diferente.
Uso: python3 cor_recheio.py <id> <giro de matiz em graus> <saturação x> <brilho x>
Aplica em saquinhos/<id>.png e nas versões -30g/-50g/-100g (mesma posição)."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from padroniza import partes

AQUI = Path(__file__).parent


def recolorir(arq, giro, sat, bri):
    im = Image.open(arq).convert('RGB')
    _, pac = partes(im)
    hsv = np.asarray(im.convert('HSV')).astype(float)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    m = np.zeros(h.shape)
    x0, y0, x1, y1 = pac
    m[y0 + 15:y1 - 15, x0 + 15:x1 - 15] = 1
    m *= np.clip((s - 40) / 50, 0, 1)  # só o que tem cor (deixa o plástico e os brilhos brancos)
    m = np.asarray(Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(6))) / 255
    h2 = (h + giro * 256 / 360) % 256
    s2 = np.clip(s * sat, 0, 255)
    v2 = np.clip(v * bri, 0, 255)
    novo = np.stack([h * (1 - m) + h2 * m, s * (1 - m) + s2 * m, v * (1 - m) + v2 * m], -1)
    Image.fromarray(novo.round().astype('uint8'), 'HSV').convert('RGB').save(arq)


if __name__ == '__main__':
    pid, giro, sat, bri = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
    for suf in ('', '-30g', '-50g', '-100g'):
        f = AQUI / 'saquinhos' / f'{pid}{suf}.png'
        if f.exists():
            recolorir(f, giro, sat, bri)
    print('ok', pid)
