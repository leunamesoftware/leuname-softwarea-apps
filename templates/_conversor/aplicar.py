#!/usr/bin/env python3
"""Converte um site antigo (pacotes-hotmart/<nome>/site-completo, em espanhol) para o nosso padrão:
português, fotos em imagens/, configuracao.js (contatos e licença) e js/site.js (WhatsApp, licença,
demonstração e crédito). Uso: python3 aplicar.py <pasta site-completo antiga> <traducao.json> <id do template>

traducao.json:
  textos  {espanhol: português}   textos visíveis e atributos (alt, placeholder, title, aria-label…)
  js      {espanhol: português}   textos dentro do js/main.js
  bruto   [[antes, depois], …]    trocas diretas no html/css/js (preços do catálogo, idioma, moeda…)
  config  {nome, complemento, whatsapp, mensagemWhatsapp, telefone, email, endereco, horario}
  marcar  {texto exato: chave}    textos que viram editáveis pelo configuracao.js (ex.: telefone)
"""
import json, re, shutil, sys
from pathlib import Path

origem, trad, tid = Path(sys.argv[1]), json.load(open(sys.argv[2], encoding='utf-8')), sys.argv[3]
raiz = Path(__file__).resolve().parent.parent
destino = raiz / tid / 'site'
shutil.rmtree(destino, ignore_errors=True)
shutil.copytree(origem, destino)
(destino / 'LEEME.txt').unlink(missing_ok=True)
if (destino / 'img').exists():
    (destino / 'img').rename(destino / 'imagens')

def norm(t): return ' '.join(t.split())

T = {norm(k): v for k, v in trad.get('textos', {}).items()}
faltando = set()

def troca_texto(m):
    bruto = m.group(0)
    n = norm(bruto)
    if not n or not re.search('[A-Za-zÀ-ú€]', n): return bruto
    if n in T:
        ini = bruto[:len(bruto) - len(bruto.lstrip())]; fim = bruto[len(bruto.rstrip()):]
        return ini + T[n] + fim
    faltando.add(n); return bruto

def troca_attr(m):
    k, aspas, v = m.group(1), m.group(2), m.group(3)
    n = norm(v)
    if n in T: return f'{k}={aspas}{T[n]}{aspas}'
    if re.search('[A-Za-zÀ-ú]{2}', v) and not v.startswith(('http', 'width=')): faltando.add(n)
    return m.group(0)

html = (destino / 'index.html').read_text(encoding='utf-8')
for a, b in trad.get('bruto', []): html = html.replace(a, b)
# Lista de produtos do carrinho (datosCatalogo): nome, unidade e preço em R$ (trad["precos"]: {nome em espanhol: preço})
def troca_catalogo(m):
    itens = json.loads(m.group(2))
    for it in itens:
        if it.get('nombre') in trad.get('precos', {}): it['precio'] = trad['precos'][it['nombre']]
        for k in ('nombre', 'unidad'):
            if it.get(k): it[k] = T.get(norm(it[k]), trad.get('unidades', {}).get(it[k], it[k]))
    return m.group(1) + json.dumps(itens, ensure_ascii=False) + m.group(3)
html = re.sub(r'(<script type="application/json" id="datosCatalogo">)(.*?)(</script>)', troca_catalogo, html, flags=re.S)
html = html.replace('img/', 'imagens/').replace('img\\/', 'imagens\\/').replace('lang="es"', 'lang="pt-BR"')
# Texto entre as tags (fora de script/style/svg) e atributos com texto.
partes = re.split(r'(<script\b.*?</script>|<style\b.*?</style>|<svg\b.*?</svg>)', html, flags=re.S | re.I)
for i in range(0, len(partes), 2):
    p = re.sub(r'\b(placeholder|alt|title|aria-label|content)=(["\'])(.*?)\2', troca_attr, partes[i])
    partes[i] = re.sub(r'(?:(?<=>)|^)[^<>]+(?=<|$)', troca_texto, p)
html = ''.join(partes)
# <title> também
html = re.sub(r'<title>(.*?)</title>', lambda m: '<title>' + T.get(norm(m.group(1)), m.group(1)) + '</title>', html, flags=re.S)

# Textos que o cliente troca pelo configuracao.js
for texto, chave in trad.get('marcar', {}).items():
    html = re.sub(r'(?<=>)(\s*)' + re.escape(texto) + r'(\s*)(?=<)', lambda m: f'{m.group(1)}<span data-cfg="{chave}">{texto}</span>{m.group(2)}', html)

# Aviso de demonstração: só aparece na demonstração
html = re.sub(r'<div class="aviso-demo"[^>]*>.*?</div>', '<div class="aviso-demo" id="avisoDemo" hidden>Modelo de demonstração · nomes, preços e contatos fictícios · LeuName Softwares</div>', html, count=1, flags=re.S)
# Aviso que só aparece se o index.html abrir sem os estilos (direto do ZIP ou pelo celular)
html = re.sub(r'(<body[^>]*>)', r'\1\n<div class="sem-estilo" style="font:16px/1.5 system-ui,sans-serif;padding:18px 20px;background:#fff4d6;color:#3a2a00;border-bottom:2px solid #e0b64a"><strong>O site abriu sem as cores e as fotos.</strong> Isso acontece quando o arquivo é aberto direto do ZIP ou pelo celular. Para ver o site completo, abra o <b>VER-DEMONSTRACAO.html</b>. Para publicar, envie a pasta <b>site-completo</b> para a sua hospedagem.</div>', html, count=1)
# configuracao.js no <head> e o nosso js/site.js antes do main.js
html = html.replace('</head>', '<script src="configuracao.js"></script>\n</head>', 1)
if '<script src="js/main.js"></script>' in html:
    html = html.replace('<script src="js/main.js"></script>', '<script src="js/site.js"></script>\n<script src="js/main.js"></script>', 1)
else:
    html = html.replace('</body>', '<script src="js/site.js"></script>\n</body>', 1)
for a, b in trad.get('regex', []): html = re.sub(a, b, html, flags=re.S)
(destino / 'index.html').write_text(html, encoding='utf-8')
extras = raiz / '_conversor' / f'{tid}-imagens'
if extras.exists():
    for f in extras.iterdir(): shutil.copy(f, destino / 'imagens' / f.name)

for css in (destino / 'css').glob('*.css'):
    c = css.read_text(encoding='utf-8').replace('../img/', '../imagens/').replace('img/', 'imagens/')
    for a, b in trad.get('bruto_css', []): c = c.replace(a, b)
    css.write_text(c + '\n.aviso-demo[hidden]{display:none!important}\n.sem-estilo{display:none!important}\n' + trad.get('css_extra', ''), encoding='utf-8')

mainjs = destino / 'js' / 'main.js'
if mainjs.exists():
    j = mainjs.read_text(encoding='utf-8').replace('img/', 'imagens/')
    for a, b in sorted(trad.get('js', {}).items(), key=lambda x: -len(x[0])): j = j.replace(a, b)
    for a, b in trad.get('bruto_js', []): j = j.replace(a, b)
    mainjs.write_text(j, encoding='utf-8')

# configuracao.js
C = trad['config']
def linha(k, v, nota): return f'  {k}: {json.dumps(v, ensure_ascii=False)},' + (' ' * max(1, 44 - len(k) - len(json.dumps(v, ensure_ascii=False)))) + f'// {nota}\n'
cfg = '''/* =====================================================================
   CONFIGURAÇÃO DO SEU SITE
   ---------------------------------------------------------------------
   Aqui você troca os CONTATOS da empresa: nome, WhatsApp, telefone,
   e-mail, endereço e horário. Eles mudam no site inteiro sozinhos.
   Abra no Bloco de Notas, troque só o que está ENTRE ASPAS e salve.
   Textos, produtos e preços ficam no index.html (veja o LEIA-ME).
   ===================================================================== */

window.SITE = {

'''
cfg += linha('nome', C['nome'], 'nome da empresa (topo, rodapé e pedidos)')
cfg += linha('whatsapp', C['whatsapp'], 'DDI 55 + DDD + número, só números')
cfg += linha('mensagemWhatsapp', C.get('mensagemWhatsapp', 'Olá! Vi o site e quero mais informações.'), 'mensagem que já vem escrita')
for k, nota in [('telefone', 'aparece no site'), ('email', 'aparece no site'), ('endereco', 'aparece no site'), ('horario', 'aparece no site')]:
    if k in C: cfg += linha(k, C[k], nota)
cfg += '''
  /* ---------- NÃO MEXA DAQUI PARA BAIXO ---------- */
  avisoDemonstracao: false,
  // Licença deste site (vem preenchida no ZIP da sua compra). Vale para 1 empresa e 1 domínio.
  // O crédito "Desenvolvido por LeuName Softwares" no rodapé faz parte da licença.
  licenca: ""
};
'''
(destino / 'configuracao.js').write_text(cfg, encoding='utf-8')

# js/site.js = núcleo comum (copiado do template da hamburgueria: demonstração + crédito) + ligação com o configuracao.js
nucleo = (raiz / '_conversor' / 'nucleo.js').read_text(encoding='utf-8')
(destino / 'js' / 'site.js').write_text(nucleo, encoding='utf-8')

print(f'{tid}: convertido em {destino}')
if faltando:
    print(f'  {len(faltando)} textos sem tradução:')
    for f in sorted(faltando): print('   -', f[:110])
