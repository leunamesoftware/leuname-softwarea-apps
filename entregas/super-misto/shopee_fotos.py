"""Fotos da Shopee (1200 x 1200) feitas dos saquinhos com logo, sem depender de IA.

Gera em shopee/fotos/:
  avulso-<id>-<peso>.jpg   foto principal de cada sabor em 50 g, 100 g e 1 kg (variação do anúncio)
  tamanhos-<id>.jpg        os 4 tamanhos lado a lado (2ª foto do anúncio avulso)
  kit-<kit>-<peso>.jpg     capa de cada kit em cada tamanho
  info-natural.jpg         foto de informação comum a todos os anúncios

Uso: python3 shopee_fotos.py   (precisa das fotos do site já recortadas: fotos_site.py)
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

AQUI = Path(__file__).parent
SITE = AQUI.parent.parent / 'sites' / 'supermisto' / 'img' / 'produtos'
FONTES = AQUI.parents[1] / 'calculadora' / 'scripts' / 'fontes'
SAIDA = AQUI / 'shopee' / 'fotos'
LADO = 1200
CREME, BORDO, BORDO_ESC, DOURADO = (251, 246, 238), (107, 20, 32), (74, 13, 22), (184, 134, 43)

SLUG = {'pimenta-do-reino': 'pimenta-do-reino-moida', 'cominho': 'cominho-moido',
        'curcuma': 'acafrao-da-terra-curcuma', 'canela': 'canela-em-po'}
NOMES = {'colorau': 'Colorau', 'tempero-completo': 'Tempero Completo', 'pimenta-do-reino': 'Pimenta-do-Reino Moída',
         'cominho': 'Cominho Moído', 'chimichurri': 'Chimichurri', 'oregano': 'Orégano', 'paprica-doce': 'Páprica Doce',
         'paprica-defumada': 'Páprica Defumada', 'curcuma': 'Açafrão-da-Terra (Cúrcuma)', 'alho-em-po': 'Alho em Pó',
         'cebola-em-po': 'Cebola em Pó', 'lemon-pepper': 'Lemon Pepper', 'pimenta-calabresa': 'Pimenta Calabresa',
         'canela': 'Canela em Pó', 'tempero-baiano': 'Tempero Baiano'}
PESOS = {'10g': '', '50g': '-50g', '100g': '-100g', '1kg': '-1kg'}
DIA_A_DIA = ['colorau', 'tempero-completo', 'pimenta-do-reino', 'cominho', 'chimichurri',
             'oregano', 'paprica-doce', 'curcuma', 'alho-em-po', 'cebola-em-po']
ESPECIAIS = ['paprica-defumada', 'lemon-pepper', 'pimenta-calabresa', 'tempero-baiano', 'canela']
KITS = {
    'dia-a-dia': ('Kit 10 Temperos', DIA_A_DIA),
    'especiais': ('Kit 5 Temperos Especiais', ESPECIAIS),
    'completo': ('Kit 15 Temperos', DIA_A_DIA + ESPECIAIS),
}
TXT_KIT = {'10g': '{n} sachês de 10 g', '50g': '{n} pacotes de 50 g = {t}', '100g': '{n} pacotes de 100 g = {t}'}


def fonte(peso, tam):
    return ImageFont.truetype(str(FONTES / f'Poppins-{peso}.ttf'), tam)


def kg(g):
    return f'{g // 1000} kg' if g % 1000 == 0 else (f'{g / 1000:.1f} kg'.replace('.', ',') if g >= 1000 else f'{g} g')


def fundo():
    """Creme com luz no centro (fica limpo e destaca o produto)."""
    im = Image.new('RGB', (LADO, LADO), CREME)
    luz = Image.new('L', (LADO, LADO), 0)
    ImageDraw.Draw(luz).ellipse((150, 120, LADO - 150, LADO - 180), fill=255)
    luz = luz.filter(ImageFilter.GaussianBlur(160))
    im.paste(Image.new('RGB', (LADO, LADO), (255, 252, 247)), (0, 0), luz)
    return im


def produto(pid, peso):
    im = Image.open(SITE / f'{SLUG.get(pid, pid)}{PESOS[peso]}.webp').convert('RGBA')
    return im.crop(im.getbbox())


def colar(tela, im, cx, base, altura, sombra=True, largura=None):
    """Cola o saquinho com a base na linha `base`, centralizado em cx, com sombra macia (cabe em altura x largura)."""
    k = altura / im.height if largura is None else min(altura / im.height, largura / im.width)
    altura = round(im.height * k)
    im = im.resize((round(im.width * k), altura), Image.LANCZOS)
    x, y = cx - im.width // 2, base - altura
    if sombra:
        s = Image.new('RGBA', tela.size, (0, 0, 0, 0))
        m = im.split()[-1].point(lambda v: v * 70 // 255)
        s.paste(Image.new('RGBA', im.size, (60, 30, 20, 255)), (x + 10, y + 18), m)
        tela.alpha_composite(s.filter(ImageFilter.GaussianBlur(16)))
    tela.alpha_composite(im, (x, y))
    return im.width


def faixa_rodape(d, texto='100% NATURAL  ·  SEM CONSERVANTES', fino=False):
    y0 = LADO - (100 if fino else 120)
    d.rounded_rectangle((90, y0, LADO - 90, LADO - 30 if fino else LADO - 40), radius=40, fill=BORDO)
    d.text((LADO // 2, (y0 + (LADO - 30 if fino else LADO - 40)) // 2), texto, font=fonte('Bold', 36 if fino else 38), fill='white', anchor='mm')


def avulso(pid, peso):
    tela = fundo().convert('RGBA')
    p = produto(pid, peso)
    alt = 900 if peso != '1kg' else 760
    alt = min(alt, round(1000 * p.height / p.width))
    colar(tela, p, LADO // 2, LADO - 160, alt)
    d = ImageDraw.Draw(tela)
    faixa_rodape(d)
    return tela.convert('RGB')


def tamanhos(pid):
    tela = fundo().convert('RGBA')
    d = ImageDraw.Draw(tela)
    d.text((LADO // 2, 95), 'Escolha o tamanho', font=fonte('ExtraBold', 64), fill=BORDO, anchor='mm')
    d.text((LADO // 2, 165), NOMES[pid], font=fonte('SemiBold', 40), fill=(90, 70, 60), anchor='mm')
    # grade 2 x 2, cada tamanho com o selo embaixo
    for i, (peso, t) in enumerate(zip(PESOS, ['10 g', '50 g', '100 g', '1 kg'])):
        cx, base = (330, 870)[i % 2], (615, 1035)[i // 2]
        colar(tela, produto(pid, peso), cx, base - 50, 330, largura=480)
        d.rounded_rectangle((cx - 70, base - 35, cx + 70, base + 15), radius=25, fill=DOURADO)
        d.text((cx, base - 10), t, font=fonte('Bold', 32), fill='white', anchor='mm')
    faixa_rodape(d)
    return tela.convert('RGB')


def kit(nome, ids, peso):
    tela = fundo().convert('RGBA')
    d = ImageDraw.Draw(tela)
    d.text((LADO // 2, 72), nome, font=fonte('ExtraBold', 80 if len(nome) < 18 else 64), fill=BORDO, anchor='mm')
    sub = TXT_KIT[peso].format(n=len(ids), t=kg(len(ids) * int(peso[:-1])))
    w = d.textlength(sub, font=fonte('Bold', 38)) + 80
    d.rounded_rectangle((LADO // 2 - w // 2, 122, LADO // 2 + w // 2, 186), radius=32, fill=DOURADO)
    d.text((LADO // 2, 154), sub, font=fonte('Bold', 38), fill='white', anchor='mm')
    por = 5 if len(ids) > 5 else 3
    linhas = [ids[i:i + por] for i in range(0, len(ids), por)]
    topo, fim = 200, LADO - 112
    passo = (LADO - 70) / por
    alt = (fim - topo) // len(linhas) - 6
    # um pouco sobrepostos (como numa foto de kit de verdade): da direita para a esquerda,
    # assim cada saquinho cobre só a foto do vizinho, nunca o nome
    larg = passo * (1.22 if len(linhas) == 2 else 1.08) - 6
    p0 = produto(ids[0], peso)
    h = min(alt, round(larg * p0.height / p0.width))  # altura real de cada fileira
    sobra = (fim - topo) - len(linhas) * (h + 6)
    topo += sobra // 2
    for j, lin in enumerate(linhas):
        base = topo + (j + 1) * (h + 6)
        x0 = LADO / 2 - passo * (len(lin) - 1) / 2
        for i, pid in reversed(list(enumerate(lin))):
            colar(tela, produto(pid, peso), round(x0 + i * passo), base, alt, largura=larg)
    faixa_rodape(d, fino=True)
    return vivo(tela)


def detalhe(nome, ids, peso, parte, total):
    """Foto de perto de parte do kit (até 5 saquinhos grandes: 3 em cima, 2 embaixo)."""
    tela = fundo().convert('RGBA')
    d = ImageDraw.Draw(tela)
    d.text((LADO // 2, 70), f'O que vem no {nome.split(" ")[0].lower()}' + (f'  ({parte}/{total})' if total > 1 else ''),
           font=fonte('ExtraBold', 58), fill=BORDO, anchor='mm')
    linhas = [ids[:3], ids[3:]] if len(ids) > 3 else [ids]
    topo, fim = 125, LADO - 45
    for j, lin in enumerate(linhas):
        base = topo + (j + 1) * (fim - topo) // len(linhas) - 6
        passo = (LADO - 40) / 3
        x0 = LADO / 2 - passo * (len(lin) - 1) / 2
        for i, pid in enumerate(lin):
            colar(tela, produto(pid, peso), round(x0 + i * passo), base, (fim - topo) // len(linhas) - 24, largura=passo - 34)
    return vivo(tela)


def vivo(tela):
    """Um pouco mais claro e com mais cor (foto de vitrine)."""
    im = tela.convert('RGB')
    im = ImageEnhance.Brightness(im).enhance(1.04)
    return ImageEnhance.Color(im).enhance(1.08)


def info():
    tela = fundo().convert('RGBA')
    d = ImageDraw.Draw(tela)
    logo = Image.open(AQUI / 'logo-bordo' / 'logo-supermisto.png').convert('RGBA')
    logo = logo.resize((520, round(logo.height * 520 / logo.width)), Image.LANCZOS)
    tela.alpha_composite(logo, ((LADO - logo.width) // 2, 70))
    itens = [('100% natural', 'Só o tempero, sem enchimento.'),
             ('Sem conservantes', 'Nada de química para durar mais.'),
             ('Moído e embalado na hora', 'Mais cheiro e mais sabor na panela.'),
             ('Fábrica própria', 'Do nosso moinho direto para você.')]
    y = 420
    for t, s in itens:
        d.ellipse((150, y - 8, 230, y + 72), fill=BORDO)
        d.line([(170, y + 34), (186, y + 50), (212, y + 18)], fill='white', width=9, joint='curve')
        d.text((270, y), t, font=fonte('ExtraBold', 50), fill=BORDO)
        d.text((270, y + 62), s, font=fonte('SemiBold', 34), fill=(90, 70, 60))
        y += 165
    return tela.convert('RGB')


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    for pid in NOMES:
        for peso in ('50g', '100g', '1kg'):  # 10 g sozinho não paga a taxa fixa da Shopee: só em kit
            avulso(pid, peso).save(SAIDA / f'avulso-{pid}-{peso}.jpg', quality=90)
        tamanhos(pid).save(SAIDA / f'tamanhos-{pid}.jpg', quality=90)
    for chave, (nome, ids) in KITS.items():
        for peso in TXT_KIT:
            kit(nome, ids, peso).save(SAIDA / f'kit-{chave}-{peso}.jpg', quality=90)
            partes = [ids[i:i + 5] for i in range(0, len(ids), 5)]
            for n, grupo in enumerate(partes, 1):
                detalhe(nome, grupo, peso, n, len(partes)).save(SAIDA / f'kit-{chave}-{peso}-perto{n}.jpg', quality=90)
    info().save(SAIDA / 'info-natural.jpg', quality=90)
    print('ok', len(list(SAIDA.glob('*.jpg'))), 'fotos')


if __name__ == '__main__':
    main()
