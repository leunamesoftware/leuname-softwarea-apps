#!/usr/bin/env python3
"""Monta o vídeo de demonstração do Quanto Cobrar (1080×1920) a partir da gravação do app.

Como fazer (pasta de trabalho P, fora do repositório):
  1. python3 -m http.server 8772 --directory calculadora/public      (deixar rodando)
  2. NODE_PATH=$(npm root -g) node calculadora/scripts/demo/qc-gravar.cjs P   (grava o app em P/qf)
  3. python3 calculadora/scripts/demo/qc-montar.py P                  (sai P/quanto-cobrar-demo.mp4)
A API é simulada (qc-mock.cjs): conta de exemplo "Maria" com o plano Pro e as receitas já liberadas.
"""
import json, math, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont

S = Path(sys.argv[1])
APP = Path(__file__).resolve().parents[2]
FONTES = APP / 'scripts/fontes'
W, H, FPS = 1080, 1920, 30
LARANJA, ESCURO, CREME = (232, 89, 12), (28, 25, 23), (255, 237, 213)

def fonte(peso, px): return ImageFont.truetype(str(FONTES / f'Poppins-{peso}.ttf'), px)
def suave(t): t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3
def quebrar(txt, f, larg):
    linhas, at = [], ''
    for p in txt.split():
        t = (at + ' ' + p).strip()
        if f.getlength(t) > larg and at: linhas.append(at); at = p
        else: at = t
    return linhas + [at]

quadros = json.loads((S / 'qc-quadros.json').read_text())
marcas = json.loads((S / 'qc-marcas.json').read_text())
def tela_em(t):
    i = 0
    lo, hi = 0, len(quadros) - 1
    while lo <= hi:
        m = (lo + hi) // 2
        if quadros[m][0] <= t: i = m; lo = m + 1
        else: hi = m - 1
    return quadros[i][1]

# Fundo laranja com degradê (fixo)
fundo = Image.new('RGB', (W, H))
d = ImageDraw.Draw(fundo)
for y in range(H):
    k = y / H
    d.line([(0, y), (W, y)], fill=tuple(round(a + (b - a) * k) for a, b in zip((245, 120, 40), (190, 60, 8))))
# Celular: tela 612×1088 com moldura escura e cantos arredondados
TW, TH = 680, 1209
TX, TY = (W - TW) // 2, 450
B = 16
mold = Image.new('RGBA', (TW + 2 * B, TH + 2 * B), (0, 0, 0, 0))
ImageDraw.Draw(mold).rounded_rectangle((0, 0, TW + 2 * B - 1, TH + 2 * B - 1), 58, fill=(24, 20, 18, 255))
sombra = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(sombra).rounded_rectangle((TX - B + 10, TY - B + 24, TX + TW + B + 10, TY + TH + B + 24), 60, fill=(80, 20, 0, 110))
sombra = sombra.filter(ImageFilter.GaussianBlur(24))
base = fundo.convert('RGBA'); base.alpha_composite(sombra); base.alpha_composite(mold, (TX - B, TY - B)); base = base.convert('RGB')
mascara = Image.new('L', (TW, TH), 0); ImageDraw.Draw(mascara).rounded_rectangle((0, 0, TW - 1, TH - 1), 44, fill=255)

# Legendas de cada parte (aparecem em cima do celular, abaixo da busca do TikTok)
LEG = [
    ('capa', 'Receitas que vendem', 'num livro dentro do app'),
    ('busca', 'Ache a receita', 'em segundos'),
    ('receita', 'Ingredientes e', 'modo de fazer'),
    ('preco', 'O app calcula', 'quanto custou cada um'),
    ('lucro', 'E mostra quanto', 'você vai lucrar'),
]
def legenda_em(t):
    atual, ini = LEG[0], marcas['capa']
    for chave, l1, l2 in LEG:
        if marcas[chave] <= t: atual, ini = (chave, l1, l2), marcas[chave]
    return atual, ini

f1, f2 = fonte('ExtraBold', 70), fonte('Bold', 50)
def desenhar_legenda(img, l1, l2, k):
    camada = Image.new('RGBA', (W, 220), (0, 0, 0, 0)); dd = ImageDraw.Draw(camada)
    dd.text((W // 2, 40), l1, font=f1, fill=(255, 255, 255, 255), anchor='mt')
    dd.text((W // 2, 130), l2, font=f2, fill=CREME + (255,), anchor='mt')
    a = suave(k / 0.35)
    camada.putalpha(camada.getchannel('A').point(lambda v: int(v * a)))
    img.paste(camada, (0, 230 + round(30 * (1 - a))), camada)

# Abertura e fechamento
foto = Image.open(APP / 'public/img/receitas/brigadeiro-tradicional.webp').convert('RGB')
esc = max(W / foto.width, H / foto.height)
foto_fundo = foto.resize((math.ceil(foto.width * esc), math.ceil(foto.height * esc)), Image.LANCZOS)
foto_fundo = foto_fundo.crop(((foto_fundo.width - W) // 2, 0, (foto_fundo.width - W) // 2 + W, H))
foto_fundo = ImageEnhance.Brightness(foto_fundo.filter(ImageFilter.GaussianBlur(30))).enhance(0.5)
foto_grande = foto.resize((W * 2, round(foto.height * W * 2 / foto.width)), Image.LANCZOS)
logo = Image.open(APP / 'public/img/logo.webp').convert('RGBA').resize((260, 260), Image.LANCZOS)

def abertura(t, dur):
    img = foto_fundo.copy()
    z = 1 + 0.08 * t / dur
    fw, fh = foto_grande.width / z, foto_grande.height / z
    rec = foto_grande.crop((round((foto_grande.width - fw) / 2), round((foto_grande.height - fh) / 2), round((foto_grande.width + fw) / 2), round((foto_grande.height + fh) / 2))).resize((W, round(W * foto.height / foto.width)))
    img.paste(rec, (0, 260))
    d = ImageDraw.Draw(img)
    f = fonte('ExtraBold', 82)
    linhas = quebrar('Você sabe quanto cobrar no seu brigadeiro?', f, 820)
    y0 = 260 + rec.height + 30
    a = suave(t / 0.4)
    d.rounded_rectangle((60, y0, 940, y0 + 60 + len(linhas) * 96), 32, fill=LARANJA)
    for i, l in enumerate(linhas):
        d.text((500, y0 + 30 + i * 96 + round(20 * (1 - a))), l, font=f, fill='white', anchor='mt')
    return img

def fechamento(t):
    img = fundo.copy(); d = ImageDraw.Draw(img)
    a = suave(t / 0.4); dy = round(40 * (1 - a))
    img.paste(logo, ((W - 260) // 2, 300 + dy), logo)
    d.text((W // 2, 600 + dy), 'Quanto Cobrar', font=fonte('ExtraBold', 92), fill='white', anchor='mt')
    for i, l in enumerate(['Receitas que vendem', 'e o preço certo de cada uma']):
        d.text((W // 2, 730 + dy + i * 66), l, font=fonte('Bold', 54), fill=CREME, anchor='mt')
    d.rounded_rectangle((170, 920 + dy, 910, 1050 + dy), 65, fill='white')
    d.text((W // 2, 985 + dy), 'Teste grátis', font=fonte('ExtraBold', 64), fill=LARANJA, anchor='mm')
    p = 1 + 0.05 * math.sin(t * 6)
    d.text((W // 2, 1180 + dy), 'VEJA NA BIO', font=fonte('ExtraBold', round(84 * p)), fill='white', anchor='mm')
    return img

ABRE, FECHA = 2.4, 3.6
ini_app, fim_app = marcas['capa'] - 0.3, marcas['fim']
total = ABRE + (fim_app - ini_app) + FECHA
saida = S / 'quanto-cobrar-demo.mp4'
ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
                       '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', str(saida)], stdin=subprocess.PIPE)
cache = {}
for n in range(round(total * FPS)):
    t = n / FPS
    if t < ABRE:
        img = abertura(t, ABRE)
    elif t < ABRE + (fim_app - ini_app):
        ta = ini_app + (t - ABRE)
        nome = tela_em(ta)
        if nome not in cache:
            cache.clear(); cache[nome] = Image.open(S / nome).convert('RGB').resize((TW, TH), Image.LANCZOS)
        img = base.copy(); img.paste(cache[nome], (TX, TY), mascara)
        (_, l1, l2), li = legenda_em(ta)
        desenhar_legenda(img, l1, l2, ta - li)
    else:
        img = fechamento(t - ABRE - (fim_app - ini_app))
    ff.stdin.write(img.tobytes())
ff.stdin.close(); ff.wait()
print(saida, f'{total:.1f} s')
