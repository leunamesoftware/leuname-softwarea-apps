import { CONFIG_PADRAO, tabelaProduto } from './precos.js';

const $ = (s) => document.querySelector(s);
const brl = (v) => (v == null ? '–' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const SITUACAO = { mais_barato: 'Mais barato que todos', acima: 'Não dá p/ ser o mais barato', sem_concorrente: 'Sem concorrente lido' };
let D = null;

async function api(rota, opcoes = {}) {
  const r = await fetch(rota, { ...opcoes, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && rota !== '/api/entrar') { mostrarLogin(); throw new Error('sessao'); }
  if (!r.ok) throw new Error(d.erro || 'Erro. Tente de novo.');
  return d;
}
const post = (rota, corpo, metodo = 'POST') => api(rota, { method: metodo, body: JSON.stringify(corpo || {}) });

function mostrarLogin() { $('#app').hidden = true; $('#sair').hidden = true; $('#login').hidden = false; }

async function iniciar() {
  try { D = await api('/api/dados'); } catch { return; }
  D.config = { ...CONFIG_PADRAO, ...D.config };
  $('#login').hidden = true; $('#app').hidden = false; $('#sair').hidden = false;
  desenharTudo();
}
const desenharTudo = () => { desenharLidos(); desenharTabela(); desenharCustos(); };

/* ---------- login ---------- */
$('#f-login').addEventListener('submit', async (e) => {
  e.preventDefault(); $('#erro-login').textContent = '';
  try { await post('/api/entrar', { senha: $('#senha').value }); $('#senha').value = ''; iniciar(); }
  catch (er) { $('#erro-login').textContent = er.message; }
});
$('#sair').addEventListener('click', async () => { await post('/api/sair').catch(() => {}); mostrarLogin(); });

/* ---------- abas ---------- */
document.querySelectorAll('.abas button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.abas button').forEach((x) => x.classList.toggle('ativo', x === b));
  ['prints', 'tabela', 'custos'].forEach((a) => { $(`#aba-${a}`).hidden = a !== b.dataset.aba; });
  if (b.dataset.aba === 'tabela') desenharTabela();
}));

/* ---------- prints ---------- */
function reduzir(arquivo) {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => {
      const max = 1400, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src); ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => falha(new Error('Não consegui abrir essa imagem.'));
    img.src = URL.createObjectURL(arquivo);
  });
}

$('#arquivos').addEventListener('change', async (e) => {
  const lista = [...e.target.files]; e.target.value = '';
  const loja = $('#loja').value.trim();
  let novos = 0, falhas = 0;
  for (let i = 0; i < lista.length; i++) {
    $('#progresso').textContent = `Lendo print ${i + 1} de ${lista.length}…`;
    try {
      const r = await post('/api/ler-print', { imagem: await reduzir(lista[i]), loja });
      D.concorrentes.unshift(...r.itens); novos += r.itens.length; desenharLidos();
    } catch (er) { if (er.message === 'sessao') return; falhas++; }
  }
  $('#progresso').textContent = `Pronto: ${novos} anúncio(s) lido(s)` + (falhas ? `, ${falhas} print(s) não leram (tente de novo).` : '.');
});

function desenharLidos() {
  const opts = (sel) => `<option value="">— outro produto —</option>` + D.produtos.map((p) => `<option value="${p.id}"${p.id === sel ? ' selected' : ''}>${esc(p.nome)}</option>`).join('');
  $('#qtd').textContent = `(${D.concorrentes.length})`;
  $('#lidos').innerHTML = D.concorrentes.slice(0, 150).map((c) => `
    <div class="item" data-id="${c.id}">
      <div class="tit">${esc(c.anuncio) || 'Anúncio'} <small>${c.loja ? '· ' + esc(c.loja) : ''}${c.vendidos ? ' · ' + c.vendidos + ' vendidos' : ''}${c.gramas > 0 ? ' · ' + brl(c.preco / c.gramas * 100) + ' a cada 100 g' : ''}</small></div>
      <div class="linha">
        <label>Produto<select name="produto_id">${opts(c.produto_id)}</select></label>
        <label>Gramas<input name="gramas" inputmode="decimal" value="${c.gramas ?? ''}"></label>
        <label>Preço R$<input name="preco" inputmode="decimal" value="${c.preco ?? ''}"></label>
        <button class="x" title="Apagar">×</button>
      </div>
    </div>`).join('') || '<p class="suave">Nenhum print lido ainda.</p>';
}
$('#lidos').addEventListener('change', async (e) => {
  const el = e.target.closest('.item'); if (!el) return;
  const c = D.concorrentes.find((x) => String(x.id) === el.dataset.id);
  const num = (v) => (v === '' ? null : Number(String(v).replace(',', '.')));
  Object.assign(c, { produto_id: el.querySelector('[name=produto_id]').value || null, gramas: num(el.querySelector('[name=gramas]').value), preco: num(el.querySelector('[name=preco]').value) || 0 });
  await post(`/api/concorrentes/${c.id}`, c).catch((er) => alert(er.message));
});
$('#lidos').addEventListener('click', async (e) => {
  if (!e.target.classList.contains('x')) return;
  const id = e.target.closest('.item').dataset.id;
  await post(`/api/concorrentes/${id}`, null, 'DELETE').catch(() => {});
  D.concorrentes = D.concorrentes.filter((x) => String(x.id) !== id); desenharLidos();
});
$('#limpar').addEventListener('click', async () => {
  if (!confirm('Apagar todos os anúncios lidos?')) return;
  await post('/api/concorrentes/limpar'); D.concorrentes = []; desenharLidos();
});

/* ---------- tabela ---------- */
function desenharTabela() {
  const linhas = D.produtos.map((p) => tabelaProduto(p, D.insumos, D.config, D.concorrentes, D.produtos));
  const todos = linhas.flatMap((l) => l.formatos.filter((f) => f.formato !== 'sache'));
  const conta = (s) => todos.filter((f) => f.situacao === s).length;
  $('#resumo').innerHTML = `<div class="resumo"><div><b>${conta('mais_barato')}</b><span>dá p/ ser o mais barato</span></div>
    <div><b>${conta('acima')}</b><span>concorrente abaixo do nosso mínimo</span></div><div><b>${conta('sem_concorrente')}</b><span>sem concorrente lido</span></div></div>`;
  $('#tabela').innerHTML = linhas.map((l) => {
    const barato = l.formatos.map((f) => f.maisBarato).filter(Boolean).sort((a, b) => a.preco / a.gramas - b.preco / b.gramas)[0];
    return `<div class="card"><h3>${esc(l.produto.nome)}</h3>
      <div class="info">Custo da matéria-prima: ${brl(l.custo10g)} a cada 10 g · ${l.total} anúncio(s) da concorrência
      ${barato ? `<br>Mais barato do mercado: ${brl(barato.preco)} por ${barato.gramas} g${barato.loja ? ' (' + esc(barato.loja) + ')' : ''}` : ''}</div>
      <table><tr><th>Formato</th><th>Concorrência</th><th>Vender por</th><th>Sobra</th></tr>
      ${l.formatos.map((f) => `<tr><td>${f.nome}<br><span class="tag t-${f.situacao}">${SITUACAO[f.situacao]}</span></td>
        <td>${f.maisBarato ? `de ${brl(f.maisBarato.equivalente)}<br>a ${brl(f.maisCaro.equivalente)}` : '–'}</td>
        <td><b>${brl(f.preco)}</b><br><small class="suave">mín. ${brl(f.minimo)}</small></td>
        <td>${brl(f.lucro)}<br><small class="suave">custo ${brl(f.custo)}</small></td></tr>`).join('')}
      </table></div>`;
  }).join('');
}

/* ---------- custos ---------- */
const NOMES_CFG = { taxa_pct: 'Comissão Shopee (%)', taxa_fixa: 'Taxa fixa Shopee por item (R$)', lucro_min: 'Lucro mínimo por venda (R$)', emb_sache: 'Embalagem sachê 10 g (R$)', emb_kit: 'Saquinho que junta o kit (R$)', emb_50: 'Embalagem pacote 50 g (R$)', emb_100: 'Embalagem pacote 100 g (R$)' };
function desenharCustos() {
  $('#insumos').innerHTML = D.insumos.map((i) => `<label>${esc(i.nome)}<input data-insumo="${esc(i.nome)}" inputmode="decimal" value="${i.preco_kg}"></label>`).join('');
  $('#config').innerHTML = Object.entries(NOMES_CFG).map(([k, n]) => `<label>${n}<input data-cfg="${k}" inputmode="decimal" value="${D.config[k]}"></label>`).join('');
}
async function salvarCampo(e) {
  const v = Number(String(e.target.value).replace(',', '.'));
  if (!(v >= 0)) { e.target.value = ''; return; }
  if (e.target.dataset.insumo) { const n = e.target.dataset.insumo; await post('/api/insumo', { nome: n, preco_kg: v }); D.insumos.find((i) => i.nome === n).preco_kg = v; }
  if (e.target.dataset.cfg) { const k = e.target.dataset.cfg; await post('/api/config', { [k]: v }); D.config[k] = v; }
  e.target.style.borderColor = 'var(--verde)';
}
$('#insumos').addEventListener('change', salvarCampo);
$('#config').addEventListener('change', salvarCampo);

iniciar();
