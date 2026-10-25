"""Põe um saquinho novo (feito em outra IA, já com a logo) no tamanho padrão dos nossos.

A solapa e o pacote são medidos e encaixados nas mesmas medidas e posições do saquinho modelo
(saquinhos/cominho.png). Depois grava os pesos com o selo trocado e as fotos do site.

Uso: python3 padroniza.py <foto> <id>     ex.: python3 padroniza.py ~/paprica.jpg paprica-picante
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from poe_logo import troca_peso

AQUI = Path(__file__).parent
MODELO = AQUI / 'saquinhos' / 'cominho.png'


def partes(im):
    """Caixas (x0, y0, x1, y1) da solapa e do pacote."""
    a = np.asarray(im.convert('RGB'))
    cheio = a.min(2) < 225
    h = cheio.shape[0]
    lin = [np.where(r)[0] for r in cheio]
    larg = np.array([(c.max() - c.min()) if len(c) > 20 else 0 for c in lin])
    sol = np.median(larg[int(h * .15):int(h * .35)])
    ys = np.where(larg >= sol * 0.965)[0]
    s0 = ys.min()
    s1 = s0
    while s1 + 1 < h and larg[s1 + 1] >= sol * 0.965:
        s1 += 1
    xs = np.where(cheio[s0:s1 + 1].mean(0) > 0.5)[0]
    solapa = (xs.min(), s0, xs.max() + 1, s1 + 1)
    baixo = cheio[s1 + 1:]
    yb = np.where(baixo.mean(1) > 0.02)[0]
    xb = np.where(baixo[yb.min():yb.max() + 1].mean(0) > 0.02)[0]
    pacote = (xb.min(), s1 + 1, xb.max() + 1, s1 + 1 + yb.max() + 1)
    return solapa, pacote


def padronizar(foto):
    mod = Image.open(MODELO).convert('RGB')
    ms, mp = partes(mod)
    im = Image.open(foto).convert('RGB')
    s, p = partes(im)
    tela = Image.new('RGB', mod.size, (255, 255, 255))
    # pacote primeiro (a solapa fica por cima da solda de cima)
    tela.paste(im.crop(p).resize((mp[2] - mp[0], mp[3] - mp[1]), Image.LANCZOS), mp[:2])
    tela.paste(im.crop(s).resize((ms[2] - ms[0], ms[3] - ms[1]), Image.LANCZOS), ms[:2])
    return tela


def tem_logo(im):
    """Procura o bordô da logo no alto do painel verde (à direita do furo)."""
    a = np.asarray(im.convert('RGB')).astype(int)
    z = a[45:210, 640:1090]  # acima da faixa do nome
    r, g, b = z[..., 0], z[..., 1], z[..., 2]
    return ((r > 55) & (r < 150) & (g < 50) & (b < 60) & (r > g * 2)).mean() > 0.08


def main(foto, pid):
    im = padronizar(foto)
    if tem_logo(im):
        pasta = AQUI / 'saquinhos'
        im.save(pasta / f'{pid}.png')
        for g in (30, 50, 100):
            troca_peso(im.convert('RGBA'), f'{g} g').convert('RGB').save(pasta / f'{pid}-{g}g.png')
    else:  # sem logo: entra como os outros, pelo poe_logo (logo no verde + verde-garrafa)
        import poe_logo
        im.save(AQUI / 'prontos-chatgpt' / f'{pid}.png')
        poe_logo.main(pid, ('10 g', '30 g', '50 g', '100 g'))
    print('ok', pid, 'logo já vinha' if tem_logo(im) else 'logo colocada')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
