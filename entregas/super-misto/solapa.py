#!/usr/bin/env python3
"""Solapas (cartão dobrado que fecha o saquinho) da Super Misto: frente + verso, prontas para imprimir.

Uso: python3 solapa.py <pasta-saida>
Gera, para cada produto: um PDF A4 com 4 solapas (marcas de corte e de dobra) e um PNG de prévia.
Solapa aberta: 10 x 10 cm. Dobrada: 10 x 5 cm (frente embaixo, verso em cima de cabeça para baixo,
para os dois lados ficarem em pé depois de dobrar sobre o saquinho e grampear).
Os ingredientes são uma SUGESTÃO: confira com a sua receita real antes de imprimir.
"""
import sys
from pathlib import Path
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

FONTES = Path(__file__).resolve().parents[2] / 'calculadora' / 'scripts' / 'fontes'
for peso in ('SemiBold', 'Bold', 'ExtraBold'):
    pdfmetrics.registerFont(TTFont(f'P-{peso}', str(FONTES / f'Poppins-{peso}.ttf')))
VERDE, VERDE_ESC, TERRA, CREME, TERRA_CL = HexColor('#1E3A2B'), HexColor('#132A1E'), HexColor('#D2693C'), HexColor('#F7F1E6'), HexColor('#E9A56A')

EMPRESA = ['Fabricado e embalado por: SUPER MISTO TEMPEROS LTDA', 'CNPJ 13.580.397/0001-80 · Estrada de Xerém, 484',
           'Xerém · Duque de Caxias (RJ) · CEP 25241-390', 'SAC/WhatsApp: (24) 99872-1557 · INDÚSTRIA BRASILEIRA']

PRODUTOS = [
    {'id': 'tempero-completo', 'nome': 'TEMPERO', 'nome2': 'COMPLETO', 'sub': 'Alho, cebola e ervas', 'peso': '100 g', 'cor': '#C99A3B',
     'ing': 'Sal, alho desidratado, cebola desidratada, salsa desidratada e pimenta-do-reino.',
     'uso': 'Use 1 colher (chá) para cada 500 g de carne, arroz, feijão ou legumes. Prove antes de colocar mais sal.',
     'gluten': 'NÃO CONTÉM GLÚTEN'},
    {'id': 'colorau', 'nome': 'COLORAU', 'nome2': '', 'sub': 'Cor e sabor para a sua comida', 'peso': '100 g', 'cor': '#D8401E',
     'ing': 'Fubá de milho e urucum em pó.', 'uso': 'Use no refogado de arroz, feijão, frango, carnes e moquecas.', 'gluten': 'NÃO CONTÉM GLÚTEN'},
    {'id': 'pimenta-do-reino', 'nome': 'PIMENTA-DO-', 'nome2': 'REINO MOÍDA', 'sub': 'Moída na nossa fábrica', 'peso': '100 g', 'cor': '#3A3330',
     'ing': 'Pimenta-do-reino preta moída.', 'uso': 'Carnes, molhos, saladas e para finalizar pratos.', 'gluten': 'NÃO CONTÉM GLÚTEN'},
    {'id': 'cominho', 'nome': 'COMINHO', 'nome2': 'MOÍDO', 'sub': 'Sabor marcante', 'peso': '100 g', 'cor': '#A9762E',
     'ing': 'Cominho moído.', 'uso': 'Feijão, carne moída, quibe, ensopados e carnes.', 'gluten': 'NÃO CONTÉM GLÚTEN'},
    {'id': 'chimichurri', 'nome': 'CHIMICHURRI', 'nome2': '', 'sub': 'Para carnes na brasa', 'peso': '100 g', 'cor': '#6E8B3D',
     'ing': 'Salsa, orégano, alho desidratado, cebola desidratada, pimenta calabresa e sal.',
     'uso': 'Hidrate 2 colheres (sopa) em 6 colheres (sopa) de azeite por 15 min e sirva sobre a carne.', 'gluten': 'NÃO CONTÉM GLÚTEN'},
]

W, H = 100 * mm, 50 * mm  # cada face


def folha(c, x, y):
    """Logo provisória: folha creme num círculo terracota."""
    c.setFillColor(TERRA); c.circle(x, y, 5.2 * mm, stroke=0, fill=1)
    p = c.beginPath(); p.moveTo(x, y - 3.4 * mm)
    p.curveTo(x + 2.8 * mm, y - 1.6 * mm, x + 2.8 * mm, y + 1.8 * mm, x, y + 3.6 * mm)
    p.curveTo(x - 2.8 * mm, y + 1.8 * mm, x - 2.8 * mm, y - 1.6 * mm, x, y - 3.4 * mm)
    c.setFillColor(CREME); c.drawPath(p, stroke=0, fill=1)
    c.setStrokeColor(TERRA); c.setLineWidth(0.6); c.line(x, y - 2.8 * mm, x, y + 2.6 * mm)


def frente(c, x, y, p):
    c.setFillColor(VERDE); c.rect(x, y, W, H, stroke=0, fill=1)
    # faixa terracota no rodapé
    c.setFillColor(TERRA); c.rect(x, y, W, 9 * mm, stroke=0, fill=1)
    # marca
    folha(c, x + 9 * mm, y + H - 9 * mm)
    c.setFillColor(CREME); c.setFont('P-ExtraBold', 11); c.drawString(x + 16 * mm, y + H - 9.6 * mm, 'SUPER MISTO')
    c.setFillColor(TERRA_CL); c.setFont('P-SemiBold', 5.2); c.drawString(x + 16.2 * mm, y + H - 12.4 * mm, 'TEMPEROS · DESDE 2011')
    # amostra de cor do produto (círculo grande à direita)
    c.setFillColor(HexColor(p['cor'])); c.circle(x + W - 13 * mm, y + H - 15 * mm, 8.5 * mm, stroke=0, fill=1)
    c.setStrokeColor(CREME); c.setLineWidth(1.2); c.circle(x + W - 13 * mm, y + H - 15 * mm, 8.5 * mm, stroke=1, fill=0)
    # nome do produto
    c.setFillColor(CREME)
    tam = 17 if max(len(p['nome']), len(p['nome2'])) <= 11 else 14
    yy = y + 25 * mm if p['nome2'] else y + 20 * mm
    c.setFont('P-ExtraBold', tam); c.drawString(x + 6 * mm, yy, p['nome'])
    if p['nome2']:
        c.drawString(x + 6 * mm, yy - tam * 1.05, p['nome2'])
    c.setFillColor(TERRA_CL); c.setFont('P-SemiBold', 7); c.drawString(x + 6 * mm, y + 11.5 * mm, p['sub'])
    # rodapé: peso líquido (obrigatório na frente)
    c.setFillColor(CREME); c.setFont('P-Bold', 8); c.drawString(x + 6 * mm, y + 3.4 * mm, 'PESO LÍQUIDO ' + p['peso'])
    c.setFont('P-SemiBold', 6.2); c.drawRightString(x + W - 6 * mm, y + 3.5 * mm, p['gluten'])


def verso(c, x, y, p):
    c.setFillColor(CREME); c.rect(x, y, W, H, stroke=0, fill=1)
    c.setFillColor(VERDE); c.rect(x, y + H - 7 * mm, W, 7 * mm, stroke=0, fill=1)
    c.setFillColor(CREME); c.setFont('P-ExtraBold', 7.5)
    c.drawString(x + 5 * mm, y + H - 4.8 * mm, f"SUPER MISTO · {p['nome']} {p['nome2']}".strip())
    from reportlab.platypus import Paragraph
    from reportlab.lib.styles import ParagraphStyle
    est = ParagraphStyle('v', fontName='P-SemiBold', fontSize=5.6, leading=6.9, textColor=VERDE_ESC)
    texto = (f"<font name='P-Bold' color='#C4562A'>INGREDIENTES:</font> {p['ing']}<br/>"
             f"<font name='P-Bold' color='#C4562A'>MODO DE USAR:</font> {p['uso']}<br/>"
             f"<font name='P-Bold' color='#C4562A'>CONSERVAÇÃO:</font> Mantenha bem fechado, em local seco e fresco, longe da luz e do calor.<br/>"
             f"<font name='P-Bold'>{p['gluten']}.</font>")
    par = Paragraph(texto, est); _, h = par.wrap(W - 10 * mm, 30 * mm); par.drawOn(c, x + 5 * mm, y + H - 9 * mm - h)
    # lote e validade (preencher ou carimbar)
    c.setStrokeColor(TERRA); c.setLineWidth(0.6)
    c.roundRect(x + 5 * mm, y + 10.6 * mm, 41 * mm, 5.6 * mm, 1.2 * mm, stroke=1, fill=0)
    c.roundRect(x + 48 * mm, y + 10.6 * mm, 47 * mm, 5.6 * mm, 1.2 * mm, stroke=1, fill=0)
    c.setFillColor(VERDE_ESC); c.setFont('P-Bold', 5.6)
    c.drawString(x + 7 * mm, y + 12.6 * mm, 'LOTE:'); c.drawString(x + 50 * mm, y + 12.6 * mm, 'VALIDADE:')
    c.setFont('P-SemiBold', 4.5); c.setFillColor(HexColor('#4A5A4F'))
    for i, linha in enumerate(EMPRESA):
        c.drawString(x + 5 * mm, y + 7.6 * mm - i * 2.0 * mm, linha)


def solapa(c, x, y, p):
    """Solapa aberta 10 x 10 cm: frente embaixo; verso em cima, girado 180°."""
    frente(c, x, y, p)
    c.saveState(); c.translate(x + W, y + 2 * H); c.rotate(180); verso(c, 0, 0, p); c.restoreState()
    # linha de dobra (tracejada) e furos do grampo
    c.setStrokeColor(HexColor('#999999')); c.setLineWidth(0.3); c.setDash(2, 2); c.line(x, y + H, x + W, y + H); c.setDash()


def marcas(c, x, y, w, h):
    c.setStrokeColor(HexColor('#000000')); c.setLineWidth(0.3); t = 4 * mm
    for (px, py, dx, dy) in [(x, y, -1, -1), (x + w, y, 1, -1), (x, y + h, -1, 1), (x + w, y + h, 1, 1)]:
        c.line(px + dx * 1 * mm, py, px + dx * (1 * mm + t), py); c.line(px, py + dy * 1 * mm, px, py + dy * (1 * mm + t))


def gerar(out):
    out.mkdir(parents=True, exist_ok=True)
    for p in PRODUTOS:
        pdf = out / f"solapa-{p['id']}.pdf"
        c = canvas.Canvas(str(pdf), pagesize=A4)
        c.setTitle(f"Solapa {p['nome']} {p['nome2']} - Super Misto")
        mx, my = (A4[0] - 2 * W - 6 * mm) / 2, (A4[1] - 4 * H - 6 * mm) / 2
        for col in range(2):
            for lin in range(2):
                x = mx + col * (W + 6 * mm); y = my + lin * (2 * H + 6 * mm)
                solapa(c, x, y, p); marcas(c, x, y, W, 2 * H)
        c.setFont('P-SemiBold', 7); c.setFillColor(HexColor('#777777'))
        c.drawCentredString(A4[0] / 2, 8 * mm, 'Imprimir em tamanho real (100%). Cortar nas marcas, dobrar no tracejado e grampear sobre o saquinho.')
        c.showPage(); c.save()
        # prévia: uma solapa sozinha
        prev = out / f"previa-{p['id']}.pdf"
        c = canvas.Canvas(str(prev), pagesize=(W + 10 * mm, 2 * H + 10 * mm)); solapa(c, 5 * mm, 5 * mm, p); c.showPage(); c.save()
    print('ok', len(PRODUTOS))


if __name__ == '__main__':
    gerar(Path(sys.argv[1]))
