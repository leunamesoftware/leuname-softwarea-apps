// 🛒 Cadastrar na Shopee: cada produto do site com título, descrição, categoria, variações, preço, peso e medidas
// prontos para copiar e colar na Central do Vendedor (enquanto a ligação automática não é liberada pela Shopee).
import { B, $, esc, brl, aviso } from './erp-base.js';
import { produtosDoSite } from './erp-site.js';
import { frete } from './anuncios.js';

const CATEGORIA = {
  puros: 'Alimentos e Bebidas › Temperos e Especiarias', inteiros: 'Alimentos e Bebidas › Temperos e Especiarias',
  misturas: 'Alimentos e Bebidas › Temperos e Especiarias', brasil: 'Alimentos e Bebidas › Temperos e Especiarias',
  semsal: 'Alimentos e Bebidas › Temperos e Especiarias', churrasco: 'Alimentos e Bebidas › Temperos e Especiarias',
  ervas: 'Alimentos e Bebidas › Temperos e Especiarias', kits: 'Alimentos e Bebidas › Temperos e Especiarias',
  molhos: 'Alimentos e Bebidas › Molhos e Condimentos', pastas: 'Alimentos e Bebidas › Molhos e Condimentos',
  conservas: 'Alimentos e Bebidas › Conservas', doces: 'Alimentos e Bebidas › Doces, Geleias e Compotas',
  amidos: 'Alimentos e Bebidas › Farinhas e Amidos', graos: 'Alimentos e Bebidas › Grãos e Cereais',
  chas: 'Alimentos e Bebidas › Bebidas › Chás', sopas: 'Alimentos e Bebidas › Comidas Prontas e Sopas',
  desidratados: 'Alimentos e Bebidas › Frutas e Legumes Desidratados', chef: 'Casa e Construção › Cozinha › Utensílios de Cozinha',
};
let dados = null, linhaSel = 'todas', busca = '', mostrar = 'pendentes', carregando = false;

/** Peso em gramas do tamanho ("10 g", "1 kg", "150 ml" ≈ g); null quando não é peso (unidade, kit). */
export function gramasDe(t) {
  const m = String(t).replace(',', '.').match(/^([\d.]+)\s*(g|kg|ml|l)$/i);
  if (!m) return null;
  const n = Number(m[1]), u = m[2].toLowerCase();
  return u === 'kg' || u === 'l' ? n * 1000 : n;
}
const semEspaco = (t) => String(t).replace(/\s+/g, '');
const codigo = (p, t) => `${p.id}-${semEspaco(t)}`.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40);

/** Preço do ERP para esse sabor e tamanho (produto avulso com o mesmo nome e gramas), se já tiver. */
function precoErp(p, t) {
  const g = gramasDe(t), nome = p.nome.toLowerCase();
  const s = (B.E?.skus || []).find((x) => x.ativo && x.unidades === 1 && x.gramas === g && x.nome.toLowerCase().startsWith(nome));
  return s && s.preco > 0 ? s.preco : null;
}

/** Monta o anúncio do produto: título (até 120), descrição, categoria e variações. */
export function montar(p, linhas) {
  const ln = linhas.find((l) => l.id === p.linha) || {};
  const tams = p.tam || [];
  const titulo = `${p.nome} Supermisto${ln.nome ? ' ' + ln.nome : ''}${tams.length ? ' ' + tams.map(semEspaco).join(' ') : ''}`.replace(/\s+/g, ' ').slice(0, 120);
  const ficha = [['Ingredientes', p.ingredientes], ['Conservação', p.conservacao], ['Validade', p.validade], ['Alérgicos', p.alergicos]].filter(([, v]) => v);
  const descricao = [
    `${p.nome} Supermisto`,
    '',
    p.desc || '',
    p.usos ? `\n🍽️ Combina com: ${p.usos}` : '',
    tams.length ? `\n📦 Embalagens: ${tams.join(', ')}` : '',
    ficha.length ? '\n' + ficha.map(([k, v]) => `• ${k}: ${v}`).join('\n') : '',
    '',
    '🏭 Fabricado e embalado pela Supermisto Temperos, em Duque de Caxias (RJ).',
    '💬 Dúvidas ou compra em quantidade? Chame no chat.',
    '',
    `#supermisto #${(ln.nome || 'temperos').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '')} #${p.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '')}`,
  ].filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n').trim();
  const variacoes = tams.map((t) => {
    const g = gramasDe(t), liq = /ml|l$/i.test(t), f = g ? frete(1, liq ? g + 250 : g) : null; // garrafa de vidro pesa ~250 g
    return { nome: t, codigo: codigo(p, t), preco: precoErp(p, t), peso: f ? f.kg : null, caixa: f ? f.caixa : null };
  });
  return { titulo, descricao, categoria: CATEGORIA[p.linha] || CATEGORIA.misturas, variacoes, linha: ln.nome || '' };
}

async function desenhar() {
  const el = $('#cad-lista'); if (!el || $('#aba-cadastro').hidden) return;
  if (!dados && !carregando) {
    carregando = true; el.innerHTML = '<p class="suave">Carregando os produtos do site…</p>';
    try { dados = await produtosDoSite(); } catch { el.innerHTML = '<p class="erro">Não consegui abrir o catálogo do site. Confira a internet e toque de novo.</p>'; carregando = false; return; }
    carregando = false;
  }
  if (!dados) return;
  const vis = dados.produtos.filter((p) => !p.oculto);
  const feitos = vis.filter((p) => dados.cadastrados[p.id]).length;
  $('#cad-resumo').innerHTML = `<div class="kpis"><div class="kpi"><span>No site</span><b>${vis.length}</b><small>produtos</small></div>
    <div class="kpi bom"><span>Já na Shopee</span><b>${feitos}</b><small>marcados por você</small></div>
    <div class="kpi alerta"><span>Faltam</span><b>${vis.length - feitos}</b><small>para cadastrar</small></div></div>`;
  $('#cad-linhas').innerHTML = [['todas', 'Todas'], ...dados.linhas.map((l) => [l.id, l.nome])].map(([k, n]) => `<button data-cl="${k}" class="${k === linhaSel ? 'ativo' : ''}">${esc(n)}</button>`).join('');
  $('#cad-mostrar').querySelectorAll('button').forEach((b) => b.classList.toggle('ativo', b.dataset.cm === mostrar));
  const q = busca.toLowerCase();
  const ls = vis.filter((p) => (linhaSel === 'todas' || p.linha === linhaSel) && (!q || p.nome.toLowerCase().includes(q))
    && (mostrar === 'todos' || (mostrar === 'feitos') === !!dados.cadastrados[p.id]));
  el.innerHTML = ls.map((p) => {
    const a = montar(p, dados.linhas), feito = dados.cadastrados[p.id];
    return `<details class="cad${feito ? ' feito' : ''}" data-cad="${p.id}">
      <summary><img src="${esc(dados.fotoDe(p))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span><b>${esc(p.nome)}</b><small>${esc(a.linha)} · ${a.variacoes.length} variação(ões)${feito ? ` · ✅ cadastrado em ${feito.split('-').reverse().join('/')}` : ''}</small></span></summary>
      <div class="cad-corpo">
        ${campo('Título', a.titulo, `${a.titulo.length}/120`)}
        ${campo('Categoria (sugestão)', a.categoria)}
        ${campo('Descrição', a.descricao, '', true)}
        ${campo('Marca', 'Supermisto')}
        <div class="cad-campo"><div class="cad-rot"><b>Variações</b><button type="button" class="cad-cp" data-copiar="${esc(a.variacoes.map((v) => v.nome).join('\n'))}">Copiar nomes</button></div>
          <table class="cad-var"><tr><th>Variação</th><th>Código (SKU)</th><th>Preço</th><th>Peso envio</th><th>Caixa (cm)</th></tr>
          ${a.variacoes.map((v) => `<tr><td><b>${esc(v.nome)}</b></td><td><button type="button" class="cad-cp mini" data-copiar="${v.codigo}">${v.codigo}</button></td>
            <td>${v.preco ? `<button type="button" class="cad-cp mini" data-copiar="${v.preco.toFixed(2).replace('.', ',')}">${brl(v.preco)}</button>` : '<span class="cad-falta" title="Defina na aba Produtos ou Tabela de preços">definir</span>'}</td>
            <td>${v.peso ? `<button type="button" class="cad-cp mini" data-copiar="${String(v.peso).replace('.', ',')}">${String(v.peso).replace('.', ',')} kg</button>` : '<span class="cad-falta">pesar</span>'}</td>
            <td>${v.caixa ? v.caixa.join(' × ') : '<span class="cad-falta">medir</span>'}</td></tr>`).join('')}</table></div>
        <p class="suave">📷 Fotos: use a foto do produto (até 9 por anúncio, a 1ª é a capa). Baixe a do site tocando aqui:
          <a href="${esc(dados.fotoDe(p))}" target="_blank" rel="noopener" download>abrir foto</a>.</p>
        <label class="cad-feito"><input type="checkbox" data-feito="${p.id}"${feito ? ' checked' : ''}> Já cadastrei na Shopee</label>
      </div></details>`;
  }).join('') || `<p class="suave">${mostrar === 'pendentes' ? '🎉 Nenhum produto faltando nessa linha.' : 'Nenhum produto.'}</p>`;
}
const campo = (rot, txt, extra = '', grande = false) => `<div class="cad-campo"><div class="cad-rot"><b>${rot}</b>${extra ? `<small>${extra}</small>` : ''}<button type="button" class="cad-cp" data-copiar="${esc(txt)}">Copiar</button></div><div class="cad-txt${grande ? ' grande' : ''}">${esc(txt)}</div></div>`;

async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); }
  catch { const t = document.createElement('textarea'); t.value = txt; document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
}
document.addEventListener('click', async (e) => {
  const c = e.target.closest('[data-copiar]'); if (c) { await copiar(c.dataset.copiar); c.classList.add('ok'); setTimeout(() => c.classList.remove('ok'), 1200); aviso('📋 Copiado. Agora é só colar na Shopee.'); return; }
  const l = e.target.closest('[data-cl]'); if (l) { linhaSel = l.dataset.cl; desenhar(); return; }
  const m = e.target.closest('[data-cm]'); if (m) { mostrar = m.dataset.cm; desenhar(); return; }
  if (e.target.id === 'cad-recarregar') { dados = null; desenhar(); }
});
document.addEventListener('input', (e) => { if (e.target.id === 'cad-busca') { busca = e.target.value; desenhar(); } });
document.addEventListener('change', async (e) => {
  const f = e.target.closest('[data-feito]'); if (!f) return;
  try {
    await B.post('/api/erp/site/cadastrado', { slug: f.dataset.feito, feito: f.checked });
    if (f.checked) dados.cadastrados[f.dataset.feito] = new Date().toISOString().slice(0, 10); else delete dados.cadastrados[f.dataset.feito];
    aviso(f.checked ? '✅ Marcado como cadastrado na Shopee.' : 'Desmarcado.'); desenhar();
  } catch (err) { f.checked = !f.checked; aviso(err.message || 'Não consegui salvar.', false); }
});
B.desenhar.push(desenhar);
