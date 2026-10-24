import { CONFIG_PADRAO, tabelaProduto, precoKgReal } from './precos.js';

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
      D.concorrentes.unshift(...r.itens); novos += r.itens.length; desenharLidos(); desenharTabela();
    } catch (er) { if (er.message === 'sessao') return; falhas++; }
  }
  $('#progresso').innerHTML = `✅ Pronto: <b>${novos} anúncio(s)</b> lido(s) e guardado(s) aqui embaixo` + (falhas ? `, ${falhas} print(s) não leram (tente de novo).` : '.') + ' Veja o resultado na aba <b>💰 Tabela</b>.';
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
      </div>${c.gramas > 0 ? '' : '<div class="aviso">⚠️ Sem peso: digite as gramas totais (ex.: kit 20 × 50 g = 1000) para entrar na conta.</div>'}
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
  const disputa = linhas.flatMap((l) => l.formatos.filter((f) => f.concorrentes));
  const ganha = disputa.filter((f) => f.situacao === 'mais_barato').length;
  $('#resumo').innerHTML = disputa.length ? `<div class="resumo dois"><div class="bom"><b>${ganha}</b><span>dá para vender mais barato que todos</span></div>
    <div class="ruim"><b>${disputa.length - ganha}</b><span>concorrente mais barato que o seu custo</span></div></div>` : '';
  const g = (n) => (n >= 1000 ? `${n / 1000} kg` : `${n} g`);
  // Comparação em frases: o que o concorrente cobra, quanto custa para você e o veredito.
  const frase = (f) => {
    const c = f.maisBarato;
    const ok = f.situacao === 'mais_barato';
    return `<div class="comp ${ok ? 'bom' : 'ruim'}">
      <div class="comp-tit">${f.nome}</div>
      <p>🏷️ Concorrente mais barato: <b>${brl(c.preco)}</b> por ${g(c.gramas)}${c.gramas !== f.gramas ? ` (= ${brl(c.equivalente)} por ${g(f.gramas)})` : ''}${c.loja ? ' · ' + esc(c.loja) : ''}</p>
      <p>🧾 Para você fazer ${g(f.gramas)}: <b>${brl(f.custo)}</b> (matéria-prima + embalagem)</p>
      <p>💸 Menor preço sem prejuízo: <b>${brl(f.minimo)}</b> (já paga a Shopee e deixa ${brl(D.config.lucro_min)})</p>
      <p class="veredito">${ok ? `✅ Venda por <b>${brl(f.preco)}</b>: fica mais barato que todos e sobra <b>${brl(f.lucro)}</b>.`
        : `❌ Não dá para bater: o concorrente vende abaixo do seu custo. Se vender por ${brl(f.preco)}, sobra ${brl(f.lucro)}, mas fica mais caro que ele.`}</p></div>`;
  };
  const cartao = (l) => {
    const disp = l.formatos.filter((f) => f.concorrentes), outros = l.formatos.filter((f) => !f.concorrentes);
    return `<div class="card"><h3>${esc(l.produto.nome)}</h3>
      <div class="info">${l.total} anúncio(s) da concorrência · sua matéria-prima: ${brl(l.custo10g * 10)} a cada 100 g</div>
      ${disp.map(frase).join('')}
      ${outros.length ? `<div class="sub">${disp.length ? 'Outros formatos (sem concorrente para comparar)' : 'Preço pelo seu custo (sem concorrente para comparar)'}</div>
      <table><tr><th>Formato</th><th>Vender por</th><th>Sobra p/ você</th></tr>
      ${outros.map((f) => `<tr><td>${f.nome}</td><td><b>${brl(f.preco)}</b></td><td>${brl(f.lucro)}</td></tr>`).join('')}</table>` : ''}
    </div>`;
  };
  const com = linhas.filter((l) => l.total), sem = linhas.filter((l) => !l.total);
  $('#tabela').innerHTML = (com.length ? com.map(cartao).join('') : '<p class="suave">Ainda não há anúncios lidos. Jogue prints na aba 📷 Prints.</p>')
    + (sem.length ? `<details class="card"><summary>Produtos sem concorrente lido (${sem.length}): toque para ver o preço pelo seu custo</summary>${sem.map(cartao).join('')}</details>` : '');
}

/* ---------- custos ---------- */
const NOMES_CFG = { taxa_pct: 'Comissão Shopee (%)', taxa_fixa: 'Taxa fixa Shopee por item (R$)', lucro_min: 'Lucro mínimo por venda (R$)', emb_sache: 'Embalagem sachê 10 g (R$)', emb_kit: 'Saquinho que junta o kit (R$)', emb_50: 'Embalagem pacote 50 g (R$)', emb_100: 'Embalagem pacote 100 g (R$)', etiqueta: 'Adesivo/etiqueta por pacote (R$)' };
const resultadoInsumo = (i) => `Sai a <b>${brl(i.preco_kg)}</b> o kg pronto · <b>${brl(i.preco_kg / 10)}</b> cada 100 g · ${brl(i.preco_kg / 100)} cada 10 g`;
function desenharCustos() {
  $('#insumos').innerHTML = D.insumos.map((i) => `<div class="ins" data-insumo="${esc(i.nome)}"><b>${esc(i.nome)}</b>
    <div class="ins-campos">
      <label>Paguei (R$)<input name="pago" inputmode="decimal" value="${i.pago ?? ''}" placeholder="ex.: 20"></label>
      <label>Comprei (kg)<input name="comprado_kg" inputmode="decimal" value="${i.comprado_kg ?? ''}" placeholder="ex.: 2"></label>
      <label>Rendeu (kg)<input name="rendeu_kg" inputmode="decimal" value="${i.rendeu_kg ?? ''}" placeholder="ex.: 1"></label>
    </div><div class="ins-res">${i.pago == null ? 'Estimativa: ' : ''}${resultadoInsumo(i)}</div></div>`).join('');
  $('#config').innerHTML = Object.entries(NOMES_CFG).map(([k, n]) => `<label>${n}<input data-cfg="${k}" inputmode="decimal" value="${D.config[k]}"></label>`).join('');
}
const num = (v) => (String(v).trim() === '' ? null : Number(String(v).replace(',', '.')));
async function salvarInsumo(e) {
  const el = e.target.closest('.ins'); if (!el) return;
  const nome = el.dataset.insumo, d = { nome };
  ['pago', 'comprado_kg', 'rendeu_kg'].forEach((k) => { d[k] = num(el.querySelector(`[name=${k}]`).value); });
  if (precoKgReal(d.pago, d.comprado_kg, d.rendeu_kg) == null) return; // ainda falta preencher
  const r = await post('/api/insumo', d).catch((er) => { alert(er.message); return null; });
  if (!r) return;
  const i = D.insumos.find((x) => x.nome === nome); Object.assign(i, d, { preco_kg: r.preco_kg });
  el.querySelector('.ins-res').innerHTML = resultadoInsumo(i);
}
async function salvarCampo(e) {
  const v = num(e.target.value);
  if (!(v >= 0)) { e.target.value = ''; return; }
  const k = e.target.dataset.cfg; await post('/api/config', { [k]: v }); D.config[k] = v;
  e.target.style.borderColor = 'var(--verde)';
}
$('#insumos').addEventListener('change', salvarInsumo);
$('#config').addEventListener('change', salvarCampo);

iniciar();
