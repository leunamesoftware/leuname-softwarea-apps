#!/usr/bin/env python3
"""Vídeo curto em pé (1080×1920, ~20 s) de uma receita, para o TikTok.

Uso: python3 scripts/video_receita.py <id-da-receita> [saida.mp4]

Usa a foto da receita (public/img/receitas/<id>.webp) com zoom lento e mostra:
nome → o que vai (só nomes) → passos curtos → "receita completa no canal, veja na bio".
Sem quantidades: elas ficam no canal e no app. O vídeo sai sem música — a música
se escolhe dentro do TikTok (as do próprio TikTok não dão problema de direitos).
Os passos curtos vêm de canal.passosCurtos; sem eles, usa o começo de cada passo do canal.
Todo texto fica na faixa que o TikTok não cobre (y 260–1380, x < 940).
"""
import json, math, re, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
FONTES = Path(__file__).resolve().parent / 'fontes'
W, H, FPS = 1080, 1920, 30
LARANJA, ESCURO, CREME = (232, 89, 12), (28, 25, 23), (255, 237, 213)
FOTO_Y, FOTO_H = 290, 720  # a foto ocupa y 290–1010; os textos vão de 1040 a 1380


def fonte(peso, px):
    return ImageFont.truetype(str(FONTES / f'Poppins-{peso}.ttf'), px)


def quebrar(texto, f, largura):
    linhas, atual = [], ''
    for p in texto.split():
        tenta = (atual + ' ' + p).strip()
        if f.getlength(tenta) > largura and atual:
            linhas.append(atual); atual = p
        else:
            atual = tenta
    return linhas + [atual]


def suave(t):  # 0→1 com freio no fim
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def passos_curtos(r):
    c = r.get('canal', {})
    if c.get('passosCurtos'):
        return c['passosCurtos']
    curtos = []
    for p in c.get('preparo', []):
        s = re.split(r'(?<=[.!?])\s', p)[0].rstrip('.')
        if len(s) > 70:
            s = s.split(',')[0]
        curtos.append(s)
    return curtos[:6]


def itens(r):
    vistos, saida = set(), []
    for i in r.get('ingredientes', []):
        n = re.sub(r'\s*\(.*?\)', '', i['nome'])
        n = re.sub(r'\s+para\s.*$', '', n, flags=re.I).strip()
        if n and n.lower() not in vistos:
            vistos.add(n.lower()); saida.append(n)
    return saida


class Video:
    def __init__(self, r):
        self.r = r
        foto = Image.open(RAIZ / 'public/img/receitas' / f"{r['id']}.webp").convert('RGB')
        escala = max(W / foto.width, H / foto.height)
        fundo = foto.resize((math.ceil(foto.width * escala), math.ceil(foto.height * escala)), Image.LANCZOS)
        fundo = fundo.crop(((fundo.width - W) // 2, (fundo.height - H) // 2, (fundo.width - W) // 2 + W, (fundo.height - H) // 2 + H))
        self.fundo = ImageEnhance.Brightness(fundo.filter(ImageFilter.GaussianBlur(40))).enhance(0.45)
        # Foto ampliada uma vez (2×) para o zoom lento não ficar serrilhado.
        self.foto = foto.resize((W * 2, round(foto.height * W * 2 / foto.width)), Image.LANCZOS)
        self.passos = passos_curtos(r)
        self.itens = itens(r)
        n_itens = len(self.itens)
        self.cenas = [('nome', 2.6), ('itens', 1.2 + n_itens * 0.3 + 1.4)] + \
                     [('passo', 2.4)] * len(self.passos) + [('fim', 3.6)]
        self.total = sum(d for _, d in self.cenas)

    def foto_zoom(self, img, t):
        z = 1 + 0.14 * (t / self.total)                     # zoom bem lento o vídeo todo
        fw, fh = self.foto.width / z, min(self.foto.height, FOTO_H * 2) / z
        x = (self.foto.width - fw) * (0.3 + 0.4 * t / self.total)  # e um leve passeio para o lado
        y = (self.foto.height - fh) / 2
        recorte = self.foto.crop((round(x), round(y), round(x + fw), round(y + fh))).resize((W, FOTO_H), Image.BILINEAR)
        img.paste(recorte, (0, FOTO_Y))

    def cartao(self, d, y, alto, cor, raio=32):
        d.rounded_rectangle((60, y, 940, y + alto), raio, fill=cor)

    def quadro(self, t):
        img = self.fundo.copy()
        ini = 0
        for nome, dur in self.cenas:
            if t < ini + dur or nome == 'fim':
                break
            ini += dur
        k = t - ini  # tempo dentro da cena
        idx = 0
        if nome == 'passo':  # os passos têm a mesma duração: acha qual é pelo tempo
            antes = sum(d for n, d in self.cenas if n in ('nome', 'itens'))
            idx = int((t - antes) // 2.4)
            k = (t - antes) - idx * 2.4
        if nome != 'itens':
            self.foto_zoom(img, t)
        d = ImageDraw.Draw(img)
        sobe = lambda a: round(60 * (1 - suave(a / 0.35)))  # entra subindo em 0,35 s

        if nome == 'nome':
            f = fonte('ExtraBold', 92)
            linhas = quebrar(self.r['nome'].upper(), f, 760)
            alto = len(linhas) * 104 + 120
            y = 1040 + sobe(k)
            self.cartao(d, y, alto, LARANJA)
            for i, l in enumerate(linhas):
                d.text((500, y + 40 + i * 104), l, font=f, fill='white', anchor='mt')
            d.text((500, y + alto - 30), 'que vende rápido', font=fonte('SemiBold', 44), fill=CREME, anchor='mb')

        elif nome == 'itens':
            px = 58
            while px > 36:
                f = fonte('Bold', px)
                blocos = [quebrar(i, f, 680) for i in self.itens]
                alto = 170 + sum(len(b) for b in blocos) * px * 1.32 + 50
                if alto <= 1080:
                    break
                px -= 4
            y0 = 290 + max(0, (1090 - alto) / 2)
            self.cartao(d, y0, alto, 'white')
            d.text((120, y0 + 50), 'O que vai', font=fonte('ExtraBold', 68), fill=ESCURO)
            d.rectangle((120, y0 + 140, 240, y0 + 148), fill=LARANJA)
            y = y0 + 180
            for n, b in enumerate(blocos):
                a = k - 0.5 - n * 0.3  # um por vez
                if a > 0:
                    opac = suave(a / 0.25)
                    cor = tuple(round(255 - (255 - c) * opac) for c in ESCURO)
                    dx = round(30 * (1 - opac))
                    d.ellipse((128 + dx, y + px * 0.45, 128 + dx + px * 0.32, y + px * 0.45 + px * 0.32), fill=LARANJA)
                    for l in b:
                        d.text((180 + dx, y), l, font=f, fill=cor)
                        y += px * 1.32
                else:
                    y += len(b) * px * 1.32

        elif nome == 'passo':
            f = fonte('Bold', 54)
            texto = self.passos[idx]
            linhas = quebrar(texto, f, 780)
            while len(linhas) > 3:
                f = fonte('Bold', f.size - 4); linhas = quebrar(texto, f, 780)
            alto = 110 + len(linhas) * round(f.size * 1.28) + 30
            y = 1040 + sobe(k)
            self.cartao(d, y, alto, 'white')
            d.text((100, y + 34), f'PASSO {idx + 1}', font=fonte('ExtraBold', 40), fill=LARANJA)
            for i, l in enumerate(linhas):
                d.text((100, y + 100 + i * round(f.size * 1.28)), l, font=f, fill=ESCURO)

        else:  # fim: chamada para o canal
            y = 300 + sobe(k)
            self.cartao(d, y, 1060, LARANJA)
            f1, f2 = fonte('Bold', 56), fonte('ExtraBold', 72)
            yy = y + 90
            for l in quebrar('Quantidades certas, quanto rende e quanto cobrar por unidade', f1, 760):
                d.text((500, yy), l, font=f1, fill='white', anchor='mt'); yy += 74
            yy += 50
            for l in quebrar('Receita completa no canal do WhatsApp', f2, 760):
                d.text((500, yy), l, font=f2, fill='white', anchor='mt'); yy += 92
            pulso = 1 + 0.06 * math.sin(k * 6)
            fb = fonte('ExtraBold', round(76 * pulso))
            d.rounded_rectangle((180, y + 820, 820, y + 980), 80, fill='white')
            d.text((500, y + 900), 'VEJA NA BIO', font=fb, fill=LARANJA, anchor='mm')
        return img


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    rid = sys.argv[1]
    saida = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(f'{rid}.mp4')
    receitas = json.loads((RAIZ / 'src/receitas.json').read_text())
    r = next((x for x in receitas if x['id'] == rid), None)
    if not r:
        sys.exit(f'Receita não encontrada: {rid}')
    v = Video(r)
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error',
                           '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest',
                           '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
                           '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', str(saida)], stdin=subprocess.PIPE)
    for n in range(round(v.total * FPS)):
        ff.stdin.write(v.quadro(n / FPS).tobytes())
    ff.stdin.close()
    if ff.wait() != 0:
        sys.exit('ffmpeg falhou')
    print(f'{saida} ({v.total:.1f} s)')


if __name__ == '__main__':
    main()
