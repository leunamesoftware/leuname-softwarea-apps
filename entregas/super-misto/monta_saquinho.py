#!/usr/bin/env python3
"""Saquinho de 10 g no padrão Supermisto, a partir da imagem do ChatGPT (saquinho com a solapa SEM texto).

Uso: python3 monta_saquinho.py <id>      (lê saquinhos-base/<id>.png)
Gera, sempre no mesmo tamanho:
  artes/<id>-frente.png e artes/<id>-verso.png (2000 x 1000, para o solapa_padrao.py fazer o PDF da gráfica)
  saquinhos/<id>.png (foto do saquinho pronto, 1200 x 1440, fundo branco)
Tudo que é escrito sai daqui: logo oficial (centro), nome, 10 g e o verso completo.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from playwright.sync_api import sync_playwright
from monta_arte import PRODUTOS, CSS, LOGO, CHROME, ARTES, FURO, verso_html, render

AQUI = Path(__file__).resolve().parent
BASE, SAIDA = AQUI / 'saquinhos-base', AQUI / 'saquinhos'
W_SOLAPA = 1000  # largura padrão da solapa na foto do saquinho


def caixa_solapa(im):
    """Retângulo da solapa no topo da imagem (sempre 2:1, como o molde)."""
    a = np.asarray(im.convert('RGB')).astype(int)
    cheio = (a.min(2) < 225)
    y0 = next(y for y in range(a.shape[0]) if cheio[y].mean() > 0.5)
    xs = np.where(cheio[y0 + 60])[0]
    x0, x1 = int(xs[0]), int(xs[-1]) + 1
    return x0, y0, x1, y0 + round((x1 - x0) / 2)


# Fumaça suave (para a linha defumada): fios brancos borrados subindo da tigela e do lado direito.
FUMACA = """<svg style="position:absolute;inset:0;width:2000px;height:1000px;filter:blur(14px);opacity:.55" viewBox="0 0 2000 1000">
<g fill="none" stroke="#fff" stroke-linecap="round">
<path d="M1700 520 C1640 420 1780 360 1700 260 C1640 180 1760 120 1720 40" stroke-width="34"/>
<path d="M1820 560 C1880 470 1760 400 1840 300 C1900 220 1800 150 1860 60" stroke-width="26"/>
<path d="M1580 600 C1530 520 1620 470 1570 390" stroke-width="22"/>
<path d="M300 560 C250 470 360 420 300 330 C250 250 340 190 300 110" stroke-width="22" opacity=".6"/>
</g></svg>"""


def frente_html_antiga(p, fundo):
    """Padrão fixo de TODAS as solapas: logo no mesmo lugar e tamanho, faixa do nome sempre do mesmo
    tamanho (a letra é que se ajusta dentro dela) e o selo de peso no mesmo canto."""
    nome = ' '.join(p['nome'])
    return f"""<html><head><meta charset="utf-8"><style>{CSS}
.logo{{position:absolute;left:500px;top:215px;width:1000px}}
.faixa{{position:absolute;left:520px;top:585px;width:960px;height:200px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(180deg,#14894A,#065427);border:8px solid #fff;border-radius:100px;box-shadow:0 12px 28px rgba(0,0,0,.45);transform:rotate(-2deg)}}
.nome{{font-family:Script;color:#fff;line-height:1.02;text-align:center;text-shadow:0 4px 8px rgba(0,0,0,.35);padding:0 40px 8px}}
.peso{{position:absolute;right:70px;bottom:60px;width:300px;height:130px;display:flex;align-items:center;justify-content:center;border-radius:65px;
  background:#0B6E33;border:7px solid #fff;font-weight:800;font-size:84px;line-height:1;box-shadow:0 10px 26px rgba(0,0,0,.45)}}
</style></head><body><div class="cena" style="background-image:url('file://{fundo}')">
{FUMACA if p.get('fumaca') else ''}
<img class="logo sombra" src="file://{LOGO}">
<div class="faixa"><div class="nome" id="n" data-duas="{'<br>'.join(p['nome'])}">{nome}</div></div>
<div class="peso">{p['peso']}</div>
</div>
<script>
// a letra começa grande e diminui até caber na faixa (uma linha; se não couber, quebra em duas)
const n = document.getElementById('n'), caixa = n.parentElement;
let t = 120; n.style.fontSize = t + 'px'; n.style.whiteSpace = 'nowrap';
while (n.scrollWidth > caixa.clientWidth - 40 && t > 84) {{ t -= 2; n.style.fontSize = t + 'px'; }}
if (n.scrollWidth > caixa.clientWidth - 40) {{ n.innerHTML = n.dataset.duas; t = 84;
  while ((n.scrollHeight > caixa.clientHeight - 10 || n.scrollWidth > caixa.clientWidth - 40) && t > 50) {{ t -= 2; n.style.fontSize = t + 'px'; }} }}
</script></body></html>"""


def frente_html(p, fundo):
    """Padrão LIMPO: à esquerda só a foto do tempero (recortada da arte), à direita um painel liso da marca,
    sempre igual em todos: logo, nome e peso. A marca manda; a foto só mostra o sabor."""
    nome = ' '.join(p['nome'])
    cor = p.get('cor', '#8E1B12')
    return f"""<html><head><meta charset="utf-8"><style>{CSS}
.foto{{position:absolute;left:0;top:0;width:740px;height:1000px;background-image:url('file://{fundo}');background-size:2000px 1000px;background-position:-60px 0}}
.painel{{position:absolute;left:620px;top:0;width:1380px;height:1000px;background:linear-gradient(160deg,#0E7A3A,#064A22);
  clip-path:polygon(80px 0,100% 0,100% 100%,0 100%)}}
.fio{{position:absolute;left:600px;top:0;width:60px;height:1000px;background:{cor};clip-path:polygon(80% 0,100% 0,20% 100%,0 100%)}}
.logo{{position:absolute;left:930px;top:230px;width:920px}}
.nome{{position:absolute;left:880px;width:1020px;top:560px;height:210px;display:flex;align-items:center;justify-content:center;text-align:center;
  font-family:Script;color:#fff;line-height:1.02;text-shadow:0 4px 10px rgba(0,0,0,.35)}}
.peso{{position:absolute;right:80px;bottom:70px;width:280px;height:120px;display:flex;align-items:center;justify-content:center;border-radius:60px;
  background:#fff;color:#0B6E33;font-weight:800;font-size:78px;line-height:1;box-shadow:0 8px 20px rgba(0,0,0,.35)}}
.nat{{position:absolute;left:930px;bottom:92px;font-weight:700;font-size:40px;color:#E7F5EC;letter-spacing:1px}}
</style></head><body><div class="cena">
<div class="foto"></div><div class="fio"></div><div class="painel"></div>
<img class="logo sombra" src="file://{LOGO}">
<div class="nome"><span id="n" data-duas="{'<br>'.join(p['nome'])}">{nome}</span></div>
<div class="nat">100% NATURAL</div>
<div class="peso">{p['peso']}</div>
</div>
<script>
const n = document.getElementById('n'), W = 980, H = 210;
let t = 130; n.style.fontSize = t + 'px'; n.style.whiteSpace = 'nowrap';
while (n.offsetWidth > W && t > 92) {{ t -= 2; n.style.fontSize = t + 'px'; }}
if (n.offsetWidth > W) {{ n.innerHTML = n.dataset.duas; t = 100; n.style.fontSize = t + 'px';
  while ((n.offsetWidth > W || n.offsetHeight > H) && t > 50) {{ t -= 2; n.style.fontSize = t + 'px'; }} }}
</script></body></html>"""


def main(pid):
    p = PRODUTOS[pid]
    im = Image.open(BASE / f'{pid}.png').convert('RGB')
    x0, y0, x1, y1 = caixa_solapa(im)
    # solapa em 2000 x 1000 (a arte de impressão) e o fundo do verso (desfocado e escurecido)
    sol = im.crop((x0, y0, x1, y1)).resize((2000, 1000), Image.LANCZOS)
    fundo = ARTES / f'.{pid}-solapa-limpa.png'; sol.save(fundo)
    fv = ARTES / f'.{pid}-fundo-verso.png'
    ImageEnhance.Brightness(sol.filter(ImageFilter.GaussianBlur(3))).enhance(0.6).save(fv)
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path=CHROME); pg = b.new_page(viewport={'width': 2000, 'height': 1000})
        render(frente_html(p, fundo), ARTES / f'{pid}-frente.png', pg)
        render(verso_html(p, fv).replace(FURO, ''), ARTES / f'{pid}-verso.png', pg)
        b.close()
    # foto do saquinho: a solapa nova por cima, tudo na escala padrão
    frente = Image.open(ARTES / f'{pid}-frente.png').convert('RGB').resize((x1 - x0, y1 - y0), Image.LANCZOS)
    a_orig = np.asarray(im.crop((x0, y0, x1, y1))).astype(int)
    h, w = a_orig.shape[:2]
    yy, xx = np.mgrid[:h, :w]
    zona = ((yy < h * 0.22) & (xx > w * 0.3) & (xx < w * 0.7)) | (((yy < 40) | (yy > h - 40)) & ((xx < 40) | (xx > w - 40)))
    branco = (a_orig.min(2) > 235) & zona  # furo e cantos arredondados continuam brancos
    f = np.asarray(frente).copy(); f[branco] = 255
    im.paste(Image.fromarray(f.astype('uint8')), (x0, y0))
    k = W_SOLAPA / (x1 - x0)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    SAIDA.mkdir(exist_ok=True)
    tela = Image.new('RGB', (1200, 1440), 'white')
    tela.paste(im, ((1200 - im.width) // 2, round(60 - y0 * k)))
    tela.save(SAIDA / f'{pid}.png')
    print('ok', pid)


if __name__ == '__main__':
    main(sys.argv[1])
