"""Prepara a foto de uma receita: versão leve (720 px) e miniatura do sumário (160 px), em WebP.

Uso: python3 scripts/foto_receita.py <foto-original> <id-da-receita>
Gera public/img/receitas/<id>.webp e public/img/receitas/mini/<id>.webp
"""
import sys
from pathlib import Path
from PIL import Image

PASTA = Path(__file__).resolve().parent.parent / 'public' / 'img' / 'receitas'


def preparar(origem, rid):
    im = Image.open(origem).convert('RGB')
    (PASTA / 'mini').mkdir(parents=True, exist_ok=True)
    grande = im.resize((720, round(im.height * 720 / im.width)), Image.LANCZOS)
    grande.save(PASTA / f'{rid}.webp', quality=74, method=6)
    lado = min(im.size)
    quadrado = im.crop(((im.width - lado) // 2, (im.height - lado) // 2, (im.width + lado) // 2, (im.height + lado) // 2))
    quadrado.resize((160, 160), Image.LANCZOS).save(PASTA / 'mini' / f'{rid}.webp', quality=70, method=6)


if __name__ == '__main__':
    preparar(sys.argv[1], sys.argv[2])
