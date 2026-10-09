import { beforeEach, describe, expect, it } from 'vitest';
import { ambiente } from './ajuda';

const CONTAS = {
  'ana@lanche.com': { senha: 'senha-ana', nome: 'Ana', acesso: 'vitalicio' as const },
  'beto@burger.com': { senha: 'senha-beto', nome: 'Beto', acesso: 'teste' as const },
  'sem@app.com': { senha: 'senha-sem', nome: 'Sem App', acesso: null },
};
const HOJE = new Date(Date.now() - 180 * 6e4).toISOString().slice(0, 10);

let A: ReturnType<typeof ambiente>;
beforeEach(() => { A = ambiente(CONTAS); });

async function donoComCardapio() {
  const n = A.navegador();
  expect((await n.post('/auth/entrar', { login: 'ana@lanche.com', senha: 'senha-ana' })).status).toBe(200);
  expect((await n.post('/exemplo')).status).toBe(201);
  const { corpo } = await n.get('/produtos');
  const p = (nome: string) => corpo.produtos.find((x: { nome: string }) => x.nome === nome);
  return { n, p };
}

describe('login', () => {
  it('dono entra com a conta LeuApps e ganha a lanchonete', async () => {
    const n = A.navegador();
    const r = await n.post('/auth/entrar', { login: 'ana@lanche.com', senha: 'senha-ana' });
    expect(r.status).toBe(200);
    const eu = await n.get('/eu');
    expect(eu.corpo.usuario).toMatchObject({ login: 'ana@lanche.com', papel: 'admin', dono: true });
    expect(eu.corpo.empresa.acesso_ate).toBeNull(); // vitalício
  });
  it('senha errada, conta sem o app e sem sessão', async () => {
    const n = A.navegador();
    expect((await n.post('/auth/entrar', { login: 'ana@lanche.com', senha: 'errada' })).status).toBe(401);
    expect((await n.post('/auth/entrar', { login: 'sem@app.com', senha: 'senha-sem' })).status).toBe(402);
    expect((await n.get('/eu')).status).toBe(401);
  });
  it('teste grátis guarda a data de vencimento', async () => {
    const n = A.navegador();
    await n.post('/auth/entrar', { login: 'beto@burger.com', senha: 'senha-beto' });
    expect((await n.get('/eu')).corpo.empresa.acesso_ate).toBeTruthy();
  });
  it('acesso vencido bloqueia os operadores', async () => {
    const { n } = await donoComCardapio();
    await n.post('/usuarios', { nome: 'Caixa Um', login: 'caixa1', senha: 'segredo1', papel: 'caixa' });
    A.db.exec("UPDATE empresas SET acesso_ate = '2020-01-01T00:00:00.000Z'");
    const op = A.navegador();
    await op.post('/auth/entrar', { login: 'caixa1', senha: 'segredo1' });
    const r = await op.get('/produtos');
    expect(r.status).toBe(402);
    expect(r.corpo.mensagem).toMatch(/dono/);
  });
  it('senha de operador é guardada com hash (nunca em texto)', async () => {
    const { n } = await donoComCardapio();
    await n.post('/usuarios', { nome: 'Caixa Um', login: 'caixa1', senha: 'segredo1', papel: 'caixa' });
    const u = A.db.prepare("SELECT senha_hash, senha_sal FROM usuarios WHERE login = 'caixa1'").get() as { senha_hash: string };
    expect(u.senha_hash).not.toContain('segredo1');
    expect(u.senha_hash.length).toBeGreaterThan(20);
  });
  it('limita tentativas de senha', async () => {
    const n = A.navegador();
    let ultimo = 0;
    for (let i = 0; i < 10; i++) ultimo = (await n.post('/auth/entrar', { login: 'ninguem', senha: 'x' })).status;
    expect(ultimo).toBe(429);
  });
});

describe('venda', () => {
  it('não vende com o caixa fechado', async () => {
    const { n, p } = await donoComCardapio();
    const r = await n.post('/vendas', { chave: 'pedido-0001', itens: [{ produtoId: p('X-Bacon').id, qtd: 1 }], pagamentos: [{ forma: 'pix', valor: 2290 }] });
    expect(r.status).toBe(409);
  });

  it('venda das telas: X-Bacon com queijo e bacon extra, 2 batatas e 1 refri = R$ 66,70, troco de R$ 33,30', async () => {
    const { n, p } = await donoComCardapio();
    await n.post('/caixa/abrir', { fundo: 10000 });
    const pedido = {
      chave: 'pedido-1023-abc',
      itens: [
        { produtoId: p('X-Bacon').id, qtd: 1, tamanho: 'Padrão', adicionais: ['Queijo extra', 'Bacon extra'], retirar: ['Cebola'] },
        { produtoId: p('Batata Frita').id, qtd: 2 },
        { produtoId: p('Refrigerante Lata').id, qtd: 1 },
      ],
      pagamentos: [{ forma: 'dinheiro', valor: 10000 }],
    };
    const r = await n.post('/vendas', pedido);
    expect(r.status).toBe(201);
    expect(r.corpo.venda).toMatchObject({ numero: 1001, subtotal: 6670, total: 6670, troco: 3330, status: 'concluida' });
    expect(r.corpo.venda.itens.find((i: { nome: string }) => i.nome === 'X-Bacon').detalhes).toMatchObject({ retirar: ['Cebola'] });

    // Clique duplo / reenvio: devolve a mesma venda, sem duplicar.
    const de_novo = await n.post('/vendas', pedido);
    expect(de_novo.corpo.repetida).toBe(true);
    expect(de_novo.corpo.venda.id).toBe(r.corpo.venda.id);
    expect((A.db.prepare('SELECT COUNT(*) AS n FROM vendas').get() as { n: number }).n).toBe(1);

    // Estoque: 2 pães (X-Bacon 1 + nada nas batatas), refri 48 → 47, batata 10 → 9,5 kg.
    const est = (nome: string) => (A.db.prepare('SELECT qtd FROM estoque_itens WHERE nome = ?').get(nome) as { qtd: number }).qtd;
    expect(est('Refrigerante lata')).toBe(47);
    expect(est('Batata pré-frita')).toBe(9.5);
    expect(est('Pão de hambúrguer')).toBe(119);

    // Caixa: dinheiro esperado = fundo 100 + 66,70 (100 recebidos − 33,30 de troco).
    const cx = await n.get('/caixa');
    expect(cx.corpo.resumo.dinheiroEsperado).toBe(16670);

    // Cancelamento devolve o estoque e exige motivo.
    expect((await n.post(`/vendas/${r.corpo.venda.id}/cancelar`, { motivo: 'abc' })).status).toBe(400);
    const canc = await n.post(`/vendas/${r.corpo.venda.id}/cancelar`, { motivo: 'Cliente desistiu do pedido' });
    expect(canc.corpo.venda.status).toBe('cancelada');
    expect(est('Refrigerante lata')).toBe(48);
    expect(est('Batata pré-frita')).toBe(10);
    expect((await n.post(`/vendas/${r.corpo.venda.id}/cancelar`, { motivo: 'de novo, outra vez' })).status).toBe(409);
    expect((await n.get('/caixa')).corpo.resumo.dinheiroEsperado).toBe(10000);
  });

  it('entrega: endereço e taxa no pedido; taxa soma no total mas não no lucro', async () => {
    const { n, p } = await donoComCardapio();
    await n.post('/caixa/abrir', { fundo: 0 });
    const base = { itens: [{ produtoId: p('X-Burger').id, qtd: 1 }], pagamentos: [{ forma: 'pix', valor: 2390 }] };
    expect((await n.post('/vendas', { ...base, chave: 'entrega-sem-end', entrega: { endereco: '', taxa: 500 } })).status).toBe(400);
    const r = await n.post('/vendas', { ...base, chave: 'entrega-0001', desconto: { tipo: 'pct', valor: 100 }, entrega: { endereco: 'Rua das Flores, 120 - Centro', taxa: 500 },
      pagamentos: [{ forma: 'pix', valor: 500 }] });
    expect(r.status).toBe(201);
    // Desconto de 100% vale só nos produtos: o cliente paga a taxa.
    expect(r.corpo.venda).toMatchObject({ subtotal: 1890, desconto: 1890, taxa_entrega: 500, total: 500, tipo: 'entrega', endereco_entrega: 'Rua das Flores, 120 - Centro' });
    const v = await n.post('/vendas', { ...base, chave: 'entrega-0002', entrega: { endereco: 'Av. Brasil, 55', taxa: 500 } });
    expect(v.corpo.venda.total).toBe(2390);
    const hoje = new Date().toISOString().slice(0, 10);
    const rel = await n.get(`/relatorios?de=${hoje}&ate=${hoje}&fuso=0`);
    expect(rel.corpo.atual).toMatchObject({ faturamento: 2890, taxas: 1000, entregas: 2 });
    expect(rel.corpo.atual.lucro).toBe(2890 - 1000 - 2 * 700);
  });

  it('andamento: painel da loja, link do entregador (marca saída e entrega) e link do cliente (só vê)', async () => {
    const { n, p } = await donoComCardapio();
    await n.post('/caixa/abrir', { fundo: 0 });
    const r = await n.post('/vendas', { chave: 'andamento-01', itens: [{ produtoId: p('X-Burger').id, qtd: 1 }], pagamentos: [{ forma: 'dinheiro', valor: 5000 }], entrega: { endereco: 'Rua A, 10', taxa: 500 } });
    const v = r.corpo.venda;
    expect(v.andamento).toBe('preparando');
    expect(v.token_cliente).toMatch(/^[\w-]{20,}$/);
    expect(v.token_entregador).not.toBe(v.token_cliente);
    expect((await n.get('/andamento')).corpo.pedidos.map((x: { id: string }) => x.id)).toContain(v.id);

    // Loja marca pronto; balcão não aceita "a caminho" em pedido de retirada e vice-versa.
    expect((await n.post(`/vendas/${v.id}/andamento`, { andamento: 'pronto', entregador: 'João' })).status).toBe(200);
    expect((await n.post(`/vendas/${v.id}/andamento`, { andamento: 'retirado' })).status).toBe(400);

    // Entregador, sem login.
    const moto = A.navegador();
    const m = await moto.get(`/publico/entrega/${v.token_entregador}`);
    expect(m.corpo.pedido).toMatchObject({ endereco: 'Rua A, 10', total: 2390, troco: 2610, entregador: 'João' });
    expect((await moto.post(`/publico/entrega/${v.token_entregador}`, { andamento: 'a_caminho' })).status).toBe(200);
    // Cliente vê "a caminho", mas o link dele não serve para marcar nada nem mostra o endereço.
    const cli = await moto.get(`/publico/pedido/${v.token_cliente}`);
    expect(cli.corpo.pedido).toMatchObject({ andamento: 'a_caminho', numero: v.numero });
    expect(cli.corpo.pedido.endereco).toBeUndefined();
    expect((await moto.post(`/publico/entrega/${v.token_cliente}`, { andamento: 'entregue' })).status).toBe(404);
    expect((await moto.get('/publico/pedido/inventado-mas-com-tamanho-ok')).status).toBe(404);
    expect((await moto.post(`/publico/entrega/${v.token_entregador}`, { andamento: 'entregue' })).status).toBe(200);
    expect((await moto.get(`/publico/pedido/${v.token_cliente}`)).corpo.pedido.andamento).toBe('entregue');
    // Sem login, nada além dos links.
    expect((await moto.get('/andamento')).status).toBe(401);
  });

  it('o servidor ignora preço vindo do navegador e recusa pedidos errados', async () => {
    const { n, p } = await donoComCardapio();
    await n.post('/caixa/abrir', { fundo: 0 });
    const base = { itens: [{ produtoId: p('X-Burger').id, qtd: 1, preco: 1 }], pagamentos: [{ forma: 'pix', valor: 1890 }] };
    expect((await n.post('/vendas', { ...base, chave: 'certo-0001' })).corpo.venda.total).toBe(1890);
    expect((await n.post('/vendas', { ...base, chave: 'falta-0001', pagamentos: [{ forma: 'pix', valor: 100 }] })).status).toBe(400);
    expect((await n.post('/vendas', { ...base, chave: 'qtdneg-0001', itens: [{ produtoId: p('X-Burger').id, qtd: -1 }] })).status).toBe(400);
    expect((await n.post('/vendas', { ...base, chave: 'troco-pix-01', pagamentos: [{ forma: 'pix', valor: 5000 }] })).status).toBe(400);
    expect((await n.post('/vendas', { ...base, chave: 'adicional-01', itens: [{ produtoId: p('X-Burger').id, qtd: 1, adicionais: ['Lagosta'] }] })).status).toBe(400);
    expect((await n.post('/vendas', { ...base, chave: 'vazio-00001', itens: [] })).status).toBe(400);
  });

  it('caixa só dá desconto até o limite; gerente pode mais', async () => {
    const { n, p } = await donoComCardapio();
    await n.post('/caixa/abrir', { fundo: 0 });
    await n.post('/usuarios', { nome: 'Caixa Um', login: 'caixa1', senha: 'segredo1', papel: 'caixa' });
    const op = A.navegador();
    expect((await op.post('/auth/entrar', { login: 'caixa1', senha: 'segredo1' })).status).toBe(200);
    const item = [{ produtoId: p('X-Tudo').id, qtd: 1 }]; // 25,90
    expect((await op.post('/vendas', { chave: 'desc-alto-01', itens: item, desconto: { tipo: 'pct', valor: 20 }, pagamentos: [{ forma: 'pix', valor: 2072 }] })).status).toBe(403);
    expect((await op.post('/vendas', { chave: 'desc-ok-0001', itens: item, desconto: { tipo: 'pct', valor: 10 }, pagamentos: [{ forma: 'pix', valor: 2331 }] })).status).toBe(201);
    expect((await n.post('/vendas', { chave: 'desc-dono-01', itens: item, desconto: { tipo: 'pct', valor: 20 }, pagamentos: [{ forma: 'pix', valor: 2072 }] })).status).toBe(201);
  });
});

describe('permissões e separação das lanchonetes', () => {
  it('caixa não mexe em produtos, relatórios nem usuários, e não cancela venda', async () => {
    const { n, p } = await donoComCardapio();
    await n.post('/usuarios', { nome: 'Caixa Um', login: 'caixa1', senha: 'segredo1', papel: 'caixa' });
    const op = A.navegador();
    await op.post('/auth/entrar', { login: 'caixa1', senha: 'segredo1' });
    expect((await op.put(`/produtos/${p('X-Burger').id}`, {})).status).toBe(403);
    expect((await op.get(`/relatorios?de=${HOJE}&ate=${HOJE}`)).status).toBe(403);
    expect((await op.get('/usuarios')).status).toBe(403);
    expect((await op.post('/vendas/qualquer/cancelar', { motivo: 'tentativa do caixa' })).status).toBe(403);
    expect((await op.get('/produtos')).status).toBe(200); // vê o cardápio para vender
  });
  it('uma lanchonete não vê nem altera nada da outra', async () => {
    const { p } = await donoComCardapio();
    const beto = A.navegador();
    await beto.post('/auth/entrar', { login: 'beto@burger.com', senha: 'senha-beto' });
    expect((await beto.get('/produtos')).corpo.produtos).toHaveLength(0);
    expect((await beto.put(`/produtos/${p('X-Burger').id}`, { nome: 'Hack', categoria_id: 'x', preco: 1 })).status).not.toBe(200);
    await beto.post('/caixa/abrir', { fundo: 0 });
    expect((await beto.post('/vendas', { chave: 'invasao-0001', itens: [{ produtoId: p('X-Burger').id, qtd: 1 }], pagamentos: [{ forma: 'pix', valor: 1890 }] })).status).toBe(400);
  });
  it('login repetido entre lanchonetes é recusado', async () => {
    const { n } = await donoComCardapio();
    expect((await n.post('/usuarios', { nome: 'Um', login: 'joao', senha: 'segredo1', papel: 'caixa' })).status).toBe(201);
    const beto = A.navegador();
    await beto.post('/auth/entrar', { login: 'beto@burger.com', senha: 'senha-beto' });
    expect((await beto.post('/usuarios', { nome: 'Outro', login: 'joao', senha: 'segredo2', papel: 'caixa' })).status).toBe(409);
  });
});

describe('cadastros, estoque e relatórios', () => {
  it('produto: validação, código repetido e preço negativo', async () => {
    const { n, p } = await donoComCardapio();
    const cats = (await n.get('/categorias')).corpo.categorias;
    expect((await n.post('/produtos', { nome: '', categoria_id: cats[0].id, preco: 100 })).corpo.campos.nome).toBeTruthy();
    expect((await n.post('/produtos', { nome: 'Teste', categoria_id: cats[0].id, preco: -5 })).status).toBe(400);
    expect((await n.post('/produtos', { nome: 'A', categoria_id: cats[0].id, preco: 100, codigo: '789' })).status).toBe(201);
    expect((await n.post('/produtos', { nome: 'B', categoria_id: cats[0].id, preco: 100, codigo: '789' })).status).toBe(409);
    expect((await n.del(`/categorias/${cats[0].id}`)).status).toBe(409); // tem produtos
    expect(p('X-Bacon').opcoes.adicionais.length).toBeGreaterThan(0);
  });
  it('estoque: entrada, perda com motivo e acerto de contagem', async () => {
    const { n } = await donoComCardapio();
    const itens = (await n.get('/estoque')).corpo.itens;
    const refri = itens.find((i: { nome: string }) => i.nome === 'Refrigerante lata');
    await n.post(`/estoque/${refri.id}/movimento`, { tipo: 'entrada', qtd: 12, custo: 260 });
    expect((await n.post(`/estoque/${refri.id}/movimento`, { tipo: 'perda', qtd: 2 })).status).toBe(400);
    await n.post(`/estoque/${refri.id}/movimento`, { tipo: 'perda', qtd: 2, motivo: 'Lata amassada' });
    await n.post(`/estoque/${refri.id}/movimento`, { tipo: 'ajuste', qtd: 50 });
    const depois = (await n.get('/estoque')).corpo.itens.find((i: { id: string }) => i.id === refri.id);
    expect(depois.qtd).toBe(50);
    expect(depois.custo).toBe(260);
    expect((await n.get(`/estoque/${refri.id}/movimentos`)).corpo.movimentos).toHaveLength(3);
  });
  it('relatório e painel batem com as vendas', async () => {
    const { n, p } = await donoComCardapio();
    await n.post('/caixa/abrir', { fundo: 0 });
    await n.post('/vendas', { chave: 'rel-000001', itens: [{ produtoId: p('X-Bacon').id, qtd: 2 }], pagamentos: [{ forma: 'pix', valor: 4580 }] });
    await n.post('/vendas', { chave: 'rel-000002', itens: [{ produtoId: p('Refrigerante Lata').id, qtd: 1 }], pagamentos: [{ forma: 'dinheiro', valor: 1000 }] });
    const rel = (await n.get(`/relatorios?de=${HOJE}&ate=${HOJE}&fuso=180`)).corpo;
    expect(rel.atual).toMatchObject({ pedidos: 2, faturamento: 5280, itens: 3, ticketMedio: 2640 });
    expect(rel.porForma).toEqual(expect.arrayContaining([{ forma: 'pix', valor: 4580 }, { forma: 'dinheiro', valor: 700 }]));
    expect(rel.atual.lucro).toBe(5280 - (850 * 2 + 250));
    const ini = (await n.get(`/inicio?hoje=${HOJE}&fuso=180`)).corpo;
    expect(ini.hoje.faturamento).toBe(5280);
    expect(ini.maisVendidos[0].nome).toBe('X-Bacon');
  });
  it('fechar caixa mostra a diferença', async () => {
    const { n, p } = await donoComCardapio();
    await n.post('/caixa/abrir', { fundo: 5000 });
    await n.post('/vendas', { chave: 'cx-0000001', itens: [{ produtoId: p('X-Burger').id, qtd: 1 }], pagamentos: [{ forma: 'dinheiro', valor: 2000 }] });
    await n.post('/caixa/movimento', { tipo: 'sangria', valor: 1000, motivo: 'Depósito' });
    const f = await n.post('/caixa/fechar', { contado: 5790 });
    expect(f.corpo.resumo.dinheiroEsperado).toBe(5000 + 1890 - 1000);
    expect(f.corpo.diferenca).toBe(-100);
    expect((await n.get('/caixa')).corpo.caixa).toBeNull();
  });
  it('pedido de outro site é recusado', async () => {
    const r = await A.navegador().post('/auth/entrar', { login: 'a', senha: 'b' });
    expect(r.status).not.toBe(403); // mesma origem passa (o teste não manda Origin)
  });
});

describe('LeuPede (app de pedidos dos clientes)', () => {
  async function lojaNoApp() {
    const { n, p } = await donoComCardapio();
    await n.put('/empresa', { nome: 'Burger da Ana', cidade: 'Campinas', uf: 'SP', formas_pagamento: ['dinheiro', 'pix', 'debito', 'credito'], desconto_max_caixa: 10, largura_cupom: '80', taxa_entrega_padrao: 500 });
    const cfg = { slug: 'burger-da-ana', no_app: true, aceitando: true, faz_entrega: true, faz_retirada: true, tipo_loja: 'hamburgueria', descricao: 'Os melhores da cidade', tempo_entrega: '30-45 min', pedido_minimo: 1500, lat: -22.9, lng: -47.06, raio_km: 5 };
    expect((await n.put('/loja-app', cfg)).status).toBe(200);
    return { n, p, cfg };
  }

  it('cliente acha a loja perto, vê o cardápio sem custo e faz o pedido; a loja aceita e vira venda', async () => {
    const { n, p } = await lojaNoApp();
    const cli = A.navegador();
    // Perto (≈1 km): aparece e entrega; longe (> 40 km): não aparece.
    const perto = await cli.get('/publico/app/lojas?lat=-22.91&lng=-47.06');
    expect(perto.corpo.lojas).toHaveLength(1);
    expect(perto.corpo.lojas[0]).toMatchObject({ slug: 'burger-da-ana', entrega_aqui: true, taxa_entrega: 500 });
    expect((await cli.get('/publico/app/lojas?lat=-23.55&lng=-46.63')).corpo.lojas).toHaveLength(0);
    expect((await cli.get('/publico/app/lojas?cidade=campinas')).corpo.lojas).toHaveLength(1);
    const card = await cli.get('/publico/app/loja/burger-da-ana');
    expect(card.corpo.produtos.length).toBeGreaterThan(5);
    expect(card.corpo.produtos[0].custo).toBeUndefined();
    expect(card.corpo.produtos[0].receita).toBeUndefined();

    const pedido = { chave: 'app-cliente-0001', nome: 'Maria', telefone: '(19) 99876-5432', tipo: 'entrega', endereco: 'Rua das Flores, 10', forma: 'dinheiro', trocoPara: 5000,
      itens: [{ produtoId: p('X-Bacon').id, qtd: 1, adicionais: ['Bacon extra'] }] };
    // Abaixo do mínimo (R$ 15): um refri só não passa.
    expect((await cli.post('/publico/app/loja/burger-da-ana/pedido', { ...pedido, chave: 'app-min-0001', itens: [{ produtoId: p('Refrigerante Lata').id, qtd: 1 }] })).status).toBe(400);
    const r = await cli.post('/publico/app/loja/burger-da-ana/pedido', pedido);
    expect(r.status).toBe(201);
    expect((await cli.post('/publico/app/loja/burger-da-ana/pedido', pedido)).corpo.token).toBe(r.corpo.token); // toque duplo
    let acomp = await cli.get(`/publico/app/pedido/${r.corpo.token}`);
    expect(acomp.corpo.pedido).toMatchObject({ situacao: 'aguardando', total: 2290 + 400 + 500, taxa_entrega: 500 });

    // Loja: aceitar abre o caixa sozinho (se estiver fechado) e vira venda com o cliente cadastrado e o troco para R$ 50.
    const lista = await n.get('/pedidos-app');
    const o = lista.corpo.pedidos[0];
    const ac = await n.post(`/pedidos-app/${o.id}/aceitar`);
    expect(ac.status).toBe(200);
    const venda = (await n.get(`/vendas/${ac.corpo.venda_id}`)).corpo.venda;
    expect(venda).toMatchObject({ total: 3190, troco: 1810, tipo: 'entrega', endereco_entrega: 'Rua das Flores, 10', cliente: 'Maria', andamento: 'preparando' });
    acomp = await cli.get(`/publico/app/pedido/${r.corpo.token}`);
    expect(acomp.corpo.pedido).toMatchObject({ situacao: 'preparando', numero: venda.numero });
    await n.post(`/vendas/${venda.id}/andamento`, { andamento: 'a_caminho' });
    expect((await cli.get(`/publico/app/pedido/${r.corpo.token}`)).corpo.pedido.situacao).toBe('a_caminho');
    // Avaliação: só depois de entregue, uma vez; aparece na loja.
    expect((await cli.post(`/publico/app/pedido/${r.corpo.token}/avaliar`, { nota: 5 })).status).toBe(409);
    // A loja que leva também precisa do código que está com o cliente.
    expect((await n.post(`/vendas/${venda.id}/andamento`, { andamento: 'entregue' })).corpo.erro).toBe('codigo_errado');
    const cod = (await cli.get(`/publico/app/pedido/${r.corpo.token}`)).corpo.pedido.codigo_entrega;
    expect((await n.post(`/vendas/${venda.id}/andamento`, { andamento: 'entregue', codigo: cod })).status).toBe(200);
    expect((await cli.get(`/publico/app/pedido/${r.corpo.token}`)).corpo.pedido.codigo_entrega).toBeNull();
    expect((await cli.post(`/publico/app/pedido/${r.corpo.token}/avaliar`, { nota: 6 })).status).toBe(400);
    expect((await cli.post(`/publico/app/pedido/${r.corpo.token}/avaliar`, { nota: 4, comentario: 'Chegou quentinho' })).status).toBe(200);
    expect((await cli.post(`/publico/app/pedido/${r.corpo.token}/avaliar`, { nota: 1 })).status).toBe(409);
    expect((await cli.get(`/publico/app/pedido/${r.corpo.token}`)).corpo.pedido.avaliacao).toMatchObject({ nota: 4 });
    expect((await cli.get('/publico/app/lojas?cidade=campinas')).corpo.lojas[0]).toMatchObject({ nota: 4, avaliacoes: 1 });
    expect((await cli.get('/publico/app/loja/burger-da-ana/avaliacoes')).corpo.avaliacoes[0]).toMatchObject({ nota: 4, comentario: 'Chegou quentinho', nome: 'Maria' });
    // Aceitar de novo não duplica.
    expect((await n.post(`/pedidos-app/${o.id}/aceitar`)).corpo.repetido).toBe(true);
    expect((A.db.prepare('SELECT COUNT(*) AS n FROM vendas').get() as { n: number }).n).toBe(1);
  });

  it('recusar com motivo; loja fechada não recebe; outra loja não vê os pedidos; slug único', async () => {
    const { n, p, cfg } = await lojaNoApp();
    const cli = A.navegador();
    const base = { nome: 'Jorge', telefone: '19988887777', tipo: 'balcao', forma: 'pix', itens: [{ produtoId: p('X-Tudo').id, qtd: 1 }] };
    const r = await cli.post('/publico/app/loja/burger-da-ana/pedido', { ...base, chave: 'app-jorge-0001' });
    const o = (await n.get('/pedidos-app')).corpo.pedidos[0];
    expect((await n.post(`/pedidos-app/${o.id}/recusar`, { motivo: 'Acabou o pão' })).status).toBe(200);
    expect((await cli.get(`/publico/app/pedido/${r.corpo.token}`)).corpo.pedido).toMatchObject({ situacao: 'recusado', motivo_recusa: 'Acabou o pão' });
    await n.post('/loja-app/aceitando', { aceitando: false });
    expect((await cli.post('/publico/app/loja/burger-da-ana/pedido', { ...base, chave: 'app-jorge-0002' })).status).toBe(409);

    const beto = A.navegador();
    await beto.post('/auth/entrar', { login: 'beto@burger.com', senha: 'senha-beto' });
    expect((await beto.get('/pedidos-app')).corpo.pedidos).toHaveLength(0);
    expect((await beto.post(`/pedidos-app/${o.id}/aceitar`)).status).toBe(404);
    await beto.put('/empresa', { nome: 'Beto', cidade: 'Campinas', uf: 'SP', formas_pagamento: ['pix'], desconto_max_caixa: 0, largura_cupom: '80' });
    expect((await beto.put('/loja-app', { ...cfg })).status).toBe(409);
    // Loja sem produtos não aparece no app.
    expect((await beto.put('/loja-app', { ...cfg, slug: 'beto-burger' })).status).toBe(200);
    expect((await cli.get('/publico/app/loja/beto-burger')).status).toBe(404);
  });
});

describe('Pedêê: lojista cadastra a loja pelo app', () => {
  it('cadastra, já entra, monta o cardápio e a loja aparece para o cliente', async () => {
    const lj = A.navegador();
    const dados = { loja: 'Açaí da Praça', tipo_loja: 'acai', nome: 'Rita', whatsapp: '(21) 99999-1234', cidade: 'Duque de Caxias', uf: 'rj', endereco: 'Praça Central, 10 - Xerém', senha: 'segredo1' };
    expect((await lj.post('/publico/app/cadastrar-loja', { ...dados, senha: '123' })).status).toBe(400);
    const r = await lj.post('/publico/app/cadastrar-loja', dados);
    expect(r.status).toBe(201);
    expect(r.corpo.slug).toBe('acai-da-praca');
    const eu = await lj.get('/eu');
    expect(eu.corpo.usuario).toMatchObject({ login: '21999991234', papel: 'admin' });
    expect(eu.corpo.empresa).toMatchObject({ nome: 'Açaí da Praça', no_app: true, aceitando: true, slug: 'acai-da-praca' });
    // Mesmo WhatsApp de novo: não cria outra loja. Outra loja com o mesmo nome ganha número.
    expect((await A.navegador().post('/publico/app/cadastrar-loja', dados)).status).toBe(409);
    expect((await A.navegador().post('/publico/app/cadastrar-loja', { ...dados, whatsapp: '21988887777' })).corpo.slug).toBe('acai-da-praca-2');
    // Sem produto ainda não aparece; com produto aparece na cidade.
    const cli = A.navegador();
    expect((await cli.get('/publico/app/lojas?cidade=duque de caxias')).corpo.lojas).toHaveLength(0);
    const cat = await lj.post('/categorias', { nome: 'Açaí', icone: 'acai' });
    expect((await lj.post('/produtos', { nome: 'Açaí 500 ml', categoria_id: cat.corpo.id, preco: 1800 })).status).toBe(201);
    expect((await cli.get('/publico/app/lojas?cidade=duque de caxias')).corpo.lojas.map((l: { nome: string }) => l.nome)).toEqual(['Açaí da Praça']);
    // Entra de novo pelo WhatsApp e a senha.
    const outra = A.navegador();
    expect((await outra.post('/auth/entrar', { login: '21999991234', senha: 'segredo1' })).status).toBe(200);
  });
});

describe('Pedêê Entregador (app do entregador)', () => {
  it('entregador se cadastra, a loja vincula pelo e-mail, escolhe quem entrega e ele marca saí/entreguei no app', async () => {
    const { n, p } = await donoComCardapio();
    await n.post('/caixa/abrir', { fundo: 0 });
    const moto = A.navegador();
    // Loja tenta vincular antes do entregador ter o app.
    expect((await n.post('/entregadores', { email: 'joao@moto.com' })).status).toBe(404);
    expect((await moto.post('/entregador/cadastrar', { nome: 'João Moto', email: ' Joao@Moto.com ', senha: 'moto123', veiculo: 'moto' })).status).toBe(201);
    expect((await moto.get('/entregador/eu')).corpo.entregador).toMatchObject({ nome: 'João Moto', email: 'joao@moto.com', disponivel: true });
    expect((await n.post('/entregadores', { email: 'JOAO@moto.com' })).corpo.nome).toBe('João Moto');
    const lista = (await n.get('/entregadores')).corpo.entregadores;
    expect(lista).toHaveLength(1);
    expect((await moto.get('/entregador/eu')).corpo.lojas.length).toBe(1);

    const v = (await n.post('/vendas', { chave: 'moto-0001', itens: [{ produtoId: p('X-Burger').id, qtd: 1 }], pagamentos: [{ forma: 'dinheiro', valor: 5000 }], entrega: { endereco: 'Rua B, 20', taxa: 500 } })).corpo.venda;
    // Sem estar com ele, o entregador não vê nem mexe.
    expect((await moto.get('/entregador/entregas')).corpo.entregas).toHaveLength(0);
    expect((await moto.post(`/entregador/entregas/${v.id}`, { andamento: 'a_caminho' })).status).toBe(404);
    expect((await n.post(`/vendas/${v.id}/entregador`, { entregador_id: lista[0].id })).status).toBe(200);
    const ent = (await moto.get('/entregador/entregas')).corpo.entregas;
    expect(ent[0]).toMatchObject({ id: v.id, endereco_entrega: 'Rua B, 20', troco: 2610, loja: expect.any(String) });
    expect((await moto.post(`/entregador/entregas/${v.id}`, { andamento: 'a_caminho' })).status).toBe(200);
    expect((await n.get('/andamento')).corpo.pedidos.find((x: { id: string }) => x.id === v.id)).toMatchObject({ andamento: 'a_caminho', entregador: 'João Moto' });
    expect((await moto.post(`/entregador/entregas/${v.id}`, { andamento: 'entregue' })).status).toBe(200);
    // Outra loja não pode usar o entregador sem vincular; sem login do entregador não entra.
    const beto = A.navegador();
    await beto.post('/auth/entrar', { login: 'beto@burger.com', senha: 'senha-beto' });
    expect((await beto.post(`/vendas/${v.id}/entregador`, { entregador_id: lista[0].id })).status).toBe(404);
    expect((await A.navegador().get('/entregador/entregas')).status).toBe(401);
    expect((await A.navegador().post('/entregador/entrar', { email: 'joao@moto.com', senha: 'errada' })).status).toBe(401);
    expect((await A.navegador().post('/entregador/entrar', { email: 'joao@moto.com', senha: 'moto123' })).status).toBe(200);
  });
});

describe('Mapa ao vivo da entrega', () => {
  it('cliente manda a localização no pedido; enquanto o entregador está a caminho o cliente vê a posição dele', async () => {
    const { n, p } = await donoComCardapio();
    await n.put('/empresa', { nome: 'Burger Mapa', cidade: 'Petrópolis', uf: 'RJ', formas_pagamento: ['pix'], desconto_max_caixa: 10, largura_cupom: '80', taxa_entrega_padrao: 500 });
    const cfgR = await n.put('/loja-app', { slug: 'burger-mapa', no_app: true, aceitando: true, faz_entrega: true, faz_retirada: true, tipo_loja: 'hamburgueria', descricao: 'Teste', tempo_entrega: '30 min', pedido_minimo: 0, lat: -22.5046, lng: -43.1823, raio_km: 8 }); expect(cfgR.status, JSON.stringify(cfgR.corpo)).toBe(200);
    const moto = A.navegador(), cli = A.navegador();
    await moto.post('/entregador/cadastrar', { nome: 'Zé Moto', email: 'ze@moto.com', senha: 'moto123', veiculo: 'moto' });
    await n.post('/entregadores', { email: 'ze@moto.com' });
    const ped = await cli.post('/publico/app/loja/burger-mapa/pedido', { chave: 'mapa-cliente-01', nome: 'Rita', telefone: '24999990000', tipo: 'entrega', endereco: 'Rua A, 1', forma: 'pix', lat: -22.51, lng: -43.19,
      itens: [{ produtoId: p('X-Bacon').id, qtd: 2 }] });
    expect(ped.status).toBe(201);
    const token = ped.corpo.token;
    const [novo] = (await n.get('/pedidos-app')).corpo.pedidos;
    const vendaId = (await n.post(`/pedidos-app/${novo.id}/aceitar`, {})).corpo.venda_id;
    const eid = (await n.get('/entregadores')).corpo.entregadores[0].id;
    await n.post(`/vendas/${vendaId}/entregador`, { entregador_id: eid });
    // Antes de sair: sem mapa e a posição não vale.
    expect((await cli.get(`/publico/app/pedido/${token}`)).corpo.pedido.mapa).toBeNull();
    expect((await moto.post('/entregador/posicao', { lat: -22.5, lng: -43.18 })).status).toBe(200);
    expect((await moto.post(`/entregador/entregas/${vendaId}`, { andamento: 'a_caminho' })).status).toBe(200);
    expect((await moto.post('/entregador/posicao', { lat: 91, lng: 0 })).status).toBe(400);
    expect((await moto.post('/entregador/posicao', { lat: -22.508, lng: -43.186 })).status).toBe(200);
    const mapa = (await cli.get(`/publico/app/pedido/${token}`)).corpo.pedido.mapa;
    expect(mapa).toMatchObject({ loja: { lat: -22.5046, lng: -43.1823 }, destino: { lat: -22.51, lng: -43.19 }, entregador: { lat: -22.508, lng: -43.186 } });
    // Sem login do entregador não manda posição; depois de entregue o mapa some.
    expect((await A.navegador().post('/entregador/posicao', { lat: 0, lng: 0 })).status).toBe(401);
    // Entregar exige o código que só o cliente vê; e a conversa não mostra telefone a ninguém.
    const pd = (await cli.get(`/publico/app/pedido/${token}`)).corpo.pedido;
    expect(pd.codigo_entrega).toMatch(/^\d{4}$/);
    expect((await moto.post(`/entregador/entregas/${vendaId}/mensagem`, { texto: 'Estou aqui na frente' })).status).toBe(200);
    expect((await cli.post(`/publico/app/pedido/${token}/mensagem`, { texto: 'Já estou descendo' })).status).toBe(200);
    expect((await cli.get(`/publico/app/pedido/${token}`)).corpo.pedido.mensagens.map((m: { texto: string }) => m.texto)).toEqual(['Estou aqui na frente', 'Já estou descendo']);
    const naRua = (await moto.get('/entregador/entregas')).corpo.entregas[0];
    expect(naRua.cliente_telefone).toBeUndefined();
    expect(naRua.mensagens).toHaveLength(2);
    expect((await moto.post(`/entregador/entregas/${vendaId}`, { andamento: 'entregue' })).status).toBe(400);
    expect((await moto.post(`/entregador/entregas/${vendaId}`, { andamento: 'entregue', codigo: pd.codigo_entrega === '0000' ? '1111' : '0000' })).corpo.erro).toBe('codigo_errado');
    expect((await moto.post(`/entregador/entregas/${vendaId}`, { andamento: 'entregue', codigo: pd.codigo_entrega })).status).toBe(200);
    expect((await cli.get(`/publico/app/pedido/${token}`)).corpo.pedido.mapa).toBeNull();
    const resumo = (await moto.get('/entregador/resumo')).corpo.entregas;
    expect(resumo[0]).toMatchObject({ ganho: 500, km: expect.any(Number) });
    // Foto: o entregador manda; o cliente do pedido consegue ver.
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    expect((await moto.post('/entregador/foto', { dados: 'texto qualquer' })).status).toBe(400);
    expect((await moto.post('/entregador/foto', { dados: png })).status).toBe(200);
    expect((await moto.get('/entregador/eu')).corpo.entregador.tem_foto).toBe(true);
  });
});

describe('Cancelamento pelo cliente (prazo de 5 minutos)', () => {
  it('cliente cancela no prazo; a loja só marca pronto depois do prazo; fora do prazo não cancela', async () => {
    A.env.JANELA_CANCELAR_MIN = '5';
    try {
      const { n, p } = await donoComCardapio();
      await n.put('/empresa', { nome: 'Burger Prazo', cidade: 'Niterói', uf: 'RJ', formas_pagamento: ['pix'], desconto_max_caixa: 10, largura_cupom: '80', taxa_entrega_padrao: 0 });
      await n.put('/loja-app', { slug: 'burger-prazo', no_app: true, aceitando: true, faz_entrega: true, faz_retirada: true, tipo_loja: 'hamburgueria', descricao: 'Teste', tempo_entrega: '30 min', pedido_minimo: 0, lat: -22.9, lng: -43.1, raio_km: 8 });
      const cli = A.navegador();
      const novo = async (chave: string) => (await cli.post('/publico/app/loja/burger-prazo/pedido', { chave, nome: 'Rita', telefone: '21999990000', tipo: 'balcao', forma: 'pix', itens: [{ produtoId: p('X-Bacon').id, qtd: 1 }] })).corpo.token as string;

      // 1) Cancela antes de a loja aceitar.
      const t1 = await novo('prazo-cliente-001');
      expect((await cli.get(`/publico/app/pedido/${t1}`)).corpo.pedido.cancelar_ate).toEqual(expect.any(String));
      expect((await cli.post(`/publico/app/pedido/${t1}/cancelar`, {})).status).toBe(200);
      const v1 = (await cli.get(`/publico/app/pedido/${t1}`)).corpo.pedido;
      expect(v1).toMatchObject({ situacao: 'cancelado', cancelado_pelo_cliente: true, cancelar_ate: null });
      expect((await cli.post(`/publico/app/pedido/${t1}/cancelar`, {})).status).toBe(409);

      // 2) Loja aceita; ainda no prazo ela não consegue marcar pronto; o cliente cancela e a venda cai.
      const t2 = await novo('prazo-cliente-002');
      const lista = (await n.get('/pedidos-app')).corpo.pedidos;
      const ped2 = lista.find((x: { cancelado_em: string | null; status: string }) => !x.cancelado_em && x.status === 'aguardando');
      expect(ped2.cancelar_ate).toEqual(expect.any(String));
      const venda = (await n.post(`/pedidos-app/${ped2.id}/aceitar`, {})).corpo.venda_id;
      const esperar = await n.post(`/vendas/${venda}/andamento`, { andamento: 'pronto' });
      expect(esperar.status).toBe(409);
      expect(esperar.corpo.erro).toBe('aguarde_cancelamento');
      expect((await n.get('/andamento')).corpo.pedidos.find((x: { id: string }) => x.id === venda).app_cancelar_ate).toEqual(expect.any(String));
      expect((await cli.post(`/publico/app/pedido/${t2}/cancelar`, {})).status).toBe(200);
      expect((await n.get('/andamento')).corpo.pedidos.some((x: { id: string }) => x.id === venda)).toBe(false);
      expect((await n.get('/pedidos-app')).corpo.pedidos.filter((x: { cancelado_em: string | null }) => x.cancelado_em)).toHaveLength(2);

      // 3) Passou o prazo: o cliente não cancela mais e a loja marca pronto.
      const t3 = await novo('prazo-cliente-003');
      const ped3 = (await n.get('/pedidos-app')).corpo.pedidos.find((x: { status: string; cancelado_em: string | null }) => x.status === 'aguardando' && !x.cancelado_em);
      const venda3 = (await n.post(`/pedidos-app/${ped3.id}/aceitar`, {})).corpo.venda_id;
      A.db.exec(`UPDATE pedidos_online SET criado_em = '${new Date(Date.now() - 6 * 60e3).toISOString()}' WHERE token = '${t3}'`);
      expect((await cli.post(`/publico/app/pedido/${t3}/cancelar`, {})).status).toBe(409);
      expect((await n.post(`/vendas/${venda3}/andamento`, { andamento: 'pronto' })).status).toBe(200);
    } finally { A.env.JANELA_CANCELAR_MIN = '0'; }
  });
});
