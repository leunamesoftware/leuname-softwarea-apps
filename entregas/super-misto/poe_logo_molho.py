"""Logo Supermisto no rótulo de molho/pote feito em outra IA e foto recortada para o site.

Uso: python3 poe_logo_molho.py <imagem> <id> <slug-do-site> <centro_x> <topo_y> <largura>
     (posição e largura em pixels da imagem original: onde fica o espaço livre do rótulo)
Grava molhos/<id>.png (com logo) e sites/supermisto/img/produtos/<slug>.webp (sem fundo).
"""
import sys
from pathlib import Path
from PIL import Image, ImageFilter
import fotos_site as F

AQUI = Path(__file__).parent


def main(img, pid, slug, cx, y, larg):
    im = Image.open(img).convert('RGBA')
    (AQUI / 'molhos').mkdir(exist_ok=True)
    im.convert('RGB').save(AQUI / 'molhos' / f'{pid}-original.png')
    logo = Image.open(AQUI / 'logo-bordo' / 'logo-supermisto.png').convert('RGBA')
    logo = logo.resize((larg, round(logo.height * larg / logo.width)), Image.LANCZOS)
    x = cx - larg // 2
    sombra = Image.new('RGBA', im.size, (0, 0, 0, 0))
    s = Image.new('RGBA', logo.size, (0, 0, 0, 0)); s.putalpha(logo.split()[-1].point(lambda v: v * 110 // 255))
    sombra.paste(s, (x + 3, y + 7), s)
    im = Image.alpha_composite(im, sombra.filter(ImageFilter.GaussianBlur(6)))
    im.alpha_composite(logo, (x, y))
    final = AQUI / 'molhos' / f'{pid}.png'
    im.convert('RGB').save(final)
    F.quadrado(F.recortar(final)).save(F.DESTINO / f'{slug}.webp', 'WEBP', quality=82, method=4)
    print('ok', final)


if __name__ == '__main__':
    a = sys.argv[1:]
    main(a[0], a[1], a[2], int(a[3]), int(a[4]), int(a[5]))
