#!/usr/bin/env python3
"""Kit Quanto Cobrar para vender na Hotmart: planilha de precificação (.xlsx), e-book (.pdf) e capa (.png).

Uso: python3 scripts/kit_hotmart.py <custos.json> <pasta-saida>
custos.json: custo e preços sugeridos de cada receita, calculados pela mesma regra do app (public/app/calculo.js).
"""
import json, sys
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle)
from reportlab.lib.styles import ParagraphStyle

FONTES = Path(__file__).resolve().parent / 'fontes'
LARANJA, ESCURO, CREME = '#E8590C', '#1C1917', '#FFEDD5'
CHAMAS = [('Fogo baixo', 0.08), ('Fogo médio', 0.15), ('Fogo alto', 0.23), ('Forno', 0.20)]


# ---------------------------------------------------------------- planilha
def planilha(custos, saida):
    wb = Workbook()
    fino = Side(style='thin', color='E7E5E4')
    borda = Border(left=fino, right=fino, top=fino, bottom=fino)
    tit = Font(name='Calibri', size=18, bold=True, color='E8590C')
    cab = Font(bold=True, color='FFFFFF')
    fundo_cab = PatternFill('solid', fgColor='E8590C')
    entrada = PatternFill('solid', fgColor='FFF7ED')
    destaque = PatternFill('solid', fgColor='FFEDD5')
    real = '"R$" #,##0.00'

    # 1) Como usar
    ws = wb.active
    ws.title = 'Como usar'
    ws.column_dimensions['A'].width = 100
    linhas = [
        ('Kit Quanto Cobrar · Planilha de Precificação', tit),
        ('', None),
        ('1. Abra a aba "Calculadora".', None),
        ('2. Preencha só as células em amarelo-claro: ingredientes, preço do pacote, tamanho do pacote e quanto usa na receita.', None),
        ('   Use a MESMA unidade no pacote e no "quanto usa" (ex.: pacote 1000 g e usa 400 g; caixa 395 g e usa 197 g).', None),
        ('3. Informe quanto tempo vai ao fogo/forno, o preço do botijão, a embalagem e quantas unidades a receita rende.', None),
        ('4. A planilha mostra o custo de cada unidade e 3 preços de venda: entrada, recomendado e caprichado.', None),
        ('5. Em "Seu trabalho", coloque as horas e quanto quer ganhar por hora: aparece o preço mínimo para não trabalhar de graça.', None),
        ('6. Na aba "Receitas prontas" estão 50 receitas com custo e preço já calculados (preços de mercado de referência).', None),
        ('7. Na aba "Meta do mês" você descobre quantas unidades precisa vender para chegar no lucro que quer.', None),
        ('', None),
        ('Regra de ouro: preço = custo × 2,5 (no mínimo × 2). Nunca venda pelo preço do custo.', Font(bold=True)),
        ('Bônus: com o app Quanto Cobrar você faz tudo isso no celular, com as receitas e os custos prontos.', None),
    ]
    for i, (t, f) in enumerate(linhas, 1):
        c = ws.cell(row=i, column=1, value=t)
        c.alignment = Alignment(wrap_text=True)
        if f:
            c.font = f

    # 2) Calculadora
    ws = wb.create_sheet('Calculadora')
    for col, w in zip('ABCDEFG', [34, 18, 18, 12, 18, 16, 4]):
        ws.column_dimensions[col].width = w
    ws['A1'] = 'Calculadora de preço'; ws['A1'].font = tit
    ws['A2'] = 'Nome da receita:'; ws['B2'] = 'Ex.: Brigadeiro gourmet'; ws['B2'].fill = entrada
    ws.merge_cells('B2:E2')
    cabecalho = ['Ingrediente', 'Preço do pacote', 'Tamanho do pacote', 'Unidade', 'Quanto usa', 'Custo']
    for j, h in enumerate(cabecalho, 1):
        c = ws.cell(row=4, column=j, value=h); c.font = cab; c.fill = fundo_cab; c.alignment = Alignment(horizontal='center')
    exemplo = [('Leite condensado', 6.99, 395, 'g', 395), ('Chocolate em pó 50%', 12.90, 200, 'g', 40),
               ('Manteiga', 9.90, 200, 'g', 15), ('Granulado', 7.50, 500, 'g', 120)]
    uni = DataValidation(type='list', formula1='"g,kg,ml,L,un"', allow_blank=True)
    ws.add_data_validation(uni)
    for r in range(5, 25):
        for j in range(1, 7):
            ws.cell(row=r, column=j).border = borda
        for j in (1, 2, 3, 4, 5):
            ws.cell(row=r, column=j).fill = entrada
        uni.add(ws.cell(row=r, column=4))
        if r - 5 < len(exemplo):
            for j, v in enumerate(exemplo[r - 5], 1):
                ws.cell(row=r, column=j, value=v)
        ws.cell(row=r, column=2).number_format = real
        ws.cell(row=r, column=6, value=f'=IF(OR(C{r}="",C{r}=0,E{r}=""),0,B{r}/C{r}*E{r})').number_format = real
    ws['E25'] = 'Ingredientes:'; ws['F25'] = '=SUM(F5:F24)'; ws['F25'].number_format = real; ws['F25'].font = Font(bold=True)

    # tabela de chamas (consumo de gás em kg/h) para a lista suspensa
    ws['I4'] = 'Chama'; ws['J4'] = 'kg de gás/hora'
    for i, (n, kg) in enumerate(CHAMAS, 5):
        ws.cell(row=i, column=9, value=n); ws.cell(row=i, column=10, value=kg)
    ws.column_dimensions['I'].width = 14; ws.column_dimensions['J'].width = 14
    chama = DataValidation(type='list', formula1='=$I$5:$I$8', allow_blank=False)
    ws.add_data_validation(chama)

    campos = [
        (27, 'Tempo no fogo/forno (minutos)', 30, None),
        (28, 'Tipo de chama', 'Fogo baixo', None),
        (29, 'Preço do botijão de 13 kg', 120, real),
        (30, 'Embalagem por unidade (forminha, saquinho…)', 0.20, real),
        (31, 'Outros custos da receita (luz, água, etiqueta…)', 1.00, real),
        (32, 'Quantas unidades a receita rende', 25, None),
    ]
    for r, rot, val, fmt in campos:
        ws.cell(row=r, column=1, value=rot)
        c = ws.cell(row=r, column=2, value=val); c.fill = entrada; c.border = borda
        if fmt:
            c.number_format = fmt
    chama.add(ws['B28'])

    res = [
        (34, 'Custo do gás', '=B27/60*IFERROR(VLOOKUP(B28,$I$5:$J$8,2,FALSE),0.15)*B29/13'),
        (35, 'Custo das embalagens', '=B30*B32'),
        (36, 'CUSTO TOTAL DA RECEITA', '=F25+B34+B35+B31'),
        (37, 'CUSTO DE CADA UNIDADE', '=IF(B32>0,B36/B32,0)'),
    ]
    for r, rot, f in res:
        ws.cell(row=r, column=1, value=rot).font = Font(bold=r >= 36)
        c = ws.cell(row=r, column=2, value=f); c.number_format = real; c.font = Font(bold=r >= 36)
        if r >= 36:
            c.fill = destaque

    ws['A39'] = 'PREÇO DE VENDA POR UNIDADE'; ws['A39'].font = Font(bold=True, size=13, color='E8590C')
    for j, h in enumerate(['', 'Preço', 'Lucro por unidade', '', 'Lucro da receita'], 1):
        if h:
            c = ws.cell(row=40, column=j, value=h); c.font = cab; c.fill = fundo_cab
    for r, (rot, fator) in zip((41, 42, 43), [('Preço de entrada (custo × 2)', 2), ('RECOMENDADO (custo × 2,5)', 2.5), ('Produto caprichado (custo × 3)', 3)]):
        ws.cell(row=r, column=1, value=rot).font = Font(bold=fator == 2.5)
        c = ws.cell(row=r, column=2, value=f'=CEILING(B37*{fator},0.5)'); c.number_format = real; c.fill = destaque; c.font = Font(bold=True)
        ws.cell(row=r, column=3, value=f'=B{r}-B37').number_format = real
        ws.cell(row=r, column=5, value=f'=C{r}*B32').number_format = real

    ws['A45'] = 'SEU TRABALHO (para não trabalhar de graça)'; ws['A45'].font = Font(bold=True, color='E8590C')
    ws['A46'] = 'Horas de trabalho na receita'; ws['B46'] = 2
    ws['A47'] = 'Quanto quer ganhar por hora'; ws['B47'] = 15; ws['B47'].number_format = real
    for c in ('B46', 'B47'):
        ws[c].fill = entrada; ws[c].border = borda
    ws['A48'] = 'Preço mínimo pagando o seu trabalho'; ws['A48'].font = Font(bold=True)
    ws['B48'] = '=IF(B32>0,CEILING((B36+B46*B47)/B32,0.5),0)'; ws['B48'].number_format = real; ws['B48'].fill = destaque; ws['B48'].font = Font(bold=True)
    ws.freeze_panes = 'A5'

    # 3) Receitas prontas
    ws = wb.create_sheet('Receitas prontas')
    hs = ['Receita', 'Categoria', 'Rende (un.)', 'Custo da receita', 'Custo por unidade', 'Preço de entrada', 'Preço recomendado', 'Preço caprichado']
    for j, (h, w) in enumerate(zip(hs, [34, 14, 11, 16, 16, 15, 17, 16]), 1):
        c = ws.cell(row=1, column=j, value=h); c.font = cab; c.fill = fundo_cab; c.alignment = Alignment(wrap_text=True, horizontal='center')
        ws.column_dimensions[chr(64 + j)].width = w
    for i, r in enumerate(sorted(custos, key=lambda x: (x['categoria'], x['nome'])), 2):
        vals = [r['nome'], r['categoria'], r['unidades'], r['custoTotal'], r['custoUnidade'], r['entrada'], r['recomendado'], r['caprichado']]
        for j, v in enumerate(vals, 1):
            c = ws.cell(row=i, column=j, value=v); c.border = borda
            if j >= 4:
                c.number_format = real
            if j == 7:
                c.fill = destaque; c.font = Font(bold=True)
    n = len(custos) + 3
    ws.cell(row=n, column=1, value='Custos com preços de referência de supermercado (gás a R$ 120 o botijão e embalagem de R$ 0,20). Ajuste aos preços da sua cidade na Calculadora.').font = Font(italic=True, color='78716C')
    ws.freeze_panes = 'A2'

    # 4) Meta do mês
    ws = wb.create_sheet('Meta do mês')
    ws.column_dimensions['A'].width = 46; ws.column_dimensions['B'].width = 18
    ws['A1'] = 'Quanto preciso vender?'; ws['A1'].font = tit
    ws['A3'] = 'Quanto quero de lucro no mês'; ws['B3'] = 1500
    ws['A4'] = 'Lucro por unidade (veja na Calculadora)'; ws['B4'] = '=Calculadora!C42'
    ws['A5'] = 'Dias que vou trabalhar no mês'; ws['B5'] = 22
    for c in ('B3', 'B5'):
        ws[c].fill = entrada; ws[c].border = borda
    ws['B3'].number_format = real; ws['B4'].number_format = real
    ws['A7'] = 'Unidades para vender no mês'; ws['B7'] = '=IF(B4>0,ROUNDUP(B3/B4,0),0)'
    ws['A8'] = 'Unidades por dia'; ws['B8'] = '=IF(B5>0,ROUNDUP(B7/B5,0),0)'
    for c in ('A7', 'A8', 'B7', 'B8'):
        ws[c].font = Font(bold=True)
    ws['B7'].fill = destaque; ws['B8'].fill = destaque

    wb.active = 1
    wb.save(saida)


# ---------------------------------------------------------------- e-book
def ebook(custos, saida):
    for peso in ('Bold', 'SemiBold', 'ExtraBold'):
        pdfmetrics.registerFont(TTFont(f'Poppins-{peso}', str(FONTES / f'Poppins-{peso}.ttf')))
    base = ParagraphStyle('base', fontName='Helvetica', fontSize=11, leading=16, textColor=HexColor(ESCURO), spaceAfter=7)
    h1 = ParagraphStyle('h1', parent=base, fontName='Poppins-ExtraBold', fontSize=21, leading=26, textColor=HexColor(LARANJA), spaceAfter=10, spaceBefore=4)
    h2 = ParagraphStyle('h2', parent=base, fontName='Poppins-Bold', fontSize=13.5, leading=18, spaceBefore=8, spaceAfter=5)
    caixa = ParagraphStyle('caixa', parent=base, backColor=HexColor(CREME), borderPadding=9, leftIndent=9, rightIndent=9, spaceBefore=8, spaceAfter=14)
    item = ParagraphStyle('item', parent=base, leftIndent=14, bulletIndent=2, spaceAfter=4)

    def p(t, s=base):
        return Paragraph(t, s)

    def lista(itens):
        return [Paragraph(t, item, bulletText='•') for t in itens]

    E = []
    # capa
    E += [Spacer(1, 70 * mm),
          p('Kit Quanto Cobrar', ParagraphStyle('k', parent=h1, fontSize=16, textColor=HexColor('#78716C'))),
          p('Como cobrar o preço certo em doces, bolos e salgados', ParagraphStyle('c', parent=h1, fontSize=30, leading=36)),
          p('Pare de trabalhar de graça: o método simples para calcular o custo, definir o preço e ter lucro de verdade.',
            ParagraphStyle('s', parent=base, fontSize=13, leading=19)),
          Spacer(1, 30 * mm), p('LeuName Softwares · app Quanto Cobrar', ParagraphStyle('r', parent=base, textColor=HexColor('#78716C'))),
          PageBreak()]

    E += [p('Antes de começar', h1),
          p('Se você vende doces, bolos ou salgados, provavelmente já passou por isto: trabalhou o fim de semana inteiro, vendeu tudo… '
            'e no fim do mês o dinheiro sumiu. Na maioria das vezes, o problema não é falta de venda. <b>É preço errado.</b>'),
          p('Quem cobra "o mesmo que a vizinha" ou "o que acha justo" quase sempre esquece custos escondidos: o pedaço do pacote de '
            'manteiga, o gás do forno, a forminha, o saquinho, o próprio trabalho. Somando tudo, muita gente descobre que estava '
            'vendendo no prejuízo.'),
          p('Neste guia você vai aprender, em passos simples, a calcular o custo real de cada unidade e a definir um preço que paga '
            'tudo e ainda deixa lucro. Junto com ele vem a <b>planilha de precificação</b>, que faz as contas para você.'),
          p('<b>O que você vai aprender:</b>', base)]
    E += lista(['Calcular o custo exato de cada ingrediente (só o que você usa, não o pacote inteiro);',
                'Colocar na conta o gás, a embalagem e os outros custos que quase todo mundo esquece;',
                'Usar a regra do multiplicador para chegar no preço de venda;',
                'Cobrar pelo seu trabalho, sem culpa;',
                'Descobrir quantas unidades vender para bater a sua meta do mês;',
                'Responder ao cliente que diz "tá caro".'])
    E.append(PageBreak())

    E += [p('Passo 1 · O custo de cada ingrediente', h1),
          p('O erro número 1 é somar o preço do pacote inteiro. Você não usa o pacote inteiro numa receita: usa uma parte. '
            'A conta certa é:'),
          p('<b>Custo do ingrediente = (preço do pacote ÷ tamanho do pacote) × quanto você usa</b>', caixa),
          p('<b>Exemplo:</b> um pacote de 1 kg (1000 g) de açúcar custa R$ 5,49. A receita usa 400 g.'),
          p('R$ 5,49 ÷ 1000 g = R$ 0,0055 por grama. Vezes 400 g = <b>R$ 2,20</b>. Esse é o custo do açúcar nessa receita.'),
          p('Faça isso com cada ingrediente e some tudo. Use sempre a mesma unidade dos dois lados: se o pacote está em gramas, '
            'o "quanto usa" também precisa estar em gramas.'),
          p('<b>Dica:</b> anote os preços que você realmente paga no mercado da sua cidade. Na planilha, você só preenche e ela faz a conta.', caixa)]
    E += [p('Passo 2 · Os custos que ninguém lembra', h1),
          p('Depois dos ingredientes, ainda faltam custos que pesam muito no fim do mês:')]
    E += lista(['<b>Gás:</b> um botijão de 13 kg dura bem menos do que parece. Fogo médio gasta cerca de 0,15 kg por hora; forno, cerca de 0,2 kg por hora. '
                'A planilha calcula o gás pelo tempo e pelo tipo de chama.',
                '<b>Embalagem:</b> forminha, saquinho, caixinha, fita, etiqueta. R$ 0,20 por unidade parece pouco, mas em 100 docinhos são R$ 20.',
                '<b>Outros:</b> luz, água, papel-toalha, detergente. Coloque pelo menos R$ 1 por receita.'])
    E += [p('<b>Custo total da receita = ingredientes + gás + embalagens + outros</b><br/>'
            '<b>Custo de cada unidade = custo total ÷ quantas unidades a receita rende</b>', caixa),
          PageBreak()]

    E += [p('Passo 3 · O preço de venda', h1),
          p('Com o custo de cada unidade em mãos, use a <b>regra do multiplicador</b>:'),
          Table([['Preço', 'Conta', 'Quando usar'],
                 ['Entrada', 'custo × 2', 'Para começar, para revenda ou para quem compra muito'],
                 ['Recomendado', 'custo × 2,5', 'O preço do dia a dia: paga tudo e deixa lucro bom'],
                 ['Caprichado', 'custo × 3', 'Gourmet, festa, embalagem especial, encomenda personalizada']],
                colWidths=[30 * mm, 30 * mm, 105 * mm],
                style=TableStyle([('FONTNAME', (0, 0), (-1, 0), 'Poppins-Bold'), ('BACKGROUND', (0, 0), (-1, 0), HexColor(LARANJA)),
                                  ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#FFFFFF')), ('FONTSIZE', (0, 0), (-1, -1), 10),
                                  ('BACKGROUND', (0, 2), (-1, 2), HexColor(CREME)), ('GRID', (0, 0), (-1, -1), 0.4, HexColor('#E7E5E4')),
                                  ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6)])),
          Spacer(1, 6),
          p('<b>Por que multiplicar e não só somar uma "margenzinha"?</b> Porque o preço precisa pagar o custo, o seu tempo, as perdas '
            '(o doce que quebrou, o que você deu para provar) e ainda deixar lucro para o seu negócio crescer.'),
          p('<b>Exemplo completo:</b> uma receita de cocada custa R$ 21,86 no total e rende 25 unidades. Custo de cada uma: R$ 0,87. '
            'Preço recomendado: R$ 0,87 × 2,5 = R$ 2,18, arredondado para <b>R$ 2,50</b>. Lucro de R$ 1,63 em cada cocada e '
            'R$ 40,75 na receita inteira.', caixa),
          p('<b>Arredonde para cima</b>, de 50 em 50 centavos: fica mais fácil de dar troco e você não perde nos centavos.')]
    E += [p('Passo 4 · O seu trabalho também tem preço', h1),
          p('Muita gente coloca tudo na conta… menos as horas que passou na cozinha. Faça este teste: quantas horas você leva para '
            'fazer a receita, embalar e entregar? Quanto quer ganhar por hora?'),
          p('<b>Preço mínimo = (custo total da receita + horas × valor da hora) ÷ unidades</b>', caixa),
          p('Se o seu preço de venda ficar abaixo desse mínimo, você está pagando para trabalhar. A planilha mostra esse número '
            'na parte "Seu trabalho".'),
          PageBreak()]

    E += [p('Passo 5 · A meta do mês', h1),
          p('Defina quanto quer de lucro no mês e divida pelo lucro de cada unidade:'),
          p('<b>Unidades para vender = lucro que você quer ÷ lucro por unidade</b>', caixa),
          p('Exemplo: quer R$ 1.500 de lucro e cada docinho dá R$ 1,63 de lucro. Precisa vender 921 docinhos no mês: '
            'cerca de 42 por dia em 22 dias de trabalho. Com esse número, você sabe se a meta é possível ou se precisa '
            'de um produto com lucro maior (como bolos e encomendas de festa).'),
          p('Quando o cliente diz "tá caro"', h1)]
    E += lista(['<b>Não baixe o preço logo de cara.</b> Explique o que está incluso: ingredientes de qualidade, feito na hora, embalagem bonita.',
                '<b>Ofereça opção menor</b> em vez de desconto: um tamanho menor, menos unidades, sem a embalagem especial.',
                '<b>Dê vantagem por quantidade</b>, não desconto no avulso: "um cento sai por R$ X".',
                '<b>Lembre do valor</b>: quem compra doce para festa quer segurança de que vai ficar bonito e gostoso.',
                '<b>Aceite perder alguns clientes.</b> Quem só compra pelo menor preço raramente é o cliente que faz o seu negócio crescer.'])
    E.append(PageBreak())

    E += [p('Tabela de referência · 50 receitas', h1),
          p('Custos calculados com preços de supermercado de referência, gás a R$ 120 o botijão e R$ 0,20 de embalagem por unidade. '
            'Use como ponto de partida e ajuste com os preços da sua cidade na planilha.')]
    linhas = [['Receita', 'Rende', 'Custo/un.', 'Recomendado']]
    for r in sorted(custos, key=lambda x: (x['categoria'], x['nome'])):
        linhas.append([Paragraph(r['nome'], ParagraphStyle('t', parent=base, fontSize=9, leading=11, spaceAfter=0)),
                       str(r['unidades']), f"R$ {r['custoUnidade']:.2f}".replace('.', ','), f"R$ {r['recomendado']:.2f}".replace('.', ',')])
    E.append(Table(linhas, colWidths=[95 * mm, 20 * mm, 25 * mm, 28 * mm], repeatRows=1,
                   style=TableStyle([('FONTNAME', (0, 0), (-1, 0), 'Poppins-Bold'), ('BACKGROUND', (0, 0), (-1, 0), HexColor(LARANJA)),
                                     ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#FFFFFF')), ('FONTSIZE', (0, 0), (-1, -1), 9),
                                     ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#FFFFFF'), HexColor('#FAFAF9')]),
                                     ('GRID', (0, 0), (-1, -1), 0.3, HexColor('#E7E5E4')), ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                                     ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)])))
    E.append(PageBreak())

    E += [p('Próximos passos', h1)]
    E += lista(['Abra a planilha e calcule o seu produto que mais vende. Compare com o preço que você cobra hoje.',
                'Se estiver abaixo do preço recomendado, reajuste aos poucos ou crie uma versão "caprichada" com preço maior.',
                'Refaça as contas sempre que o mercado aumentar os preços (pelo menos uma vez por mês).',
                'Use o <b>app Quanto Cobrar</b> (bônus deste kit) para calcular no celular, com receitas e custos prontos, a qualquer hora.'])
    E += [Spacer(1, 10), p('Bom trabalho e boas vendas!', ParagraphStyle('f', parent=h2, textColor=HexColor(LARANJA)))]

    def rodape(c, doc):
        if doc.page > 1:
            c.setFont('Helvetica', 8); c.setFillColor(HexColor('#A8A29E'))
            c.drawString(18 * mm, 10 * mm, 'Kit Quanto Cobrar · LeuName Softwares')
            c.drawRightString(A4[0] - 18 * mm, 10 * mm, str(doc.page))

    def capa(c, doc):
        c.setFillColor(HexColor(CREME)); c.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        c.setFillColor(HexColor(LARANJA)); c.rect(0, A4[1] - 22 * mm, A4[0], 22 * mm, fill=1, stroke=0)

    SimpleDocTemplate(str(saida), pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
                      title='Kit Quanto Cobrar · Como cobrar o preço certo', author='LeuName Softwares').build(E, onFirstPage=capa, onLaterPages=rodape)


# ---------------------------------------------------------------- capa (Hotmart: quadrada 600×600 e banner)
def fonte(peso, px):
    return ImageFont.truetype(str(FONTES / f'Poppins-{peso}.ttf'), px)


def capa_png(saida, w, h):
    img = Image.new('RGB', (w, h), CREME)
    d = ImageDraw.Draw(img)
    esc = w / 1080
    d.rectangle((0, 0, w, int(130 * esc)), fill=LARANJA)
    d.text((int(60 * esc), int(65 * esc)), 'KIT QUANTO COBRAR', font=fonte('ExtraBold', int(52 * esc)), fill='#FFFFFF', anchor='lm')
    y = int(220 * esc)
    for linha, tam, cor in [('Cobre o preço', 92, ESCURO), ('certo', 92, LARANJA), ('em doces, bolos', 64, ESCURO), ('e salgados', 64, ESCURO)]:
        d.text((int(60 * esc), y), linha, font=fonte('ExtraBold', int(tam * esc)), fill=cor)
        y += int(tam * 1.18 * esc)
    y += int(30 * esc)
    for t in ['✓ E-book passo a passo', '✓ Planilha que faz as contas', '✓ 50 receitas com custo pronto', '✓ Bônus: app Quanto Cobrar']:
        d.text((int(60 * esc), y), t.replace('✓', '•'), font=fonte('SemiBold', int(40 * esc)), fill=ESCURO)
        y += int(58 * esc)
    d.rounded_rectangle((int(60 * esc), h - int(150 * esc), int(620 * esc), h - int(60 * esc)), int(45 * esc), fill=LARANJA)
    d.text((int(340 * esc), h - int(105 * esc)), 'Pare de trabalhar de graça', font=fonte('Bold', int(34 * esc)), fill='#FFFFFF', anchor='mm')
    img.save(saida, quality=92)


def main():
    custos = json.loads(Path(sys.argv[1]).read_text())
    out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    planilha(custos, out / 'Planilha-Precificacao-Quanto-Cobrar.xlsx')
    ebook(custos, out / 'Ebook-Como-Cobrar-o-Preco-Certo.pdf')
    capa_png(out / 'capa-1080.png', 1080, 1080)
    print('ok', sorted(p.name for p in out.iterdir()))


if __name__ == '__main__':
    main()
