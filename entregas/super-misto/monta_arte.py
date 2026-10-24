#!/usr/bin/env python3
"""Monta a FRENTE e o VERSO das solapas Supermisto em cima do fundo feito pelo ChatGPT (sem texto).

Uso: python3 monta_arte.py <id>      (lê artes/<id>-fundo-frente.png e artes/<id>-fundo-verso.png)
Gera artes/<id>-frente.png e artes/<id>-verso.png (2000 x 1000), que o solapa_padrao.py transforma no PDF da gráfica.
Tudo que é escrito sai daqui: logo oficial, nome, peso, frase, "Ideal para", ingredientes, conservação, lote, validade e empresa.
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

AQUI = Path(__file__).resolve().parent
ARTES = AQUI / 'artes'
FONTES = AQUI / 'fontes'
POPPINS = AQUI.parents[1] / 'calculadora' / 'scripts' / 'fontes'
LOGO = AQUI / 'logo-nova' / 'logo-supermisto.png'
CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

# nome (1 ou 2 linhas), peso, ingredientes e "ideal para" de cada produto
PRODUTOS = {
    'pimenta-do-reino': {
        'nome': ['Pimenta-do-Reino', 'Moída'], 'peso': '10 g', 'destaque': '#E8B923',
        'ing': 'Pimenta-do-reino preta moída.', 'gluten': 'NÃO CONTÉM GLÚTEN.',
        'ideal': ['Carnes', 'Aves', 'Peixes', 'Saladas', 'Sopas', 'Molhos'],
        'frase': 'Aroma forte e picância na medida.',
    },
    'colorau': {
        'nome': ['Colorau'], 'peso': '10 g', 'destaque': '#F2C230',
        'ing': 'Fubá de milho e urucum.', 'gluten': 'NÃO CONTÉM GLÚTEN.',
        'ideal': ['Arroz', 'Feijão', 'Frango', 'Carnes', 'Peixes', 'Ensopados'],
        'frase': 'Cor viva e sabor suave.',
    },
    'tempero-completo': {
        'nome': ['Tempero', 'Completo'], 'peso': '10 g', 'destaque': '#F57C00',
        'ing': 'Sal, alho, cebola, salsa, colorífico (fubá de milho e urucum), pimentão, pimenta-do-reino, orégano e cebolinha. Ingredientes desidratados.',
        'gluten': 'NÃO CONTÉM GLÚTEN.',
        'ideal': ['Carnes', 'Aves', 'Arroz', 'Feijão', 'Legumes', 'Molhos'],
        'frase': 'Tudo que a sua comida precisa.',
    },
}
EMPRESA = ['Produzido e embalado por: SUPER MISTO TEMPEROS LTDA', 'CNPJ 13.580.397/0001-80 · Estrada de Xerém, 484',
           'Xerém · Duque de Caxias (RJ) · CEP 25241-390', 'SAC: (24) 99872-1557 · INDÚSTRIA BRASILEIRA']
CONSERVACAO = 'Manter em local seco, fresco e ao abrigo da luz. Após aberto, manter bem fechado.'

# Furo borboleta (gancho de gôndola): fenda de 1,8 cm com um círculo de 0,55 cm no meio (escala 200 px = 1 cm).
FURO = ('<svg class="furo" viewBox="0 0 360 120"><g fill="#fff">'
        '<rect x="0" y="30" width="360" height="60" rx="30"/><circle cx="180" cy="60" r="55"/></g></svg>')

CSS = f"""
@font-face{{font-family:Script;src:url('file://{FONTES}/kaushanscript-KaushanScript-Regular.ttf')}}
@font-face{{font-family:P;font-weight:600;src:url('file://{POPPINS}/Poppins-SemiBold.ttf')}}
@font-face{{font-family:P;font-weight:700;src:url('file://{POPPINS}/Poppins-Bold.ttf')}}
@font-face{{font-family:P;font-weight:800;src:url('file://{POPPINS}/Poppins-ExtraBold.ttf')}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:2000px;height:1000px;overflow:hidden;font-family:P;color:#fff}}
.cena{{position:relative;width:2000px;height:1000px;background-size:cover;background-position:center}}
.furo{{position:absolute;left:820px;top:30px;width:360px;height:120px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}}
.sombra{{filter:drop-shadow(0 8px 14px rgba(0,0,0,.45))}}
"""


def frente_html(p, fundo):
    nome = ''.join(f'<div>{l}</div>' for l in p['nome'])
    tam = 150 if max(len(l) for l in p['nome']) <= 14 else 128
    return f"""<html><head><style>{CSS}
.logo{{position:absolute;left:940px;top:150px;width:800px}}
.nome{{position:absolute;left:820px;width:1040px;top:470px;text-align:center;font-family:Script;font-size:{tam}px;line-height:1.02;
  text-shadow:0 6px 0 rgba(0,0,0,.25),0 10px 24px rgba(0,0,0,.45);transform:rotate(-3deg)}}
.risco{{position:absolute;left:1000px;top:{470 + len(p['nome']) * tam * 1.02 + 6}px;width:700px;height:34px;transform:rotate(-3deg)}}
.frase{{position:absolute;left:1230px;transform:translateX(-50%);top:{470 + len(p['nome']) * tam * 1.02 + 62}px;white-space:nowrap;font-weight:700;font-size:36px;
  color:#fff;background:rgba(5,40,18,.82);padding:10px 30px;border-radius:40px;border:3px solid {p['destaque']}}}
.peso{{position:absolute;right:56px;bottom:46px;padding:14px 46px;border-radius:60px;background:#0B6E33;border:7px solid #fff;
  font-weight:800;font-size:92px;line-height:1;box-shadow:0 10px 26px rgba(0,0,0,.45)}}
</style></head><body><div class="cena" style="background-image:url('file://{fundo}')">
{FURO}
<img class="logo sombra" src="file://{LOGO}">
<div class="nome">{nome}</div>
<svg class="risco" viewBox="0 0 700 34" preserveAspectRatio="none"><path d="M10 26 C 200 4, 480 2, 690 14" stroke="{p['destaque']}" stroke-width="14" stroke-linecap="round" fill="none"/></svg>
<div class="frase">{p['frase']}</div>
<div class="peso">{p['peso']}</div>
</div></body></html>"""


def verso_html(p, fundo):
    ideal = ''.join(f'<span>{i}</span>' for i in p['ideal'])
    return f"""<html><head><style>{CSS}
.logo{{position:absolute;left:60px;top:70px;width:560px}}
.nome{{position:absolute;left:70px;top:270px;font-family:Script;font-size:76px;line-height:1.05;text-shadow:0 6px 18px rgba(0,0,0,.5);transform:rotate(-3deg)}}
.ideal{{position:absolute;left:720px;top:150px;width:600px;background:rgba(255,255,255,.96);border-radius:28px;padding:28px 30px 32px;color:#0B4F27;
  box-shadow:0 14px 30px rgba(0,0,0,.35)}}
.ideal b{{display:block;font-weight:800;font-size:40px;margin-bottom:18px;color:#0B6E33}}
.ideal div{{display:grid;grid-template-columns:1fr 1fr;gap:14px}}
.ideal span{{background:#0B6E33;color:#fff;border-radius:16px;padding:14px 10px;text-align:center;font-weight:700;font-size:32px}}
.col{{position:absolute;left:1400px;top:60px;width:560px;display:grid;gap:22px}}
.cx{{background:#FFF8EC;border-radius:24px;overflow:hidden;color:#1B2A20;box-shadow:0 10px 24px rgba(0,0,0,.3)}}
.cx b{{display:block;background:#0B6E33;color:#fff;font-weight:800;font-size:32px;padding:12px 24px}}
.cx p{{font-weight:600;font-size:28px;line-height:1.3;padding:14px 24px 18px}}
.lv{{display:grid;grid-template-columns:1fr 1fr;gap:16px}}
.lv div{{border:3px solid #fff;border-radius:16px;padding:12px 18px;font-weight:700;font-size:28px;background:rgba(0,0,0,.25)}}
.emp{{position:absolute;right:40px;bottom:34px;text-align:right;font-weight:600;font-size:22px;line-height:1.38;text-shadow:0 2px 6px rgba(0,0,0,.7)}}
</style></head><body><div class="cena" style="background-image:url('file://{fundo}')">
{FURO}
<img class="logo sombra" src="file://{LOGO}">
<div class="nome">{'<br>'.join(p['nome'])}</div>
<div class="ideal"><b>IDEAL PARA:</b><div>{ideal}</div></div>
<div class="col">
 <div class="cx"><b>INGREDIENTES:</b><p>{p['ing']}<br><strong>{p['gluten']}</strong></p></div>
 <div class="cx"><b>CONSERVAÇÃO:</b><p>{CONSERVACAO}</p></div>
 <div class="lv"><div>LOTE:</div><div>VAL.:</div></div>
</div>
<div class="emp">{'<br>'.join(EMPRESA)}</div>
</div></body></html>"""


def render(html, saida, pg):
    tmp = AQUI / '.render.html'; tmp.write_text(html, encoding='utf-8')
    pg.goto(f'file://{tmp}'); pg.wait_for_timeout(400); pg.screenshot(path=str(saida)); tmp.unlink()


def main(pid, peso=None):
    p = dict(PRODUTOS[pid])
    sufixo = ''
    if peso:
        p['peso'] = peso; sufixo = '-' + peso.replace(' ', '')
    ff, fv = ARTES / f'{pid}-fundo-frente.png', ARTES / f'{pid}-fundo-verso.png'
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path=CHROME); pg = b.new_page(viewport={'width': 2000, 'height': 1000})
        render(frente_html(p, ff), ARTES / f'{pid}{sufixo}-frente.png', pg)
        if not fv.exists():  # sem fundo próprio: o verso usa o fundo da frente, escurecido para os textos
            from PIL import Image, ImageEnhance, ImageFilter
            im = Image.open(ff).convert('RGB')
            ImageEnhance.Brightness(im.filter(ImageFilter.GaussianBlur(2))).enhance(0.62).save(ARTES / f'.{pid}-fundo-verso.png'); fv = ARTES / f'.{pid}-fundo-verso.png'
        render(verso_html(p, fv), ARTES / f'{pid}{sufixo}-verso.png', pg)
        b.close()
    print('ok', pid)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)  # ex.: monta_arte.py colorau "100 g"
