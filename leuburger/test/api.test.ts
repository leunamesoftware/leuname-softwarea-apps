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
