#!/usr/bin/env python3
"""Põe bebidas e grupos de escolha (molhos, ponto da carne, borda…) nas lojas de demonstração.
Grava um bloco próprio no fim de demo/lojas-demo.sql (troca o bloco se já existir). NÃO gera senhas novas.
Uso (na pasta leuburger): python3 demo/opcoes_demo.py"""
import json, os, uuid

SQL = os.path.join(os.path.dirname(__file__), 'lojas-demo.sql')
MARCA = '-- ===== OPCOES-DEMO ====='
NS = uuid.UUID('6d1f0c52-3a54-4a43-9e6e-1c1d0c0de0de')  # o mesmo de gerar_lojas.py
uid = lambda *p: str(uuid.uuid5(NS, '|'.join(p)))
q = lambda s: "'" + str(s).replace("'", "''") + "'"
AGORA = '2026-10-09T12:00:00.000Z'
LOJAS = ['salgadaria-xerem', 'pastelaria-do-ze', 'brasa-petropolis-burger', 'casa-da-vo-marmitas', 'doce-encanto-confeitaria',
         'gelato-e-acai-caxias', 'padaria-pao-quente', 'forno-de-lenha-pizzas', 'sabor-arte-teste']
BEBIDAS = [('Coca-Cola lata 350ml', 'Bem gelada.', 600), ('Guaraná Antarctica lata 350ml', 'Bem gelado.', 550),
           ('Suco natural de laranja 500ml', 'Feito na hora.', 900), ('Água mineral 500ml', 'Com ou sem gás.', 350)]

def g(nome, mn, mx, itens, repetir=False):
    return {'nome': nome, 'min': mn, 'max': mx, 'repetir': repetir, 'itens': [{'nome': n, 'preco': p} for n, p in itens]}
MOLHOS = g('Molhos', 0, 2, [('Ketchup', 0), ('Mostarda', 0), ('Maionese temperada', 100)])
BURGER = [g('Ponto da carne', 1, 1, [('Ao ponto', 0), ('Bem passada', 0)]), g('Turbine seu lanche', 0, 3, [('Bacon', 400), ('Cheddar', 300), ('Ovo', 250)], True)]
REFRI = g('Bebida', 1, 1, [('Coca-Cola lata', 0), ('Guaraná lata', 0), ('Água mineral', 0)])
GRUPOS = {
    ('salgadaria-xerem', 'Coxinha de Frango'): [MOLHOS],
    ('salgadaria-xerem', 'Combo 10 Salgados'): [g('Sabores', 10, 10, [('Coxinha', 0), ('Kibe', 0), ('Risole', 0), ('Bolinha de queijo', 0), ('Croquete', 0)], True), MOLHOS],
    ('pastelaria-do-ze', 'Pastel de Carne'): [MOLHOS], ('pastelaria-do-ze', 'Pastel de Queijo'): [MOLHOS], ('pastelaria-do-ze', 'Pastel de Frango'): [MOLHOS],
    ('brasa-petropolis-burger', 'Brasa Clássico'): BURGER, ('brasa-petropolis-burger', 'Cheddar Bacon'): BURGER, ('brasa-petropolis-burger', 'Duplo Brasa'): BURGER,
    ('brasa-petropolis-burger', 'Combo Clássico'): [BURGER[0], REFRI],
    ('casa-da-vo-marmitas', 'Lasanha à Bolonhesa'): [g('Acompanhamento', 0, 1, [('Arroz branco', 0), ('Salada verde', 0)])],
    ('gelato-e-acai-caxias', 'Sorvete de Coco (taça)'): [g('Cobertura', 0, 1, [('Chocolate', 0), ('Morango', 0), ('Caramelo', 0)]),
                                                         g('Complementos', 0, 3, [('Paçoca', 150), ('Granulado', 100), ('Leite em pó', 200)], True)],
    ('forno-de-lenha-pizzas', 'Mini Pizza Margherita'): [g('Borda', 1, 1, [('Tradicional', 0), ('Catupiry', 500), ('Cheddar', 500)])],
    ('forno-de-lenha-pizzas', 'Mini Pizza Calabresa'): [g('Borda', 1, 1, [('Tradicional', 0), ('Catupiry', 500), ('Cheddar', 500)])],
    ('sabor-arte-teste', 'Hambúrguer Artesanal'): BURGER, ('sabor-arte-teste', 'Coxinha de Frango'): [MOLHOS], ('sabor-arte-teste', 'Pastel de Carne'): [MOLHOS],
    ('sabor-arte-teste', 'Lasanha à Bolonhesa'): [g('Acompanhamento', 0, 1, [('Arroz branco', 0), ('Salada verde', 0)])],
}

def main():
    L = [MARCA, '-- Bebidas e grupos de escolha das lojas de demonstração (gerado por demo/opcoes_demo.py).']
    for slug in LOJAS:
        eid = uid('emp', slug); cid = uid('cat', eid, 'Bebidas')
        L.append(f"INSERT OR IGNORE INTO categorias (id, empresa_id, nome, icone, ordem) VALUES ({q(cid)}, {q(eid)}, 'Bebidas', 'bebida', 9);")
        for pn, pd, preco in BEBIDAS:
            L.append(f"INSERT OR IGNORE INTO produtos (id, empresa_id, categoria_id, nome, descricao, preco, custo, foto_id, opcoes, receita, criado_em) VALUES ({q(uid('prod', eid, pn))}, {q(eid)}, {q(cid)}, {q(pn)}, {q(pd)}, {preco}, {int(preco * 0.5)}, NULL, '{{}}', '[]', {q(AGORA)});")
    for (slug, pn), grupos in GRUPOS.items():
        L.append(f"UPDATE produtos SET opcoes = {q(json.dumps({'grupos': grupos}, ensure_ascii=False))} WHERE id = {q(uid('prod', uid('emp', slug), pn))};")
    texto = open(SQL, encoding='utf-8').read()
    if MARCA in texto: texto = texto[:texto.index(MARCA)]
    open(SQL, 'w', encoding='utf-8').write(texto.rstrip('\n') + '\n' + '\n'.join(L) + '\n')
    print('ok:', len(GRUPOS), 'produtos com grupos,', len(LOJAS) * len(BEBIDAS), 'bebidas')

if __name__ == '__main__':
    main()
