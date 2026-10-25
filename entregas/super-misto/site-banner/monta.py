#!/usr/bin/env python3
"""Banner do topo do site: fundo do ChatGPT + logo + frase + nome de cada tempero nas faixas."""
from pathlib import Path
from playwright.sync_api import sync_playwright
AQUI = Path(__file__).resolve().parent
SM = AQUI.parent
F = SM / 'fontes'; P = SM.parents[1] / 'calculadora' / 'scripts' / 'fontes'
html = f"""<html><head><meta charset="utf-8"><style>
@font-face{{font-family:Script;src:url('file://{F}/kaushanscript-KaushanScript-Regular.ttf')}}
@font-face{{font-family:P;font-weight:700;src:url('file://{P}/Poppins-Bold.ttf')}}
@font-face{{font-family:P;font-weight:800;src:url('file://{P}/Poppins-ExtraBold.ttf')}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1376px;height:768px;overflow:hidden;font-family:P}}
.c{{position:relative;width:1376px;height:768px;background:url('file://{AQUI}/fundo.jpg') 0 0/1376px 768px}}
.esq{{position:absolute;left:0;top:0;width:688px;height:768px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
  background:radial-gradient(circle at 50% 42%,rgba(255,255,255,.07),rgba(0,0,0,0) 60%)}}
.logo{{width:430px;filter:drop-shadow(0 10px 18px rgba(0,0,0,.45))}}
.frase{{font-family:Script;color:#fff;font-size:58px;line-height:1.12;margin-top:22px;text-shadow:0 4px 10px rgba(0,0,0,.4)}}
.frase b{{color:#E3BE72;font-weight:400}}
.selo{{margin-top:26px;display:flex;gap:14px}}
.selo span{{border:2px solid #E3BE72;color:#F6E7C4;border-radius:40px;padding:8px 20px;font-weight:700;font-size:17px;letter-spacing:1.5px}}
.rot{{position:absolute;left:688px;width:44px;display:flex;align-items:center;justify-content:center}}
.rot span{{transform:rotate(-90deg);white-space:nowrap;color:#fff;font-weight:800;font-size:13px;letter-spacing:2px;background:rgba(74,13,22,.85);padding:5px 12px;border-radius:20px}}
</style></head><body><div class="c">
<div class="esq"><img class="logo" src="file://{SM}/logo-bordo/logo-supermisto.png">
<div class="frase">Tempero de verdade.<br><b>Sabor de casa.</b></div>
<div class="selo"><span>100% NATURAL</span><span>SEM CONSERVANTES</span></div></div>
<div class="rot" style="top:0;height:188px"><span>COLORAU</span></div>
<div class="rot" style="top:190px;height:192px"><span>ORÉGANO</span></div>
<div class="rot" style="top:384px;height:192px"><span>CÚRCUMA</span></div>
<div class="rot" style="top:578px;height:190px"><span>PIMENTA-DO-REINO</span></div>
</div></body></html>"""
t = AQUI / '.b.html'; t.write_text(html, encoding='utf-8')
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg = b.new_page(viewport={'width': 1376, 'height': 768}, device_scale_factor=2)
    pg.goto(f'file://{t}'); pg.wait_for_timeout(500); pg.screenshot(path=str(AQUI / 'banner.png')); b.close()
t.unlink(); print('ok')
