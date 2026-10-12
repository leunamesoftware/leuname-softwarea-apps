#!/usr/bin/env python3
"""Extrai os textos visíveis (e atributos) de um site antigo em espanhol para traduzir.
Uso: python3 extrair.py <pasta site-completo> > textos.json"""
import sys, json, re
from html.parser import HTMLParser
pasta = sys.argv[1]
html = open(pasta + '/index.html', encoding='utf-8').read()
textos = []
class P(HTMLParser):
    pula = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'svg'): self.pula += 1
        for k, v in attrs:
            if k in ('placeholder', 'alt', 'title', 'aria-label', 'content', 'value') and v and re.search('[A-Za-zÀ-ú]{2}', v) and not v.startswith(('http', 'width=')):
                textos.append(v)
    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'svg') and self.pula: self.pula -= 1
    def handle_data(self, d):
        t = ' '.join(d.split())
        if not self.pula and re.search('[A-Za-zÀ-ú€]', t): textos.append(t)
P().feed(html)
js = open(pasta + '/js/main.js', encoding='utf-8').read() if __import__('os').path.exists(pasta + '/js/main.js') else ''
for m in re.finditer(r"'((?:[^'\\\n]|\\.)*[A-Za-zÀ-ú]{3}(?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*[A-Za-zÀ-ú]{3}(?:[^\"\\\n]|\\.)*)\"|`([^`]*[A-Za-zÀ-ú]{3}[^`]*)`", js):
    s = m.group(1) or m.group(2) or m.group(3)
    if re.search(r'\s', s) or re.search('[áéíóúñ¿¡]', s): textos.append('JS:' + s)
vistos, out = set(), []
for t in textos:
    if t not in vistos: vistos.add(t); out.append(t)
json.dump(out, sys.stdout, ensure_ascii=False, indent=0)
