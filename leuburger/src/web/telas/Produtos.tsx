// Produtos: cardápio, categorias, personalização (tamanhos, adicionais, retirar) e baixa de estoque.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { brl, lerValor } from '../../regras/pedido';
import { del, get, post, put } from '../api';
import { carregarCardapio, type Categoria, type Produto } from '../cardapio';
import { Carregando, Falha, FotoProduto, Modal, msgErro, reduzirFoto, useAviso, useConfirmar, useDados, Vazio } from '../comuns';
import { Ic } from '../icones';
import { Cabeca } from '../Layout';

const reais = (c: number | undefined) => (c ? (c / 100).toFixed(2).replace('.', ',') : '');
const ICONES = [['hamburguer', 'Hambúrgueres'], ['porcao', 'Porções'], ['bebida', 'Bebidas'], ['combo', 'Combos'], ['sobremesa', 'Sobremesas'], ['acai', 'Açaí'], ['outro', 'Outros']];

export function Produtos() {
  const d = useDados(carregarCardapio);
  const [params, setParams] = useSearchParams();
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState(params.get('cat') || '');
  const [situacao, setSituacao] = useState('ativos');
  const [editar, setEditar] = useState<Produto | 'novo' | null>(params.get('novo') ? 'novo' : null);
  const [cats, setCats] = useState(Boolean(params.get('categorias')));
  const aviso = useAviso();
  const confirmar = useConfirmar();
  useEffect(() => { if (params.get('novo') || params.get('categorias')) setParams({}, { replace: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (d.carregando && !d.dados) return <Carregando />;
  if (d.erro && !d.dados) return <Falha erro={d.erro} tentar={d.recarregar} />;
  const { produtos, categorias } = d.dados!;
  const q = busca.trim().toLowerCase();
  const lista = produtos.filter((p) => (situacao === 'ativos' ? p.ativo : situacao === 'inativos' ? !p.ativo : true) && (!cat || p.categoria_id === cat)
    && (!q || p.nome.toLowerCase().includes(q) || (p.codigo || '').includes(q) || (p.categoria || '').toLowerCase().includes(q)));
  const apagar = async (p: Produto) => {
    if (!(await confirmar(`Tirar "${p.nome}" do cardápio? Ele continua nas vendas antigas.`, { sim: 'Tirar do cardápio', perigo: true }))) return;
    try { await del(`/produtos/${p.id}`); aviso('Produto tirado do cardápio.'); d.recarregar(); } catch (e) { aviso(msgErro(e), 'erro'); }
  };
  return (
    <>
      <Cabeca titulo="Produtos" sub="Gerencie os produtos do seu cardápio.">
        <button className="btn" onClick={() => setCats(true)}><Ic n="tag" />Categorias</button>
        <button className="btn prim" onClick={() => (categorias.length ? setEditar('novo') : (aviso('Crie uma categoria primeiro.', 'erro'), setCats(true)))}><Ic n="mais" />Novo Produto</button>
      </Cabeca>
      <div className="busca-barra" style={{ marginBottom: 14 }}>
        <span className="entrada"><Ic n="busca" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto pelo nome, categoria ou código…" aria-label="Buscar produto" /></span>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria"><option value="">Todas as categorias</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
        <select value={situacao} onChange={(e) => setSituacao(e.target.value)} aria-label="Situação"><option value="ativos">Ativos</option><option value="inativos">Inativos</option><option value="todos">Todos os status</option></select>
      </div>
      {!lista.length ? <div className="cartao">{produtos.length ? <Vazio icone="busca" titulo="Nenhum produto encontrado" /> : <SemCardapio aoCriar={d.recarregar} />}</div> : <>
        <div className="cartao tabela-cartao so-pc"><div className="tabela"><table>
          <thead><tr><th>Produto</th><th>Categoria</th><th className="dir">Custo</th><th className="dir">Preço de venda</th><th>Código</th><th>Status</th><th className="dir">Ações</th></tr></thead>
          <tbody>{lista.map((p) => (
            <tr key={p.id}>
              <td><span className="prod-celula"><FotoProduto fotoId={p.foto_id} icone={p.categoria_icone} nome={p.nome} className="mini" />{p.nome}</span></td>
              <td><span className={`selo cat-${p.categoria_icone}`}>{p.categoria || '—'}</span></td>
              <td className="dir num">{brl(p.custo)}</td><td className="dir num"><b>{brl(p.preco)}</b></td><td className="num">{p.codigo || '—'}</td>
              <td><span className={`selo ${p.ativo ? 'ok' : ''}`}>{p.ativo ? 'Ativo' : 'Inativo'}</span></td>
              <td className="dir"><button className="btn-ic" onClick={() => setEditar(p)} aria-label={`Editar ${p.nome}`}><Ic n="lapis" /></button>{p.ativo && <button className="btn-ic vermelho" onClick={() => apagar(p)} aria-label={`Tirar ${p.nome}`}><Ic n="lixeira" /></button>}</td>
            </tr>
          ))}</tbody>
        </table></div></div>
        <div className="lista-movel so-movel">{lista.map((p) => (
          <button key={p.id} className="item-movel" onClick={() => setEditar(p)}>
            <FotoProduto fotoId={p.foto_id} icone={p.categoria_icone} nome={p.nome} className="mini" />
            <span className="meio"><b>{p.nome}</b><span className={`selo cat-${p.categoria_icone}`}>{p.categoria}</span></span>
            <span className="fim"><b className="num">{brl(p.preco)}</b><small>{p.ativo ? `Custo ${brl(p.custo)}` : 'Inativo'}</small></span>
            <Ic n="direita" />
          </button>
        ))}</div>
      </>}
      {editar && <FormProduto produto={editar === 'novo' ? null : editar} categorias={categorias} aoFechar={() => setEditar(null)} aoSalvar={() => { setEditar(null); d.recarregar(); }} />}
      {cats && <Categorias categorias={categorias} aoFechar={() => setCats(false)} aoMudar={d.recarregar} />}
    </>
  );
}

function SemCardapio({ aoCriar }: { aoCriar: () => void }) {
  const aviso = useAviso();
  const [ocupado, setOcupado] = useState(false);
  return <Vazio icone="produtos" titulo="Nenhum produto cadastrado" texto="Cadastre o seu cardápio ou comece com um exemplo pronto (hambúrgueres, porções, bebidas e combos) e mude depois.">
    <button className="btn prim" disabled={ocupado} onClick={async () => { setOcupado(true); try { await post('/exemplo'); aviso('Cardápio de exemplo criado.'); aoCriar(); } catch (e) { aviso(msgErro(e), 'erro'); } finally { setOcupado(false); } }}>Usar cardápio de exemplo</button>
  </Vazio>;
}

type Linha = { nome: string; preco: string };
function FormProduto({ produto, categorias, aoFechar, aoSalvar }: { produto: Produto | null; categorias: Categoria[]; aoFechar: () => void; aoSalvar: () => void }) {
  const aviso = useAviso();
  const itensEstoque = useDados(() => get<{ itens: { id: string; nome: string; unidade: string }[] }>('/estoque'));
  const p = produto;
  const [f, setF] = useState({ nome: p?.nome || '', descricao: p?.descricao || '', codigo: p?.codigo || '', categoria_id: p?.categoria_id || categorias[0]?.id || '', preco: reais(p?.preco), custo: reais(p?.custo), ativo: p?.ativo ?? true });
  const [foto, setFoto] = useState<string | null>(p?.foto_id || null);
  const [tamanhos, setTamanhos] = useState<Linha[]>((p?.opcoes.tamanhos || []).map((t) => ({ nome: t.nome, preco: reais(t.preco) })));
  const [adicionais, setAdicionais] = useState<Linha[]>((p?.opcoes.adicionais || []).map((t) => ({ nome: t.nome, preco: reais(t.preco) })));
  const [retirar, setRetirar] = useState((p?.opcoes.retirar || []).join(', '));
  const [receita, setReceita] = useState<{ item_id: string; qtd: string }[]>((p?.receita || []).map((r) => ({ item_id: r.item_id, qtd: String(r.qtd).replace('.', ',') })));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setErros({ ...erros, [k]: '' }); };
  const margem = (() => { const pv = lerValor(f.preco), c = lerValor(f.custo); return pv > 0 && c >= 0 && !Number.isNaN(c) ? Math.round(((pv - c) / pv) * 100) : null; })();

  const escolherFoto = async (arq?: File) => {
    if (!arq) return;
    try { setOcupado(true); const dados = await reduzirFoto(arq); const r = await post<{ id: string }>('/fotos', { dados }); setFoto(r.id); }
    catch (e) { aviso(msgErro(e), 'erro'); } finally { setOcupado(false); }
  };
  const salvar = async () => {
    const e: Record<string, string> = {};
    const preco = lerValor(f.preco), custo = lerValor(f.custo);
    if (!f.nome.trim()) e.nome = 'Digite o nome do produto.';
    if (!f.categoria_id) e.categoria_id = 'Escolha a categoria.';
    if (!f.preco.trim() || Number.isNaN(preco) || preco <= 0) e.preco = 'Digite o preço de venda.';
    if (Number.isNaN(custo)) e.custo = 'Custo inválido.';
    const conv = (l: Linha[], campo: string) => l.filter((x) => x.nome.trim()).map((x) => { const v = lerValor(x.preco); if (Number.isNaN(v)) e[campo] = 'Confira os preços.'; return { nome: x.nome.trim(), preco: v }; });
    const t = conv(tamanhos, 'tamanhos'), a = conv(adicionais, 'adicionais');
    const rec = receita.filter((r) => r.item_id).map((r) => { const q = Number(r.qtd.replace(',', '.')); if (!(q > 0)) e.receita = 'Quantidade inválida na baixa de estoque.'; return { item_id: r.item_id, qtd: q }; });
    if (Object.keys(e).length) return setErros(e);
    setOcupado(true);
    const dados = { nome: f.nome.trim(), descricao: f.descricao.trim() || null, codigo: f.codigo.trim() || null, categoria_id: f.categoria_id, preco, custo, foto_id: foto, ativo: f.ativo,
      opcoes: { tamanhos: t, adicionais: a, retirar: retirar.split(',').map((x) => x.trim()).filter(Boolean) }, receita: rec };
    try {
      if (p) await put(`/produtos/${p.id}`, dados); else await post('/produtos', dados);
      aviso(p ? 'Produto salvo.' : 'Produto cadastrado.'); aoSalvar();
    } catch (err: any) { setErros(err?.campos || {}); aviso(msgErro(err), 'erro'); } finally { setOcupado(false); } // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  const ListaOpcoes = ({ titulo, lista, set, dica }: { titulo: string; lista: Linha[]; set: (l: Linha[]) => void; dica: string }) => (
    <div className="largo">
      <b style={{ fontSize: 14 }}>{titulo}</b><p style={{ margin: '2px 0 8px', color: 'var(--suave)', fontSize: 13 }}>{dica}</p>
      {lista.map((x, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 120px 40px', gap: 8, marginBottom: 8 }}>
          <input value={x.nome} onChange={(e) => set(lista.map((y, k) => (k === i ? { ...y, nome: e.target.value } : y)))} placeholder="Nome" aria-label={`${titulo}: nome`} />
          <input value={x.preco} onChange={(e) => set(lista.map((y, k) => (k === i ? { ...y, preco: e.target.value } : y)))} placeholder="R$" inputMode="decimal" aria-label={`${titulo}: preço`} />
          <button className="btn-ic vermelho" onClick={() => set(lista.filter((_, k) => k !== i))} aria-label="Tirar"><Ic n="lixeira" /></button>
        </div>
      ))}
      <button className="btn peq" onClick={() => set([...lista, { nome: '', preco: '' }])}><Ic n="mais" t={16} />Adicionar</button>
    </div>
  );
  return (
    <Modal titulo={p ? 'Editar produto' : 'Novo produto'} aoFechar={aoFechar} largo pe={<><button className="btn" onClick={aoFechar}>Voltar</button><button className="btn prim" onClick={salvar} disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar'}</button></>}>
      <div className="campos">
        <div className="largo" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <FotoProduto fotoId={foto} icone={categorias.find((c) => c.id === f.categoria_id)?.icone} nome={f.nome} className="mini" />
          <label className="btn"><Ic n="foto" />{foto ? 'Trocar foto' : 'Colocar foto'}<input type="file" accept="image/*" hidden onChange={(e) => escolherFoto(e.target.files?.[0])} /></label>
          {foto && <button className="link" onClick={() => setFoto(null)}>Tirar foto</button>}
        </div>
        <label className="campo largo">Nome do produto<input value={f.nome} onChange={muda('nome')} maxLength={60} aria-invalid={Boolean(erros.nome)} />{erros.nome && <small className="erro">{erros.nome}</small>}</label>
        <label className="campo largo">Descrição (aparece ao personalizar)<input value={f.descricao} onChange={muda('descricao')} maxLength={200} placeholder="Ex.: Pão, hambúrguer, queijo, bacon e molho especial." /></label>
        <label className="campo">Categoria<select value={f.categoria_id} onChange={muda('categoria_id')} aria-invalid={Boolean(erros.categoria_id)}>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>{erros.categoria_id && <small className="erro">{erros.categoria_id}</small>}</label>
        <label className="campo">Código de barras ou código interno<input value={f.codigo} onChange={muda('codigo')} maxLength={30} inputMode="numeric" aria-invalid={Boolean(erros.codigo)} />{erros.codigo && <small className="erro">{erros.codigo}</small>}</label>
        <label className="campo">Preço de venda (R$)<input value={f.preco} onChange={muda('preco')} inputMode="decimal" aria-invalid={Boolean(erros.preco)} />{erros.preco && <small className="erro">{erros.preco}</small>}</label>
        <label className="campo">Custo (R$){margem != null && <small style={{ color: margem < 30 ? 'var(--vermelho)' : 'var(--verde)', fontWeight: 700 }}>margem {margem}%</small>}<input value={f.custo} onChange={muda('custo')} inputMode="decimal" aria-invalid={Boolean(erros.custo)} />{erros.custo && <small className="erro">{erros.custo}</small>}</label>
        <label className="campo">Situação<select value={f.ativo ? '1' : '0'} onChange={(e) => setF({ ...f, ativo: e.target.value === '1' })}><option value="1">Ativo (aparece no caixa)</option><option value="0">Inativo</option></select></label>
        <hr className="largo" style={{ border: 0, borderTop: '1px solid var(--linha)', margin: '4px 0' }} />
        <ListaOpcoes titulo="Tamanhos" lista={tamanhos} set={setTamanhos} dica="Opcional. O preço do tamanho substitui o preço de venda (ex.: Padrão R$ 22,90 · Duplo R$ 28,90)." />
        {erros.tamanhos && <small className="erro largo">{erros.tamanhos}</small>}
        <ListaOpcoes titulo="Adicionais" lista={adicionais} set={setAdicionais} dica="Opcional. Somam no preço (ex.: Queijo extra + R$ 3,00)." />
        {erros.adicionais && <small className="erro largo">{erros.adicionais}</small>}
        <label className="campo largo">Pode retirar (separe por vírgula)<input value={retirar} onChange={(e) => setRetirar(e.target.value)} placeholder="Ex.: Cebola, Tomate, Alface" /></label>
        <div className="largo">
          <b style={{ fontSize: 14 }}>Baixa de estoque</b><p style={{ margin: '2px 0 8px', color: 'var(--suave)', fontSize: 13 }}>O que sai do estoque a cada unidade vendida (ex.: 1 pão, 0,12 kg de carne).</p>
          {receita.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 110px 40px', gap: 8, marginBottom: 8 }}>
              <select value={r.item_id} onChange={(e) => setReceita(receita.map((y, k) => (k === i ? { ...y, item_id: e.target.value } : y)))} aria-label="Item de estoque">
                <option value="">Escolha o item</option>{(itensEstoque.dados?.itens || []).map((it) => <option key={it.id} value={it.id}>{it.nome} ({it.unidade})</option>)}
              </select>
              <input value={r.qtd} onChange={(e) => setReceita(receita.map((y, k) => (k === i ? { ...y, qtd: e.target.value } : y)))} inputMode="decimal" placeholder="Qtd" aria-label="Quantidade" />
              <button className="btn-ic vermelho" onClick={() => setReceita(receita.filter((_, k) => k !== i))} aria-label="Tirar"><Ic n="lixeira" /></button>
            </div>
          ))}
          <button className="btn peq" onClick={() => setReceita([...receita, { item_id: '', qtd: '1' }])}><Ic n="mais" t={16} />Adicionar item</button>
          {erros.receita && <small className="erro" style={{ display: 'block' }}>{erros.receita}</small>}
        </div>
      </div>
    </Modal>
  );
}

function Categorias({ categorias, aoFechar, aoMudar }: { categorias: Categoria[]; aoFechar: () => void; aoMudar: () => void }) {
  const aviso = useAviso();
  const [nova, setNova] = useState({ nome: '', icone: 'hamburguer' });
  const [edit, setEdit] = useState<Record<string, { nome: string; icone: string }>>({});
  const salvarNova = async () => {
    if (!nova.nome.trim()) return aviso('Digite o nome da categoria.', 'erro');
    try { await post('/categorias', { ...nova, ordem: categorias.length + 1 }); setNova({ nome: '', icone: 'hamburguer' }); aviso('Categoria criada.'); aoMudar(); } catch (e) { aviso(msgErro(e), 'erro'); }
  };
  const salvar = async (c: Categoria) => {
    const e = edit[c.id]; if (!e) return;
    try { await put(`/categorias/${c.id}`, { nome: e.nome, icone: e.icone, ordem: c.ordem }); setEdit((x) => { const y = { ...x }; delete y[c.id]; return y; }); aviso('Categoria salva.'); aoMudar(); } catch (err) { aviso(msgErro(err), 'erro'); }
  };
  const apagar = async (c: Categoria) => { try { await del(`/categorias/${c.id}`); aviso('Categoria apagada.'); aoMudar(); } catch (e) { aviso(msgErro(e), 'erro'); } };
  return (
    <Modal titulo="Categorias" aoFechar={aoFechar}>
      <div style={{ display: 'grid', gap: 8 }}>
        {categorias.map((c) => { const e = edit[c.id] || { nome: c.nome, icone: c.icone }; return (
          <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '130px minmax(0,1fr) auto', gap: 8, alignItems: 'center' }}>
            <select value={e.icone} onChange={(x) => setEdit({ ...edit, [c.id]: { ...e, icone: x.target.value } })} aria-label="Tipo">{ICONES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
            <input value={e.nome} onChange={(x) => setEdit({ ...edit, [c.id]: { ...e, nome: x.target.value } })} aria-label="Nome da categoria" />
            <span style={{ display: 'flex' }}>{edit[c.id] ? <button className="btn peq prim" onClick={() => salvar(c)}>Salvar</button> : <button className="btn-ic vermelho" onClick={() => apagar(c)} aria-label={`Apagar ${c.nome}`} title={c.qtd_produtos ? `${c.qtd_produtos} produto(s)` : ''}><Ic n="lixeira" /></button>}</span>
          </div>
        ); })}
        <div style={{ display: 'grid', gridTemplateColumns: '130px minmax(0,1fr) auto', gap: 8, alignItems: 'center', marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--linha)' }}>
          <select value={nova.icone} onChange={(e) => setNova({ ...nova, icone: e.target.value })} aria-label="Tipo da nova categoria">{ICONES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
          <input value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} placeholder="Nova categoria" onKeyDown={(e) => e.key === 'Enter' && salvarNova()} aria-label="Nome da nova categoria" />
          <button className="btn prim peq" onClick={salvarNova}><Ic n="mais" t={16} />Criar</button>
        </div>
      </div>
    </Modal>
  );
}
