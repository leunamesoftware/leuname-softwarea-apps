"""Foto de uma linha do site (cartão 4:3), sem cortar o assunto.
Uso: python3 linha_foto.py <imagem> <id da linha> [altura do centro 0-1, padrão 0.5]
Ids: puros misturas churrasco ervas sais molhos conservas doces amidos.
Salva sites/supermisto/img/linhas/<id>.webp (800×600) e liga a foto no site.js."""
import re
import sys
from pathlib import Path
from PIL import Image

SITE = Path(__file__).resolve().parents[2] / 'sites' / 'supermisto'


def main(arq, linha, centro=0.5):
    im = Image.open(arq).convert('RGB')
    w, h = im.size
    if w * 3 > h * 4:  # mais larga que 4:3: corta os lados (centro)
        cw = round(h * 4 / 3)
        im = im.crop(((w - cw) // 2, 0, (w - cw) // 2 + cw, h))
    else:  # mais alta: corta em cima/embaixo em volta do centro pedido
        ch = round(w * 3 / 4)
        t = min(max(0, round(h * centro - ch / 2)), h - ch)
        im = im.crop((0, t, w, t + ch))
    im.resize((800, 600), Image.LANCZOS).save(SITE / 'img' / 'linhas' / f'{linha}.webp', 'WEBP', quality=82)
    js = SITE / 'site.js'
    s = js.read_text()
    m = re.search(r"const FOTOS_LINHA = \[([^\]]*)\];", s)
    ids = re.findall(r"'([^']+)'", m.group(1))
    if linha not in ids:
        ids.append(linha)
        s = s.replace(m.group(0), "const FOTOS_LINHA = [" + ', '.join(f"'{i}'" for i in ids) + "];")
        js.write_text(s)
    print('ok', linha)


if __name__ == '__main__':
    a = sys.argv[1:]
    main(a[0], a[1], float(a[2]) if len(a) > 2 else 0.5)
