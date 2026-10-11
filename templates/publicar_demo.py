#!/usr/bin/env python3
"""Copia um template para a prévia da loja: leuapps/public/modelos/<id>/ (com a faixa "Modelo de demonstração").
Uso: python3 templates/publicar_demo.py agencia-de-viagens"""
import shutil
import sys
from pathlib import Path

raiz = Path(__file__).resolve().parent
tid = sys.argv[1]
orig, dest = raiz / tid / 'site', raiz.parent / 'leuapps' / 'public' / 'modelos' / tid
shutil.rmtree(dest, ignore_errors=True)
shutil.copytree(orig, dest)
cfg = dest / 'configuracao.js'
cfg.write_text(cfg.read_text().replace('avisoDemonstracao: false', 'avisoDemonstracao: true'))
print('prévia em', dest)
