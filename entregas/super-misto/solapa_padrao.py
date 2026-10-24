#!/usr/bin/env python3
"""Solapas Supermisto no padrão único: arte do dono (frente e verso) + textos legais certos, prontas para a gráfica.

Uso: python3 solapa_padrao.py [id ...]     (sem id: gera todos)
Saída em solapas-prontas/<id>/: <id>-grafica.pdf (A4, 4 solapas, marcas de corte), frente.png, verso.png.

Padrão: cada face 10 x 5 cm (solapa aberta 10 x 10 cm). A arte é recortada da borda branca e encaixada
nesse tamanho. No verso, a coluna da direita é sempre redesenhada por nós (ingredientes, conservação,
lote/validade e dados da empresa), para os textos saírem certos mesmo que a arte venha com erro.
Para um produto novo: salve artes/<id>-frente.png e artes/<id>-verso.png e acrescente um item em PRODUTOS.
"""
import math, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

AQUI = Path(__file__).resolve().parent
ARTES, SAIDA = AQUI / 'artes', AQUI / 'solapas-prontas'
FONTES = AQUI.parents[1] / 'calculadora' / 'scripts' / 'fontes'
for p in ('SemiBold', 'Bold', 'ExtraBold'):
    pdfmetrics.registerFont(TTFont(f'P-{p}', str(FONTES / f'Poppins-{p}.ttf')))
W, H = 100 * mm, 50 * mm
LARANJA, CREME = HexColor('#F26A00'), HexColor('#FFF4E4')
EMPRESA = ['Produzido e embalado por: SUPER MISTO TEMPEROS LTDA', 'CNPJ 13.580.397/0001-80 · Estrada de Xerém, 484',
           'Xerém · Duque de Caxias (RJ) · CEP 25241-390', 'SAC: (24) 99872-1557 · INDÚSTRIA BRASILEIRA']
CONSERVACAO = 'Manter em local seco, fresco e ao abrigo da luz. Após aberto, manter bem fechado.'

# tapar: círculos (x, y, raio) em pixels da arte original, para sumir com o ®.
# coluna: retângulo (x1, y1, x2, y2) da arte do verso onde ficam os textos legais (é coberto e redesenhado).
PRODUTOS = {
    # 'pronta': frente e verso montados por monta_arte.py (já com logo e todos os textos certos)
    'pimenta-do-reino': {'pronta': True},
    'tempero-completo': {'pronta': True},
    'colorau': {'pronta': True},
    'cominho': {'pronta': True},
    'chimichurri': {'pronta': True},
    'oregano': {'pronta': True},
    'paprica-doce': {'pronta': True},
    'paprica-defumada': {'pronta': True},
    'curcuma': {'pronta': True},
}


def mediana_anel(px, cx, cy, r):
    anel = []
    for a in range(0, 360, 10):
        anel.append(px[int(cx + r * math.cos(math.radians(a))), int(cy + r * math.sin(math.radians(a)))])
    anel.sort(key=sum)
    return anel[len(anel) // 2]


def tapa(im, cx, cy, r):
    px = im.load(); cor = mediana_anel(px, cx, cy, r + 5)
    ImageDraw.Draw(im).ellipse((cx - r, cy - r, cx + r, cy + r), fill=cor)


def encaixa(im, estender=False):
    """Corta a borda branca e ajusta para 2:1 (10 x 5 cm), sem distorcer.
    estender=True: arte larga demais ganha altura (cópia borrada das bordas de cima e de baixo) em vez de perder a direita."""
    caixa = ImageOps.invert(im.convert('L')).point(lambda v: 255 if v > 25 else 0).getbbox()
    im = im.crop(caixa); w, h = im.size
    if estender and w / h > 2:
        m = 22  # tira a quina arredondada branca da arte antes de esticar
        im = im.crop((m, m, w - m, h - m)); w, h = im.size
        falta = w // 2 - h; cima = falta // 2; baixo = falta - cima
        nova = Image.new('RGB', (w, w // 2))
        def tira(box, alto):
            t = im.crop(box); px = t.load(); cores = sorted((px[x, y] for x in range(0, t.width, 7) for y in range(t.height)), key=sum)
            med = cores[len(cores) // 2]
            for y in range(t.height):  # sem branco (furo de pendurar, quinas) na faixa esticada
                for x in range(t.width):
                    if sum(px[x, y]) > 600: px[x, y] = med
            return t.resize((w, alto)).filter(ImageFilter.GaussianBlur(10))
        tira_c = tira((0, 0, w, 10), cima); tira_b = tira((0, h - 10, w, h), baixo)
        nova.paste(tira_c, (0, 0)); nova.paste(im, (0, cima)); nova.paste(tira_b, (0, cima + h))
        k = 2000 / w
        mapa = lambda x, y, lw: (round((x - caixa[0] - m) * k), round((y - caixa[1] - m + cima) * k), round(lw * k))
        return nova.resize((2000, 1000), Image.LANCZOS), mapa
    # sobra de largura sai pela direita (onde a coluna de textos é redesenhada), para não cortar a arte da esquerda
    if w / h > 2: im = im.crop((0, 0, 2 * h, h)); dy = 0; k = 2000 / (2 * h)
    else: dy = (h - w // 2) // 2; im = im.crop((0, dy, w, dy + w // 2)); k = 2000 / w
    mapa = lambda x, y, lw: (round((x - caixa[0]) * k), round((y - caixa[1] - dy) * k), round(lw * k))
    return im.resize((2000, 1000), Image.LANCZOS), mapa


LOGO = AQUI / 'logo-nova' / 'logo-supermisto.png'


def troca_logo(im, caixa):
    """Cola a logo oficial (vetorizada) por cima da logo que veio na arte; caixa = (x, y, largura) em pixels da arte."""
    x, y, w = caixa
    logo = Image.open(LOGO).convert('RGBA'); logo = logo.resize((w, round(w * logo.height / logo.width)), Image.LANCZOS)
    im.paste(logo, (x, y), logo)


def prepara(pid, cfg):
    pasta = SAIDA / pid; pasta.mkdir(parents=True, exist_ok=True)
    f = Image.open(ARTES / f'{pid}-frente.png').convert('RGB')
    for t in cfg.get('tapar_frente', []): tapa(f, *t)
    v = Image.open(ARTES / f'{pid}-verso.png').convert('RGB')
    if cfg.get('pronta'):
        f, v = f.resize((2000, 1000), Image.LANCZOS), v.resize((2000, 1000), Image.LANCZOS)
        f.save(pasta / '.frente-arte.png'); v.save(pasta / '.verso-arte.png')
        return pasta, None
    for t in cfg['tapar_verso']: tapa(v, *t)
    d = ImageDraw.Draw(v); x1, y1, x2, y2 = cfg['coluna']
    fundo = mediana_anel(v.load(), (x1 + x2) // 2, (y1 + y2) // 2, 1)
    fundo = v.getpixel((x1 - 6, (y1 + y2) // 2))
    for r in [cfg['coluna']] + cfg['limpar']: d.rectangle(r, fill=fundo)
    f, mf = encaixa(f, cfg.get('estender', False)); v, mv = encaixa(v, cfg.get('estender', False))
    if cfg.get('logo_frente'): troca_logo(f, mf(*cfg['logo_frente']))
    if cfg.get('logo_verso'): troca_logo(v, mv(*cfg['logo_verso']))
    cv = None
    f.save(pasta / '.frente-arte.png'); v.save(pasta / '.verso-arte.png')
    return pasta, cv


def caixa_texto(c, x, y, w, titulo, texto, fs=4.25, cor=None):
    par = Paragraph(texto, ParagraphStyle('b', fontName='P-SemiBold', fontSize=fs, leading=fs * 1.25, textColor=HexColor('#1B2A20')))
    _, h = par.wrap(w - 3 * mm, 40 * mm); alto = h + 6 * mm
    c.setFillColor(CREME); c.roundRect(x, y - alto, w, alto, 1.6 * mm, stroke=0, fill=1)
    c.setFillColor(cor or LARANJA); c.roundRect(x, y - 4 * mm, w, 4 * mm, 1.6 * mm, stroke=0, fill=1); c.rect(x, y - 4 * mm, w, 1.6 * mm, stroke=0, fill=1)
    c.setFillColor(white); c.setFont('P-ExtraBold', 5.4); c.drawString(x + 1.5 * mm, y - 2.8 * mm, titulo)
    par.drawOn(c, x + 1.5 * mm, y - 4.8 * mm - h)
    return y - alto


def frente(c, x, y, pasta):
    c.drawImage(ImageReader(str(pasta / '.frente-arte.png')), x, y, W, H)


def verso(c, x, y, pasta, cfg):
    c.drawImage(ImageReader(str(pasta / '.verso-arte.png')), x, y, W, H)
    if cfg.get('pronta'):
        return
    ox, ow = cfg.get('col_mm', (73.4, 25))
    cx, cw = x + ox * mm, ow * mm
    cor = HexColor(cfg['cor_titulo']) if cfg.get('cor_titulo') else None
    yy = caixa_texto(c, cx, y + H - 2.2 * mm, cw, 'INGREDIENTES:', cfg['ing'] + f"<br/><font name='P-ExtraBold'>{cfg['gluten']}</font>", cor=cor)
    caixa_texto(c, cx, yy - 1.2 * mm, cw, 'CONSERVAÇÃO:', CONSERVACAO, cor=cor)
    if cfg.get('so_coluna'):  # lote, validade e empresa já vêm certos na arte
        return
    c.setStrokeColor(CREME); c.setLineWidth(0.4); meia = (cw - 1 * mm) / 2
    for i, rot in enumerate(['LOTE:', 'VAL.:']):
        bx = cx + i * (meia + 1 * mm)
        c.roundRect(bx, y + 7.5 * mm, meia, 3.2 * mm, 1 * mm, stroke=1, fill=0)
        c.setFillColor(white); c.setFont('P-Bold', 4.6); c.drawString(bx + 1 * mm, y + 8.5 * mm, rot)
    c.setFillColor(white); c.setFont('P-SemiBold', 3.55)
    for i, l in enumerate(EMPRESA):
        c.drawRightString(x + W - 2.2 * mm, y + 5.4 * mm - i * 1.4 * mm, l)


def gerar(pid):
    cfg = PRODUTOS[pid]; pasta, _ = prepara(pid, cfg)
    pdf = pasta / f'{pid}-grafica.pdf'
    c = canvas.Canvas(str(pdf), pagesize=A4); c.setTitle(f'Solapa Supermisto {pid}')
    mx, my = (A4[0] - 2 * W - 6 * mm) / 2, (A4[1] - 4 * H - 6 * mm) / 2
    for col in range(2):
        for lin in range(2):
            x, y = mx + col * (W + 6 * mm), my + lin * (2 * H + 6 * mm)
            frente(c, x, y, pasta)
            c.saveState(); c.translate(x + W, y + 2 * H); c.rotate(180); verso(c, 0, 0, pasta, cfg); c.restoreState()
            c.setStrokeColor(HexColor('#BBBBBB')); c.setLineWidth(0.3); c.setDash(2, 2); c.line(x, y + H, x + W, y + H); c.setDash()
            c.setStrokeColor(HexColor('#000000'))
            for (px, py, dx, dy) in [(x, y, -1, -1), (x + W, y, 1, -1), (x, y + 2 * H, -1, 1), (x + W, y + 2 * H, 1, 1)]:
                c.line(px + dx * mm, py, px + dx * 5 * mm, py); c.line(px, py + dy * mm, px, py + dy * 5 * mm)
    c.setFont('P-SemiBold', 7); c.setFillColor(HexColor('#777777'))
    c.drawCentredString(A4[0] / 2, 8 * mm, 'Imprimir em 100% (tamanho real). Cortar nas marcas, dobrar no tracejado, furar na forma branca de cima e grampear sobre o saquinho.')
    c.showPage(); c.save()
    for nome, fn in (('frente', lambda cv: frente(cv, 0, 0, pasta)), ('verso', lambda cv: verso(cv, 0, 0, pasta, cfg))):
        tmp = pasta / f'.{nome}.pdf'; cv = canvas.Canvas(str(tmp), pagesize=(W, H)); fn(cv); cv.showPage(); cv.save()
        import pymupdf; pymupdf.open(str(tmp))[0].get_pixmap(dpi=300).save(str(pasta / f'{nome}.png'))
    print('ok', pdf)


if __name__ == '__main__':
    for pid in (sys.argv[1:] or PRODUTOS):
        gerar(pid)
