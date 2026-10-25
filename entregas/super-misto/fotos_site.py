"""Fotos dos produtos para o site (sites/supermisto/img/produtos), a partir de saquinhos/.

Tira o fundo sem furar o plástico: o fundo é medido nas bordas da imagem (pode ser branco ou um degradê cinza)
e cada pixel parecido com ele vira transparente na medida da diferença ("cor para transparência").
Assim a solda transparente do saquinho fica translúcida, sem riscos nem falhas.

Uso: python3 fotos_site.py            (todos)
     python3 fotos_site.py cominho    (só um)
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

AQUI = Path(__file__).parent
ORIGEM = AQUI / 'saquinhos'
DESTINO = AQUI.parent.parent / 'sites' / 'supermisto' / 'img' / 'produtos'
IDS = ['colorau', 'tempero-completo', 'pimenta-do-reino', 'cominho', 'chimichurri', 'oregano', 'paprica-doce',
       'paprica-defumada', 'curcuma', 'alho-em-po', 'cebola-em-po', 'lemon-pepper', 'pimenta-calabresa', 'canela',
       'tempero-baiano']
SLUG = {'pimenta-do-reino': 'pimenta-do-reino-moida', 'cominho': 'cominho-moido',
        'curcuma': 'acafrao-da-terra-curcuma', 'canela': 'canela-em-po'}
PESOS = {'': '', '-50g': '-50g', '-100g': '-100g', '-1kg': '-1kg'}
LADO, MARGEM = 1100, 12


def fundo_modelo(img, mascara):
    """Fundo liso (plano de 2º grau por canal) ajustado só na faixa da borda que é fundo."""
    h, w = mascara.shape
    faixa = np.zeros_like(mascara)
    b = max(8, min(h, w) // 40)
    faixa[:b, :] = faixa[-b:, :] = faixa[:, :b] = faixa[:, -b:] = 1
    ys, xs = np.nonzero(faixa & mascara)
    x, y = xs / w, ys / h
    A = np.stack([np.ones_like(x), x, y, x * x, y * y, x * y], 1)
    gy, gx = np.mgrid[0:h, 0:w]
    gx, gy = gx / w, gy / h
    G = np.stack([np.ones_like(gx), gx, gy, gx * gx, gy * gy, gx * gy], -1)
    return np.clip(np.stack([G @ np.linalg.lstsq(A, img[ys, xs, c], rcond=None)[0] for c in range(3)], -1), 1, 254)


def mascara_fundo(img8):
    """Fundo = região sem cor ligada à borda (preenchimento com tolerância, aceita degradê)."""
    h, w = img8.shape[:2]
    m = np.zeros((h + 2, w + 2), np.uint8)
    hsv = cv2.cvtColor(img8, cv2.COLOR_RGB2HSV)
    pontos = [(x, y) for x in range(0, w, 15) for y in (0, h - 1)] + [(x, y) for y in range(0, h, 15) for x in (0, w - 1)]
    for x, y in pontos:
        if m[y + 1, x + 1] == 0 and hsv[y, x, 1] < 30 and hsv[y, x, 2] > 110:
            cv2.floodFill(img8, m, (x, y), 0, (4, 4, 4), (4, 4, 4), 4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8))
    return m[1:-1, 1:-1] > 0


def silhueta(fundo):
    """Contorno cheio do pacote: fecha as falhas da solda transparente e preenche os buracos."""
    obj = cv2.morphologyEx((~fundo).astype(np.uint8), cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    n, rot, st, _ = cv2.connectedComponentsWithStats(obj)
    obj = (rot == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8)  # só o pacote, sem sujeira solta
    # fecha as mordidas: pequenas em qualquer direção e as largas da solda de cima/baixo (linha horizontal)
    obj = np.pad(obj, 130)
    obj = cv2.morphologyEx(obj, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41))) | \
        cv2.morphologyEx(obj, cv2.MORPH_CLOSE, np.ones((1, 251), np.uint8))
    h, w = obj.shape
    fora = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(obj, fora, (0, 0), 1, 0, 0, 4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8))
    cheio = (fora[1:-1, 1:-1] == 0).astype(np.float32)[130:-130, 130:-130]
    return cv2.GaussianBlur(cheio, (0, 0), 3) > 0.5  # contorno liso, sem dentes


def recortar(caminho):
    img8 = np.array(Image.open(caminho).convert('RGB'))
    img = img8.astype(np.float64)
    fundo = mascara_fundo(img8.copy())
    B = fundo_modelo(img, fundo)
    piso = 0.35  # plástico leitoso onde a solda tem a cor do fundo
    if B.mean() > 245:
        piso = 0
        B = np.broadcast_to(np.median(img[fundo], 0), img.shape)  # branco é liso: a curva erra nos cantos
        # fundo branco liso: só é fundo o que é quase igual a ele (a solda clarinha fica no pacote)
        perto = (np.abs(img - B).max(-1) < 7).astype(np.uint8)
        n, rot = cv2.connectedComponents(perto, connectivity=4)
        borda = np.unique(np.concatenate([rot[0], rot[-1], rot[:, 0], rot[:, -1]]))
        fundo = np.isin(rot, borda[borda > 0])
    # onde a cor vira transparência: tudo que é clarinho e encosta no fundo (solda, sombra, névoa),
    # nunca o branco da etiqueta (fica cercado pela arte)
    claro = (np.abs(img - B).max(-1) < 40).astype(np.uint8)
    n, rot = cv2.connectedComponents(claro, connectivity=4)
    lig = np.unique(rot[fundo & (claro > 0)])
    regiao = np.isin(rot, lig[lig > 0]) | fundo
    regiao = cv2.dilate(regiao.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    # cor para transparência em relação ao fundo B
    d = np.where(img < B, (B - img) / B, (img - B) / (255 - B))
    a = np.clip(d.max(-1) * 1.15, 0, 1)
    a[a < 0.10] = 0
    dentro = silhueta(fundo)
    a = np.where(dentro, np.maximum(a, piso), 0)  # fora do contorno é só fundo; dentro, o plástico fica leitoso
    a = np.where(regiao, a, 1.0)
    a = cv2.GaussianBlur(a, (0, 0), 0.6) * regiao + (~regiao)
    cor = np.where(a[..., None] > 0, B + (img - B) / np.maximum(a[..., None], 1e-3), 0)
    rgb = Image.fromarray(np.clip(cor, 0, 255).astype(np.uint8))
    rgb = ImageEnhance.Color(rgb).enhance(1.10)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.06)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=3))
    out = rgb.convert('RGBA')
    out.putalpha(Image.fromarray((a * 255).round().astype(np.uint8)))
    caixa = Image.fromarray(((a > 0.12) * 255).astype(np.uint8)).getbbox()
    return out.crop(caixa)


def quadrado(im):
    lado = LADO - 2 * MARGEM
    # garrafa (alta e fina): folga maior em cima e embaixo para a tampa não encostar na borda
    alto = lado - 2 * round(LADO * 0.05) if im.height > im.width * 1.6 else lado
    k = min(lado / im.width, alto / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    tela = Image.new('RGBA', (LADO, LADO), (0, 0, 0, 0))
    tela.alpha_composite(im, ((LADO - im.width) // 2, (LADO - im.height) // 2))
    return tela


def main(ids):
    for pid in ids:
        slug = SLUG.get(pid, pid)
        for suf_origem, suf_site in PESOS.items():
            im = recortar(ORIGEM / f'{pid}{suf_origem}.png')
            quadrado(im).save(DESTINO / f'{slug}{suf_site}.webp', 'WEBP', quality=82, method=4)
            if not suf_origem:
                k = 700 / im.height
                im.resize((round(im.width * k), 700), Image.LANCZOS).save(DESTINO / f'{slug}-recorte.png', optimize=True)
        print('ok', pid)


if __name__ == '__main__':
    main(sys.argv[1:] or IDS)
