#!/usr/bin/env python3
"""Logo Super Misto em SVG (vetor, letras convertidas em curvas) + PNGs.

Uso: python3 logo.py <pasta-saida>
Os PNGs são gerados pelo Chromium (Playwright) a partir do SVG.
"""
import sys
from pathlib import Path
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

FONTE = Path(__file__).resolve().parents[2] / 'calculadora' / 'scripts' / 'fontes' / 'Poppins-ExtraBold.ttf'
ROXO, ROXO_ESC, AMARELO, VERMELHO, BRANCO = '#5B1E8C', '#3E0F63', '#FFC21A', '#E1251B', '#FFFFFF'
font = TTFont(str(FONTE))
gs = font.getGlyphSet()
cmap = font.getBestCmap()
UPM = font['head'].unitsPerEm


def texto(s, x, y, tam, cor, espaco=0.0, inclina=-11, centro=True):
    """Texto em curvas (path), com inclinação estilo itálico; (x, y) = linha de base."""
    esc = tam / UPM
    pedacos, cx = [], 0.0
    for ch in s:
        g = gs[cmap[ord(ch)]]
        pen = SVGPathPen(gs)
        g.draw(pen)
        pedacos.append((cx, pen.getCommands()))
        cx += g.width + espaco * UPM
    largura = (cx - espaco * UPM) * esc
    x0 = x - largura / 2 if centro else x
    paths = ''.join(f'<path transform="translate({dx:.1f} 0)" d="{d}"/>' for dx, d in pedacos)
    return (f'<g fill="{cor}" transform="translate({x0:.1f} {y:.1f}) skewX({inclina}) scale({esc:.5f} {-esc:.5f})">{paths}</g>', largura)


def folha(cx, cy, comp, larg, ang, cor):
    return (f'<path transform="translate({cx} {cy}) rotate({ang})" fill="{cor}" '
            f'd="M0 0 C {larg*1.1} {-comp*0.22}, {larg*0.75} {-comp*0.7}, 0 {-comp} C {-larg*0.75} {-comp*0.7}, {-larg*1.1} {-comp*0.22}, 0 0 Z"/>'
            f'<path transform="translate({cx} {cy}) rotate({ang})" stroke="{ROXO}" stroke-width="4" stroke-linecap="round" fill="none" d="M0 -10 L 0 {-comp*0.7}"/>')


def simbolo(cx, cy, s=1.0):
    """Ramo: pimenta vermelha no centro, folhas amarelas dos lados e 3 grãos."""
    t = f'<g transform="translate({cx} {cy}) scale({s})">'
    t += folha(-18, 8, 120, 46, -38, AMARELO) + folha(18, 8, 120, 46, 38, AMARELO)
    t += folha(-52, 26, 86, 34, -72, AMARELO) + folha(52, 26, 86, 34, 72, AMARELO)
    # pimenta (corpo + cabinho verde)
    t += (f'<path fill="{VERMELHO}" d="M -16 10 C -30 -40, -12 -98, 10 -128 C 14 -96, 22 -40, 16 10 C 8 22, -8 22, -16 10 Z"/>'
          f'<path fill="#2E9E4A" d="M -16 12 C -8 26, 10 26, 16 12 C 6 16, -6 16, -16 12 Z"/>'
          f'<path stroke="#2E9E4A" stroke-width="7" stroke-linecap="round" fill="none" d="M 0 20 C 0 32, 8 40, 18 40"/>'
          f'<path fill="#FFFFFF" opacity=".35" d="M -6 -10 C -14 -40, -6 -80, 6 -104 C 0 -76, -2 -40, -6 -10 Z"/>')
    for gx, gy, r in ((-78, -40, 9), (80, -46, 9), (-62, -78, 7)):
        t += f'<circle cx="{gx}" cy="{gy}" r="{r}" fill="{AMARELO}"/>'
    return t + '</g>'


def selo(w, h, fundo=None):
    """Logo principal: selo roxo em forma de folha, contorno amarelo, ramo, SUPER / MISTO / TEMPEROS."""
    cx = w / 2
    bx, by, bw, bh = 30, 30, w - 60, h - 60
    r1, r2 = 70, 200  # cantos alternados: forma de folha
    forma = (f'M {bx+r1} {by} H {bx+bw-r2} A {r2} {r2} 0 0 1 {bx+bw} {by+r2} V {by+bh-r1} '
             f'A {r1} {r1} 0 0 1 {bx+bw-r1} {by+bh} H {bx+r2} A {r2} {r2} 0 0 1 {bx} {by+bh-r2} V {by+r1} '
             f'A {r1} {r1} 0 0 1 {bx+r1} {by} Z')
    s = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
    if fundo:
        s += f'<rect width="{w}" height="{h}" fill="{fundo}"/>'
    s += f'<path d="{forma}" fill="{ROXO}" stroke="{AMARELO}" stroke-width="16"/>'
    s += simbolo(cx, by + 190, 1.05)
    t1, _ = texto('SUPER', cx, by + 345, 118, AMARELO, espaco=0.02)
    t2, _ = texto('MISTO', cx + 6, by + 530, 210, BRANCO, espaco=0.0)
    s += t1 + t2
    fx, fy, fw, fh = cx - 190, by + 570, 380, 64
    s += f'<rect x="{fx}" y="{fy}" width="{fw}" height="{fh}" rx="32" fill="{AMARELO}"/>'
    t3, _ = texto('TEMPEROS', cx, fy + 47, 44, ROXO_ESC, espaco=0.12, inclina=0)
    return s + t3 + '</svg>'


def icone(tam=1000, fundo=AMARELO):
    """Ícone redondo (perfil da Shopee / redes): círculo roxo, ramo e SUPER MISTO."""
    c = tam / 2
    s = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {tam} {tam}" width="{tam}" height="{tam}">'
    s += f'<rect width="{tam}" height="{tam}" fill="{fundo}"/>'
    s += f'<circle cx="{c}" cy="{c}" r="{c-30}" fill="{ROXO}" stroke="{AMARELO}" stroke-width="18"/>'
    s += simbolo(c, 330, 1.25)
    t1, _ = texto('SUPER', c, 520, 120, AMARELO, espaco=0.02)
    t2, _ = texto('MISTO', c + 6, 700, 205, BRANCO)
    t3, _ = texto('TEMPEROS', c, 800, 46, AMARELO, espaco=0.14, inclina=0)
    return s + t1 + t2 + t3 + '</svg>'


def main():
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    pecas = {
        'logo-super-misto.svg': selo(1000, 720),
        'logo-super-misto-fundo-amarelo.svg': selo(1000, 720, fundo=AMARELO),
        'icone-super-misto.svg': icone(),
    }
    for nome, svg in pecas.items():
        (out / nome).write_text(svg, encoding='utf-8')
    # PNGs pelo Chromium
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
        pg = b.new_page()
        for nome, svg in pecas.items():
            w = int(svg.split('width="')[1].split('"')[0]); h = int(svg.split('height="')[1].split('"')[0])
            pg.set_viewport_size({'width': w, 'height': h})
            pg.set_content(f'<html><body style="margin:0;background:transparent">{svg}</body></html>')
            pg.screenshot(path=str(out / nome.replace('.svg', '.png')), omit_background=True)
        b.close()
    print('ok', sorted(x.name for x in out.iterdir()))


if __name__ == '__main__':
    main()
