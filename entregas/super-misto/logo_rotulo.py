"""Logo no rótulo de garrafa com cara de impressa: encurva no cilindro, pega a luz e a sombra da garrafa e
fica do tamanho certo dentro da faixa (sem 'adesivo colado por cima').

Uso: python3 logo_rotulo.py <imagem> <id> <slug> <centro_x> <centro_y> <largura_garrafa_no_rotulo> [escala=0.62]
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
import fotos_site as F

AQUI = Path(__file__).parent


def cilindro(logo, raio):
    """Encurva a logo como se estivesse impressa num cilindro de raio `raio` (px) visto de frente."""
    a = np.asarray(logo).astype(np.float32)
    h, w = a.shape[:2]
    # coluna na tela -> ângulo -> coluna na arte plana
    xs = np.arange(w) - w / 2
    ang_max = np.arcsin(min(0.999, (w / 2) / raio))
    plano = raio * ang_max  # meia largura da arte "desenrolada"
    th = np.arcsin(np.clip(xs / raio, -0.999, 0.999))
    src = (raio * th / plano) * (w / 2) + w / 2
    src = np.clip(src, 0, w - 1)
    i0 = np.floor(src).astype(int); i1 = np.clip(i0 + 1, 0, w - 1); f = (src - i0)[None, :, None]
    out = a[:, i0] * (1 - f) + a[:, i1] * f
    # luz: mais escura nas bordas do cilindro, brilho suave no meio-esquerda
    sombra = (0.78 + 0.22 * np.cos(th * 1.05))[None, :, None]
    out[..., :3] *= sombra
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')


def main(img, pid, slug, cx, cy, larg_garrafa, escala=0.62):
    im = Image.open(img).convert('RGBA')
    (AQUI / 'molhos').mkdir(exist_ok=True)
    orig = AQUI / 'molhos' / f'{pid}-original.png'
    if not orig.exists(): im.convert('RGB').save(orig)
    im = Image.open(orig).convert('RGBA')
    logo = Image.open(AQUI / 'logo-roxa' / 'logo-branca-risco.png').convert('RGBA')
    lw = int(larg_garrafa * escala)
    logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    logo = cilindro(logo, raio=larg_garrafa / 2)
    # sombra bem curta (encostada, como tinta), não de adesivo
    x, y = cx - logo.width // 2, cy - logo.height // 2
    s = Image.new('RGBA', im.size, (0, 0, 0, 0))
    m = Image.new('RGBA', logo.size, (0, 0, 0, 0)); m.putalpha(logo.split()[-1].point(lambda v: v * 130 // 255))
    s.paste(m, (x + 1, y + 2), m)
    im = Image.alpha_composite(im, s.filter(ImageFilter.GaussianBlur(2)))
    im.alpha_composite(logo, (x, y))
    final = AQUI / 'molhos' / f'{pid}.png'
    im.convert('RGB').save(final)
    F.quadrado(F.recortar(final)).save(F.DESTINO / f'{slug}.webp', 'WEBP', quality=82, method=4)
    print('ok', final, logo.size)


if __name__ == '__main__':
    a = sys.argv[1:]
    main(a[0], a[1], a[2], int(a[3]), int(a[4]), int(a[5]), float(a[6]) if len(a) > 6 else 0.62)
