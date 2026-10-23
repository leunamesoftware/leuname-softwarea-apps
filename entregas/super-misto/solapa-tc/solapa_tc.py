#!/usr/bin/env python3
"""Solapa Supermisto · Tempero Completo 10 g: frente laranja + verso verde, em arquivo de gráfica.

Uso: python3 solapa_tc.py   (gera solapa-tempero-completo-10g.pdf, frente.png e verso.png nesta pasta)
Os textos e a logo são vetor/alta resolução; legumes, tigela e o quadro "Ideal para" vêm da arte do dono
(recortados com borda suave). Solapa aberta: 10 x 10 cm (cada face 10 x 5 cm), dobra no meio.
"""
from pathlib import Path
from PIL import Image, ImageFilter
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

AQUI = Path(__file__).resolve().parent
U = Path('/root/.claude/uploads/74db9da6-e563-50a7-907d-a01ed1749e23')
FRENTE_IA, VERSO_IA = U / '1778b519-image.png', U / 'f9e4eb2c-image.png'
LOGO = AQUI.parents[2] / 'sites' / 'supermisto' / 'img' / 'logo-supermisto.png'
FONTES = AQUI.parents[2] / 'calculadora' / 'scripts' / 'fontes'
for p in ('SemiBold', 'Bold', 'ExtraBold'):
    pdfmetrics.registerFont(TTFont(f'P-{p}', str(FONTES / f'Poppins-{p}.ttf')))

W, H = 100 * mm, 50 * mm
PX = W / 1774  # 1 pixel da arte = 0,0564 mm
VERDE, VERDE_ESC, LARANJA, AMARELO, CREME = HexColor('#017130'), HexColor('#014F1A'), HexColor('#F26A00'), HexColor('#FFC21A'), HexColor('#FFF4E4')

PRODUTO = {
    'nome1': 'Tempero', 'nome2': 'Completo', 'peso': '10 g',
    'ing': 'Alho, cebola, pimentão, cenoura, salsa, cebolinha e orégano desidratados.',
    'cons': 'Manter em local seco, fresco e ao abrigo da luz. Após aberto, conservar bem fechado.',
    'gluten': 'NÃO CONTÉM GLÚTEN.',
}
EMPRESA = ['Produzido e embalado por: SUPER MISTO TEMPEROS LTDA', 'CNPJ 13.580.397/0001-80 · Estrada de Xerém, 484',
           'Xerém · Duque de Caxias (RJ) · CEP 25241-390', 'SAC: (24) 99872-1557 · INDÚSTRIA BRASILEIRA']


def tapa(im, cx, cy, r):
    """Cobre um círculo com a cor média do anel em volta (some com o ® sem deixar mancha)."""
    import math
    px = im.load(); anel = []
    for a in range(0, 360, 10):
        x, y = int(cx + (r + 4) * math.cos(math.radians(a))), int(cy + (r + 4) * math.sin(math.radians(a)))
        anel.append(px[x, y])
    anel.sort(key=sum); cor = anel[len(anel) // 2]
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                px[x, y] = cor


def limpa_artes():
    """Tira da arte o ®, o selo de peso, a tabela inventada, o código de barras e os dados de exemplo."""
    from PIL import ImageDraw
    f = Image.open(FRENTE_IA).convert('RGB'); d = ImageDraw.Draw(f)
    tapa(f, 1365, 260, 19)                                                    # ®
    f = f.crop((12, 2, 1762, 856)); f.save(AQUI / '.frente-arte.png')
    v = Image.open(VERSO_IA).convert('RGB'); d = ImageDraw.Draw(v)
    verde = v.getpixel((1200, 800))
    tapa(v, 662, 88, 18)                                                      # ®
    d.rectangle((900, 745, 1440, 862), fill=verde)                            # dados de exemplo
    d.rectangle((1258, 22, 1748, 866), fill=verde)                            # tabela + código de barras
    v = v.crop((22, 8, 1752, 866)); v = v.filter(ImageFilter.GaussianBlur(0)); v.save(AQUI / '.verso-arte.png')
    return AQUI / '.frente-arte.png', AQUI / '.verso-arte.png'


def degrade(c, x, y, w, h, topo, base, n=60):
    for i in range(n):
        k = i / (n - 1)
        cor = Color(*(topo[j] + (base[j] - topo[j]) * k for j in range(3)))
        c.setFillColor(cor); c.rect(x, y + h - (i + 1) * h / n, w, h / n + 0.3, stroke=0, fill=1)


def texto_inclinado(c, txt, x, y, fonte, tam, cor, inclina=0.18, sombra=True):
    c.saveState(); c.translate(x, y); c.transform(1, 0, inclina, 1, 0, 0)
    if sombra:
        c.setFillColor(Color(0.55, 0.2, 0, alpha=0.35)); c.setFont(fonte, tam); c.drawCentredString(0.35, -0.35, txt)
    c.setFillColor(cor); c.setFont(fonte, tam); c.drawCentredString(0, 0, txt); c.restoreState()


def sublinhado(c, x1, x2, y, cor=AMARELO, esp=0.9 * mm):
    p = c.beginPath(); p.moveTo(x1, y); p.curveTo(x1 + (x2 - x1) * 0.3, y + 1.2 * mm, x1 + (x2 - x1) * 0.7, y + 0.6 * mm, x2, y + 1.8 * mm)
    c.setStrokeColor(cor); c.setLineWidth(esp); c.setLineCap(1); c.drawPath(p, stroke=1, fill=0)


def furo(c, x, y):
    """Guia do furo de pendurar (a gráfica faz o corte)."""
    c.setStrokeColor(Color(1, 1, 1, alpha=0.9)); c.setLineWidth(0.4); c.setDash(1.2, 1.2)
    c.roundRect(x + W / 2 - 9 * mm, y + H - 7.5 * mm, 18 * mm, 4.2 * mm, 2.1 * mm, stroke=1, fill=0); c.setDash()


def frente(c, x, y):
    c.drawImage(ImageReader(str(ARTE_F)), x, y, W, H)
    # selo do peso (cobre o selo da arte)
    bx, by, bw, bh = x + 84.6 * mm, y + 3.3 * mm, 13.6 * mm, 7.4 * mm
    c.setFillColor(white); c.roundRect(bx - 0.6 * mm, by - 0.6 * mm, bw + 1.2 * mm, bh + 1.2 * mm, 3.6 * mm, stroke=0, fill=1)
    c.setFillColor(VERDE); c.roundRect(bx, by, bw, bh, 3 * mm, stroke=0, fill=1)
    c.setFillColor(white); c.setFont('P-Bold', 4.2); c.drawCentredString(bx + bw / 2, by + bh - 2.3 * mm, 'PESO LÍQ.')
    c.setFont('P-ExtraBold', 10); c.drawCentredString(bx + bw / 2, by + 1.3 * mm, PRODUTO['peso'])



def caixa(c, x, y, w, titulo, texto, fs=4.9):
    from reportlab.platypus import Paragraph
    from reportlab.lib.styles import ParagraphStyle
    par = Paragraph(texto, ParagraphStyle('b', fontName='P-SemiBold', fontSize=fs, leading=fs * 1.25, textColor=HexColor('#1B2A20')))
    _, h = par.wrap(w - 3 * mm, 40 * mm)
    alto = h + 6.2 * mm
    c.setFillColor(CREME); c.roundRect(x, y - alto, w, alto, 1.6 * mm, stroke=0, fill=1)
    c.setFillColor(LARANJA); c.roundRect(x, y - 4 * mm, w, 4 * mm, 1.6 * mm, stroke=0, fill=1); c.rect(x, y - 4 * mm, w, 1.6 * mm, stroke=0, fill=1)
    c.setFillColor(white); c.setFont('P-ExtraBold', 6); c.drawString(x + 1.5 * mm, y - 2.9 * mm, titulo)
    par.drawOn(c, x + 1.5 * mm, y - 4.9 * mm - h)
    return y - alto


def verso(c, x, y):
    c.drawImage(ImageReader(str(ARTE_V)), x, y, W, H)
    # coluna direita: ingredientes, conservação, lote/validade e dados da empresa
    cx, cw = x + 72 * mm, 26 * mm
    yy = caixa(c, cx, y + H - 2.2 * mm, cw, 'INGREDIENTES:', PRODUTO['ing'] + f"<br/><font name='P-ExtraBold'>{PRODUTO['gluten']}</font>")
    yy = caixa(c, cx, yy - 1.2 * mm, cw, 'CONSERVAÇÃO:', PRODUTO['cons'])
    c.setStrokeColor(CREME); c.setLineWidth(0.4)
    meia = (cw - 1 * mm) / 2
    for i, rot in enumerate(['LOTE:', 'VAL.:']):
        bx = cx + i * (meia + 1 * mm)
        c.roundRect(bx, y + 8.4 * mm, meia, 3.4 * mm, 1 * mm, stroke=1, fill=0)
        c.setFillColor(white); c.setFont('P-Bold', 4.6); c.drawString(bx + 1 * mm, y + 9.5 * mm, rot)
    c.setFillColor(white); c.setFont('P-SemiBold', 3.55)
    for i, l in enumerate(EMPRESA):
        c.drawRightString(x + W - 2.2 * mm, y + 6.0 * mm - i * 1.45 * mm, l)



def solapa(c, x, y):
    frente(c, x, y)
    c.saveState(); c.translate(x + W, y + 2 * H); c.rotate(180); verso(c, 0, 0); c.restoreState()
    c.setStrokeColor(HexColor('#BBBBBB')); c.setLineWidth(0.3); c.setDash(2, 2); c.line(x, y + H, x + W, y + H); c.setDash()


def marcas(c, x, y, w, h):
    c.setStrokeColor(HexColor('#000000')); c.setLineWidth(0.3)
    for (px, py, dx, dy) in [(x, y, -1, -1), (x + w, y, 1, -1), (x, y + h, -1, 1), (x + w, y + h, 1, 1)]:
        c.line(px + dx * mm, py, px + dx * 5 * mm, py); c.line(px, py + dy * mm, px, py + dy * 5 * mm)


ARTE_F, ARTE_V = limpa_artes()

if __name__ == '__main__':
    pdf = AQUI / 'solapa-tempero-completo-10g.pdf'
    c = canvas.Canvas(str(pdf), pagesize=A4); c.setTitle('Solapa Supermisto Tempero Completo 10 g')
    mx, my = (A4[0] - 2 * W - 6 * mm) / 2, (A4[1] - 4 * H - 6 * mm) / 2
    for col in range(2):
        for lin in range(2):
            x, y = mx + col * (W + 6 * mm), my + lin * (2 * H + 6 * mm)
            solapa(c, x, y); marcas(c, x, y, W, 2 * H)
    c.setFont('P-SemiBold', 7); c.setFillColor(HexColor('#777777'))
    c.drawCentredString(A4[0] / 2, 8 * mm, 'Imprimir em 100% (tamanho real). Cortar nas marcas, dobrar no tracejado, furar na forma branca de cima e grampear sobre o saquinho.')
    c.showPage(); c.save()
    for nome, fn in (('frente', frente), ('verso', verso)):
        c = canvas.Canvas(str(AQUI / f'.{nome}.pdf'), pagesize=(W, H)); fn(c, 0, 0); c.showPage(); c.save()
    print('ok', pdf)
