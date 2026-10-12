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
leia_txt = (raiz / 'LEIA-ME.txt').read_text()
lista = {}


def demo_unica(site):
    """VER-DEMONSTRACAO.html: o site inteiro num arquivo só (estilos, programa e fotos dentro).
    Abre em qualquer lugar, até no celular direto do ZIP, sem precisar das pastas."""
    import base64, mimetypes, re
    def dado(rel):
        f = site / rel
        if not f.is_file():
            return rel
        tipo = mimetypes.guess_type(str(f))[0] or ('image/webp' if f.suffix == '.webp' else 'application/octet-stream')
        return f'data:{tipo};base64,' + base64.b64encode(f.read_bytes()).decode()
    fotos = lambda txt: re.sub(r'imagens/[\w.\-]+', lambda m: dado(m.group(0)), txt)
    html = (site / 'index.html').read_text()
    def css_inline(m):
        f = site / m.group(1)
        return '<style>\n' + fotos(f.read_text()).replace('../imagens/', 'imagens/').replace('</style', '<\\/style') + '\n</style>' if f.is_file() else m.group(0)
    def js_inline(m):
        f = site / m.group(1)
        if not f.is_file(): return m.group(0)
        t = f.read_text()
        if f.name == 'configuracao.js': t = fotos(t).replace('avisoDemonstracao: false', 'avisoDemonstracao: true')
        return '<script>\n' + t.replace('</script', '<\\/script') + '\n</script>'
    html = re.sub(r'<link rel="stylesheet" href="([^":]+\.css)">', css_inline, html)
    html = re.sub(r'<script src="([^":]+\.js)"></script>', js_inline, html)
    return fotos(html)

for t in catalogo:
    tid, site = t['id'], raiz / t['id'] / 'site'
    demo = repo / 'leuapps' / 'public' / 'modelos' / tid
    shutil.rmtree(demo, ignore_errors=True)
    shutil.copytree(site, demo)
    cfg = demo / 'configuracao.js'
    cfg.write_text(cfg.read_text().replace('avisoDemonstracao: false', 'avisoDemonstracao: true'))
    venda = repo / 'calculadora' / 'public' / '_tpl' / tid
    shutil.rmtree(venda, ignore_errors=True)
    shutil.copytree(site, venda / 'site-completo')
    import html as _h
    inclui = ''.join(f'        <li><span>{_h.escape(r)}</span></li>\n' for r in t.get('recursos', []))
    (venda / 'site-completo' / 'LEIA-ME.txt').write_text(leia_txt.replace('{{NOME}}', t['nome'].replace('Site pronto: ', ''))
        .replace('{{INCLUI_TXT}}', '\n'.join('· ' + r for r in t.get('recursos', []))))
    (venda / 'VER-DEMONSTRACAO.html').write_text(demo_unica(site))
    fotos = (raiz / tid / 'fotos.html').read_text() if (raiz / tid / 'fotos.html').exists() else ''
    (venda / 'LEIA-ME-PRIMEIRO.html').write_text(leia.replace('{{NOME}}', t['nome'].replace('Site pronto: ', '')).replace('{{FOTOS}}', fotos).replace('{{INCLUI}}', inclui.rstrip())
        .replace('{{PERSONALIZAR}}', (raiz / '_conversor' / ('personalizar-html.html' if t.get('edicao') == 'html' else 'personalizar-config.html')).read_text()))
    lista[tid] = sorted(str(p.relative_to(venda)) for p in venda.rglob('*') if p.is_file())
    print(tid, len(lista[tid]), 'arquivos')
saida = repo / 'calculadora' / 'src' / 'templates_arquivos.js'
saida.write_text('// Gerado por templates/publicar.py — não edite à mão.\n'
                 'export const TEMPLATES = ' + json.dumps({t['id']: {**t, 'arquivos': lista[t['id']]} for t in catalogo}, ensure_ascii=False, indent=1) + ';\n')
print('lista em', saida)
