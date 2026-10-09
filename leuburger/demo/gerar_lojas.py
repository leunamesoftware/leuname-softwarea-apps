#!/usr/bin/env python3
"""Gera as lojas de demonstração de Xerém / Duque de Caxias (banner, logo, cardápio com fotos e avaliações)
e grava no fim de demo/lojas-demo.sql (tudo INSERT OR IGNORE). Para apagar tudo: demo/remover-demo.sql.
Uso (na pasta leuburger): python3 demo/gerar_lojas.py"""
import io, os, uuid, random
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
REC = os.path.join(RAIZ, 'calculadora/public/img/receitas')
PUB = os.path.join(RAIZ, 'leuburger/public/img')
SQL = os.path.join(os.path.dirname(__file__), 'lojas-demo.sql')
MARCA = '-- ===== XEREM-DEMO ====='
FONTE = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
NS = uuid.UUID('6d1f0c52-3a54-4a43-9e6e-1c1d0c0de0de')
uid = lambda *p: str(uuid.uuid5(NS, '|'.join(p)))
q = lambda s: "'" + str(s).replace("'", "''") + "'"
AGORA = '2026-10-09T12:00:00.000Z'

def foto(nome):
    for pasta in (REC, os.path.join(REC, 'mini'), PUB):
        p = os.path.join(pasta, nome + '.webp')
        if os.path.isfile(p): return Image.open(p).convert('RGB')
    raise SystemExit('foto não encontrada: ' + nome)

def webp(im, qual=72, max_bytes=40000):
    # O banco aceita ~100 KB por comando: reduz a qualidade até a foto caber.
    while True:
        b = io.BytesIO(); im.save(b, 'WEBP', quality=qual, method=6)
        if len(b.getvalue()) <= max_bytes or qual <= 25: return b.getvalue()
        qual -= 7

def capa(nome, cor):
    im = foto(nome); w, h = im.size
    alvo = 2.4  # largura/altura do banner
    ch = int(w / alvo); y = max(0, int((h - ch) * 0.45)); im = im.crop((0, y, w, y + ch)).resize((720, int(720 / alvo)), Image.LANCZOS)
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for yy in range(im.height):  # sombra suave embaixo, onde entra o logo
        a = int(150 * max(0, (yy - im.height * 0.45) / (im.height * 0.55)) ** 1.6); d.line([(0, yy), (im.width, yy)], fill=(0, 0, 0, a))
    return Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB')

def logo(sigla, cor, cor2):
    S = 256; im = Image.new('RGB', (S, S)); d = ImageDraw.Draw(im)
    for y in range(S):
        t = y / S; d.line([(0, y), (S, y)], fill=tuple(int(cor[i] * (1 - t) + cor2[i] * t) for i in range(3)))
    f = ImageFont.truetype(FONTE, 104 if len(sigla) < 3 else 84); w = d.textlength(sigla, font=f)
    d.text(((S - w) / 2, S / 2 - 66), sigla, font=f, fill='white')
    d.ellipse([S / 2 - 6, S - 52, S / 2 + 6, S - 40], fill=(255, 255, 255))
    return im

def prod_foto(nome):
    im = foto(nome); w, h = im.size; l = min(w, h); im = im.crop(((w - l) // 2, (h - l) // 2, (w + l) // 2, (h + l) // 2)).resize((320, 320), Image.LANCZOS)
    return im

NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elaine', 'Fábio', 'Gabi', 'Hugo', 'Isabela', 'João', 'Karina', 'Lucas', 'Marcela', 'Nando', 'Olívia', 'Paulo', 'Rita', 'Sérgio', 'Tânia', 'Vitor']
COMENT = {5: ['Chegou quentinho e rápido!', 'Muito bom, vou pedir de novo.', 'Sabor incrível, recomendo.', 'Melhor da região!', 'Entrega super rápida e tudo certinho.'],
          4: ['Muito gostoso, só demorou um pouquinho.', 'Bom demais, ótimo custo-benefício.', 'Gostei, voltarei a pedir.'], 3: ['Bom, mas esperava mais.']}

# nome, slug, tipo, descricao, cidade, endereco, lat, lng, cores, sigla, capa, taxa, tempo, minimo, categorias[(nome, icone, [(produto, desc, preco, foto)])], nota alvo
LOJAS = [
 dict(slug='salgadaria-xerem', nome='Salgadaria Xerém', tipo='lanches', desc='Salgados fritos na hora, bem recheados e crocantes. Festa, lanche e encomenda.', cid='Duque de Caxias', end='Estrada Rio-Petrópolis, 2450 - Xerém', lat=-22.5912, lng=-43.2931, cor=((214, 69, 20), (250, 140, 40)), sigla='SX', capa='coxinha-frango', taxa=300, tempo='20-35 min', min=1500,
  cats=[('Salgados', 'porcao', [('Coxinha de Frango', 'Massa leve e recheio cremoso de frango com catupiry.', 750, 'coxinha-frango'), ('Kibe Frito', 'Trigo, carne temperada e hortelã. Sai sequinho.', 700, 'kibe-frito'), ('Risole de Presunto e Queijo', 'Crocante por fora, queijo derretido por dentro.', 750, 'risole-presunto-queijo'), ('Bolinha de Queijo', 'Queijo derretendo na mordida.', 650, 'bolinha-queijo'), ('Croquete de Carne', 'Carne moída bem temperada e farofinha crocante.', 750, 'croquete-carne'), ('Empada de Frango', 'Massa que desmancha e recheio caprichado.', 800, 'empada-frango')]),
        ('Combos', 'combo', [('Combo 10 Salgados', 'Escolha o sabor no pedido. Ideal para dividir.', 5900, 'coxinha-frango'), ('Enroladinho de Salsicha', 'Massa macia com salsicha inteira.', 650, 'enroladinho-salsicha')])]),
 dict(slug='pastelaria-do-ze', nome='Pastelaria do Zé', tipo='pastelaria', desc='O pastel mais crocante de Caxias, feito na hora com massa fininha.', cid='Duque de Caxias', end='Rua Marechal Floriano, 320 - Centro', lat=-22.7858, lng=-43.3098, cor=((233, 168, 20), (240, 100, 30)), sigla='PZ', capa='pastel-carne', taxa=400, tempo='25-40 min', min=1800,
  cats=[('Pastéis', 'porcao', [('Pastel de Carne', 'Carne moída refogada com azeitona e ovo.', 1100, 'pastel-carne'), ('Pastel de Queijo', 'Queijo mussarela derretido.', 1000, 'joelho-presunto-queijo'), ('Pastel de Frango', 'Frango desfiado temperado com catupiry.', 1100, 'empada-frango'), ('Empanada Argentina', 'Recheio de carne e especiarias, massa assada.', 1300, 'empanada-argentina')]),
        ('Doces e bebidas', 'sobremesa', [('Pastel de Nata', 'Creme de ovos com canela, massa folhada.', 800, 'pastel-de-nata'), ('Churros de Doce de Leite', 'Recheado e passado no açúcar com canela.', 900, 'churros-doce-leite')])]),
 dict(slug='brasa-petropolis-burger', nome='Brasa Petrópolis Burger', tipo='hamburgueria', desc='Hambúrguer artesanal na brasa, pão brioche, bacon crocante e batata rústica.', cid='Petrópolis', end='Rua do Imperador, 520 - Centro', lat=-22.5046, lng=-43.1823, cor=((120, 30, 20), (210, 70, 25)), sigla='BX', capa='hamburguer-artesanal', taxa=500, tempo='30-45 min', min=2500,
  cats=[('Hambúrgueres', 'hamburguer', [('Brasa Clássico', 'Blend 160 g, queijo prato, alface, tomate e molho da casa.', 2790, 'hamburguer-artesanal'), ('Cheddar Bacon', 'Blend 160 g, cheddar cremoso e bacon crocante.', 3290, 'hamburguer'), ('Duplo Brasa', 'Dois blends, queijo duplo e cebola caramelizada.', 3990, 'hamburguer-artesanal')]),
        ('Porções', 'porcao', [('Batata Rústica', 'Com alecrim e molho especial.', 2200, 'porcao'), ('Onion Rings', 'Anéis de cebola empanados e crocantes.', 2400, 'kibe-frito')]),
        ('Combos', 'combo', [('Combo Clássico', 'Hambúrguer + batata + refrigerante.', 4290, 'combo')])]),
 dict(slug='casa-da-vo-marmitas', nome='Casa da Vó Marmitas', tipo='marmitaria', desc='Comida caseira de verdade, temperada com carinho. Marmitas e pratos do dia.', cid='Rio de Janeiro', end='Av. Cesário de Melo, 3200 - Campo Grande', lat=-22.9020, lng=-43.5560, cor=((46, 125, 50), (150, 190, 60)), sigla='CV', capa='lasanha-bolonhesa', taxa=450, tempo='35-50 min', min=2000,
  cats=[('Pratos do dia', 'combo', [('Lasanha à Bolonhesa', 'Massa fresca, molho de carne e muito queijo gratinado.', 2890, 'lasanha-bolonhesa'), ('Escondidinho de Frango', 'Purê de mandioca com frango cremoso e queijo.', 2690, 'escondidinho-frango-mandioca'), ('Torta de Frango', 'Fatia generosa, massa macia e recheio suculento.', 1800, 'torta-frango-liquidificador')]),
        ('Caldos e entradas', 'porcao', [('Caldo Verde', 'Batata cremosa, couve e calabresa. Serve 1 pessoa.', 1900, 'caldo-verde'), ('Quiche de Alho-poró', 'Fatia de quiche com massa amanteigada.', 1600, 'quiche-alho-poro')])]),
 dict(slug='doce-encanto-confeitaria', nome='Doce Encanto Confeitaria', tipo='doces', desc='Brigadeiros gourmet, brownies, bolos no pote e sobremesas para presentear.', cid='Niterói', end='Rua Moreira César, 150 - Icaraí', lat=-22.9068, lng=-43.1095, cor=((150, 40, 110), (235, 90, 150)), sigla='DE', capa='brigadeiro-tradicional', taxa=600, tempo='40-60 min', min=2000,
  cats=[('Doces', 'sobremesa', [('Brigadeiro Tradicional (6 un)', 'Chocolate belga com granulado crocante.', 1800, 'brigadeiro-tradicional'), ('Brownie de Chocolate', 'Casquinha crocante e miolo molhadinho.', 1400, 'brownie-chocolate'), ('Trufa de Chocolate (6 un)', 'Recheio cremoso, cobertura de chocolate meio amargo.', 2200, 'trufa-chocolate'), ('Pão de Mel', 'Recheado com doce de leite e cobertura de chocolate.', 900, 'pao-de-mel')]),
        ('Bolos e potes', 'sobremesa', [('Bolo de Laranja (fatia)', 'Calda cítrica e massa fofinha.', 1200, 'bolo-laranja'), ('Pavê de Limão no Pote', 'Creme gelado, biscoito e raspas de limão.', 1500, 'pave-limao-pote'), ('Tiramisù no Pote', 'Café, mascarpone e cacau.', 1700, 'tiramisu-pote')])]),
 dict(slug='gelato-e-acai-caxias', nome='Gelato & Açaí Caxias', tipo='acai', desc='Sorvetes artesanais, geladinhos gourmet e sobremesas geladas para o calor.', cid='Nova Iguaçu', end='Av. Governador Roberto Silveira, 90 - Centro', lat=-22.7592, lng=-43.4509, cor=((95, 40, 150), (170, 90, 210)), sigla='GA', capa='sorvete-coco', taxa=500, tempo='25-40 min', min=1500,
  cats=[('Sorvetes', 'acai', [('Sorvete de Coco (taça)', 'Cremoso, com coco ralado por cima.', 1600, 'sorvete-coco'), ('Geladinho Gourmet de Morango', 'Cremoso de morango com leite condensado.', 700, 'geladinho-morango'), ('Mousse de Maracujá', 'Casquinha de calda de maracujá com sementes.', 1400, 'mousse-maracuja')]),
        ('Sobremesas', 'sobremesa', [('Morango com Creme (travessa)', 'Creme de leite, morangos e chocolate.', 3200, 'morango-creme-travessa'), ('Donuts (caixa com 6)', 'Coberturas variadas.', 3600, 'donuts'), ('Arroz-doce no Copo', 'Com canela, cremoso.', 1100, 'arroz-doce')])]),
 dict(slug='padaria-pao-quente', nome='Padaria Pão Quente', tipo='lanches', desc='Pães fresquinhos toda hora, salgados assados, sanduíches e café da manhã.', cid='Petrópolis', end='Rua Teresa, 1400 - Alto da Serra', lat=-22.5170, lng=-43.1990, cor=((176, 110, 40), (230, 170, 70)), sigla='PQ', capa='pao-queijo', taxa=400, tempo='20-35 min', min=1500,
  cats=[('Pães', 'combo', [('Pão de Queijo (10 un)', 'Mineirinho, saindo do forno.', 1800, 'pao-queijo'), ('Pão de Alho (unid.)', 'Crocante por fora, macio por dentro.', 900, 'pao-de-alho'), ('Rosca Doce de Coco', 'Fofinha com cobertura de coco.', 2200, 'rosca-doce-coco'), ('Cinnamon Roll', 'Canela e cobertura cremosa.', 1400, 'cinnamon-roll')]),
        ('Lanches', 'hamburguer', [('Sanduíche Natural de Frango', 'Pão integral, frango desfiado, alface e cenoura.', 1500, 'sanduiche-natural-frango'), ('Esfiha de Carne', 'Massa fina e recheio temperado.', 700, 'esfiha-carne')])]),
 dict(slug='forno-de-lenha-pizzas', nome='Forno de Lenha Pizzas', tipo='pizzaria', desc='Pizzas de massa fina assadas no forno a lenha. Sabor de pizzaria de verdade.', cid='São João de Meriti', end='Av. Automóvel Clube, 700 - Centro', lat=-22.8039, lng=-43.3722, cor=((170, 25, 30), (240, 80, 40)), sigla='FL', capa='mini-pizza', taxa=700, tempo='40-55 min', min=3000,
  cats=[('Pizzas', 'combo', [('Mini Pizza Margherita', 'Molho de tomate, mussarela e manjericão.', 1800, 'mini-pizza'), ('Mini Pizza Calabresa', 'Calabresa fatiada e cebola.', 1900, 'mini-pizza'), ('Pão de Alho Recheado', 'Entrada: pão de alho com queijo.', 1500, 'pao-de-alho')]),
        ('Sobremesas', 'sobremesa', [('Pudim de Leite Condensado', 'Fatia generosa com calda de caramelo.', 1300, 'pudim-leite-condensado'), ('Quindim', 'Gema, coco e açúcar. Brilhante e cremoso.', 800, 'quindim')])]),
]

def main():
    rnd = random.Random(7)
    L = [MARCA, '-- Lojas de demonstração de Xerém / Duque de Caxias (gerado por demo/gerar_lojas.py). Para apagar: demo/remover-demo.sql']
    for lj in LOJAS:
        eid = uid('emp', lj['slug']); email = f"demo-{lj['slug']}@leupede.demo"
        logo_id, capa_id = uid('logo', eid), uid('capa', eid)
        tel = '(21) 9%04d-%04d' % (rnd.randint(8000, 9999), rnd.randint(1000, 9999))
        L.append(f"INSERT OR IGNORE INTO empresas (id, conta_email, nome, telefone, endereco, cidade, uf, mensagem_cupom, formas_pagamento, desconto_max_caixa, largura_cupom, acesso_ate, criado_em, taxa_entrega_padrao, slug, no_app, aceitando, tipo_loja, descricao, logo_id, capa_id, tempo_entrega, pedido_minimo, faz_entrega, faz_retirada, lat, lng, raio_km) VALUES ({q(eid)}, {q(email)}, {q(lj['nome'])}, {q(tel)}, {q(lj['end'])}, {q(lj['cid'])}, 'RJ', 'Obrigado pela preferência!', '[\"dinheiro\",\"pix\",\"debito\",\"credito\"]', 10, '80', NULL, {q(AGORA)}, {lj['taxa']}, {q(lj['slug'])}, 1, 1, {q(lj['tipo'])}, {q(lj['desc'])}, {q(logo_id)}, {q(capa_id)}, {q(lj['tempo'])}, {lj['min']}, 1, 1, {lj['lat']}, {lj['lng']}, 12);")
        for fid, im, qual in ((logo_id, logo(lj['sigla'], *lj['cor']), 80), (capa_id, capa(lj['capa'], lj['cor']), 60)):
            L.append(f"INSERT OR IGNORE INTO fotos (id, empresa_id, tipo, dados) VALUES ({q(fid)}, {q(eid)}, 'image/webp', X'{webp(im, qual).hex()}');")
        fotos_prod = {}
        for ci, (cnome, cicone, prods) in enumerate(lj['cats'], 1):
            cid = uid('cat', eid, cnome)
            L.append(f"INSERT OR IGNORE INTO categorias (id, empresa_id, nome, icone, ordem) VALUES ({q(cid)}, {q(eid)}, {q(cnome)}, {q(cicone)}, {ci});")
            for pn, pd, preco, pf in prods:
                if pf not in fotos_prod:
                    fotos_prod[pf] = uid('foto', eid, pf)
                    L.append(f"INSERT OR IGNORE INTO fotos (id, empresa_id, tipo, dados) VALUES ({q(fotos_prod[pf])}, {q(eid)}, 'image/webp', X'{webp(prod_foto(pf), 60).hex()}');")
                L.append(f"INSERT OR IGNORE INTO produtos (id, empresa_id, categoria_id, nome, descricao, preco, custo, foto_id, opcoes, receita, criado_em) VALUES ({q(uid('prod', eid, pn))}, {q(eid)}, {q(cid)}, {q(pn)}, {q(pd)}, {preco}, {int(preco * 0.38)}, {q(fotos_prod[pf])}, '{{}}', '[]', {q(AGORA)});")
        # avaliações de mentira: pedidos antigos entregues + nota
        for i in range(rnd.randint(14, 48)):
            nota = rnd.choices([5, 4, 3], [62, 30, 8])[0]; pid = uid('ped', eid, str(i))
            L.append(f"INSERT OR IGNORE INTO pedidos_online (id, empresa_id, token, chave, status, nome, telefone, tipo, endereco, forma, itens, resumo, subtotal, taxa_entrega, total, criado_em) VALUES ({q(pid)}, {q(eid)}, {q(uid('tok', pid))}, {q('demo-' + str(i).zfill(8))}, 'aceito', {q(rnd.choice(NOMES))}, '21900000000', 'balcao', NULL, 'pix', '[]', '[]', 2000, 0, 2000, {q(AGORA)});")
            L.append(f"INSERT OR IGNORE INTO avaliacoes (id, empresa_id, pedido_id, nota, comentario, nome, criado_em) VALUES ({q(uid('av', pid))}, {q(eid)}, {q(pid)}, {nota}, {q(rnd.choice(COMENT[nota]) if rnd.random() < .7 else '')}, {q(rnd.choice(NOMES))}, {q(AGORA)});")
    base = ''
    open(SQL, 'w', encoding='utf-8').write(base + '\n'.join(L) + '\n')
    # remoção
    emails = "SELECT id FROM empresas WHERE conta_email LIKE 'demo-%@leupede.demo'"
    rem = ['-- Apaga TODAS as lojas de demonstração  e seus dados.']
    for t in ('avaliacoes', 'pedidos_online', 'produtos', 'categorias', 'fotos', 'caixas', 'usuarios'):
        rem.append(f"DELETE FROM {t} WHERE empresa_id IN ({emails});")
    rem.append("DELETE FROM empresas WHERE conta_email LIKE 'demo-%@leupede.demo';")
    open(os.path.join(os.path.dirname(__file__), 'remover-demo.sql'), 'w').write('\n'.join(rem) + '\n')
    print('lojas:', len(LOJAS), 'tamanho SQL:', os.path.getsize(SQL) // 1024, 'KB')
main()
