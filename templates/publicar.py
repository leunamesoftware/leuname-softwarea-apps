#!/usr/bin/env python3
"""Publica os templates de site (rode depois de mudar qualquer template):
  - prévia na loja: leuapps/public/modelos/<id>/ (com a faixa "Modelo de demonstração");
  - arquivos que vão no ZIP do cliente: calculadora/public/_tpl/<id>/ (o servidor não deixa baixar direto);
  - lista dos arquivos para o servidor montar o ZIP: calculadora/src/templates_arquivos.js.
Uso: python3 templates/publicar.py"""
import json
import shutil
from pathlib import Path

raiz = Path(__file__).resolve().parent
repo = raiz.parent
catalogo = json.loads((raiz / 'catalogo.json').read_text())
leia = (raiz / 'LEIA-ME-PRIMEIRO.html').read_text()
lista = {}
for t in catalogo:
    tid, site = t['id'], raiz / t['id'] / 'site'
    demo = repo / 'leuapps' / 'public' / 'modelos' / tid
    shutil.rmtree(demo, ignore_errors=True)
    shutil.copytree(site, demo)
    cfg = demo / 'configuracao.js'
    cfg.write_text(cfg.read_text().replace('avisoDemonstracao: false', 'avisoDemonstracao: true'))
    venda = repo / 'calculadora' / 'public' / '_tpl' / tid
    shutil.rmtree(venda, ignore_errors=True)
    shutil.copytree(site, venda / 'site')
    fotos = (raiz / tid / 'fotos.html').read_text() if (raiz / tid / 'fotos.html').exists() else ''
    (venda / 'LEIA-ME-PRIMEIRO.html').write_text(leia.replace('{{NOME}}', t['nome']).replace('{{FOTOS}}', fotos))
    lista[tid] = sorted(str(p.relative_to(venda)) for p in venda.rglob('*') if p.is_file())
    print(tid, len(lista[tid]), 'arquivos')
saida = repo / 'calculadora' / 'src' / 'templates_arquivos.js'
saida.write_text('// Gerado por templates/publicar.py — não edite à mão.\n'
                 'export const TEMPLATES = ' + json.dumps({t['id']: {**t, 'arquivos': lista[t['id']]} for t in catalogo}, ensure_ascii=False, indent=1) + ';\n')
print('lista em', saida)
