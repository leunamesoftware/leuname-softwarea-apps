#!/usr/bin/env python3
"""Gera os banners da tela inicial do Pedêê (estilo iFood): fundo em duas cores com curva, foto do prato em círculo e texto.
Uso (na pasta leuburger): python3 scripts/banners.py  → public/img/banners/*.webp"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FOTOS = os.path.join(RAIZ, 'calculadora/public/img/receitas')
FONTES = os.path.join(RAIZ, 'calculadora/scripts/fontes')
SAIDA = os.path.join(os.path.dirname(__file__), '..', 'public/img/banners')
W, H = 960, 450
F = lambda n, s: ImageFont.truetype(os.path.join(FONTES, n), s)

BANNERS = [
    ('fome', 'hamburguer-artesanal', (226, 26, 12), (150, 10, 10), 'bateu a fome?', 'Pedêê!', 'lanches, pizza e açaí perto de você'),
    ('pizza', 'mini-pizza', (255, 122, 0), (230, 70, 10), 'pizza', 'quentinha', 'das pizzarias da sua cidade'),
    ('mapa', 'esfiha-carne', (5, 110, 70), (2, 80, 52), 'acompanhe', 'no mapa', 'veja o entregador chegando'),
    ('acai', 'sorvete-coco', (124, 58, 237), (88, 28, 180), 'açaí e', 'sorvetes', 'geladinhos para o calor'),
    ('salgados', 'coxinha-frango', (200, 30, 40), (140, 12, 22), 'salgados', 'fresquinhos', 'coxinha, kibe, risole e mais'),
    ('pagamento', 'pastel-carne', (255, 150, 30), (240, 96, 20), 'pague', 'na entrega', 'Pix, cartão ou dinheiro'),
]

def foto(nome):
    for p in (FOTOS, os.path.join(FOTOS, 'mini')):
        f = os.path.join(p, nome + '.webp')
        if os.path.isfile(f): return Image.open(f).convert('RGB')
    raise SystemExit('sem foto ' + nome)

def banner(nome, img, cor1, cor2, linha1, linha2, sub):
    im = Image.new('RGB', (W, H), cor1); d = ImageDraw.Draw(im)
    # Parte esquerda mais escura com borda curva (como o iFood).
    d.ellipse([-W * 0.55, -H * 0.6, W * 0.52, H * 1.6], fill=cor2)
    # Foto do prato em círculo com sombra.
    p = foto(img); lado = min(p.size); p = p.crop(((p.width - lado) // 2, (p.height - lado) // 2, (p.width + lado) // 2, (p.height + lado) // 2)).resize((380, 380), Image.LANCZOS)
    m = Image.new('L', (380, 380), 0); ImageDraw.Draw(m).ellipse([0, 0, 379, 379], fill=255)
    sombra = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sombra).ellipse([58, 52, 58 + 392, 52 + 392], fill=(0, 0, 0, 110))
    im = Image.alpha_composite(im.convert('RGBA'), sombra.filter(ImageFilter.GaussianBlur(14))).convert('RGB')
    borda = Image.new('L', (396, 396), 0); ImageDraw.Draw(borda).ellipse([0, 0, 395, 395], fill=255)
    im.paste((255, 255, 255), (42, 27), borda); im.paste(p, (50, 35), m)
    d = ImageDraw.Draw(im)
    # Texto à direita.
    x0, x1 = 500, W - 40
    def centro(t, f, y, cor=(255, 255, 255)):
        w = d.textlength(t, font=f); d.text((x0 + (x1 - x0 - w) / 2, y), t, font=f, fill=cor)
    centro(linha1, F('Poppins-Bold.ttf', 52), 70)
    tam = 96
    while d.textlength(linha2, font=F('Poppins-ExtraBold.ttf', tam)) > x1 - x0 and tam > 50: tam -= 4
    centro(linha2, F('Poppins-ExtraBold.ttf', tam), 130)
    # Linhas finas dos lados do subtítulo, como no iFood.
    fs = F('Poppins-SemiBold.ttf', 30); w = d.textlength(sub, font=fs)
    while w > x1 - x0 - 20: fs = F('Poppins-SemiBold.ttf', fs.size - 2); w = d.textlength(sub, font=fs)
    centro(sub, fs, 300)
    d.rounded_rectangle([x0 + (x1 - x0) / 2 - 110, 358, x0 + (x1 - x0) / 2 + 110, 410], radius=26, fill=(255, 255, 255))
    pf = F('Poppins-Bold.ttf', 26); t = 'Peça agora'; d.text((x0 + (x1 - x0 - d.textlength(t, font=pf)) / 2, 367), t, font=pf, fill=cor2)
    im.save(os.path.join(SAIDA, nome + '.webp'), quality=74, method=6)

os.makedirs(SAIDA, exist_ok=True)
for b in BANNERS: banner(*b)
print('banners:', len(BANNERS))
