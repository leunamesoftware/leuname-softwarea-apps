// Frente de caixa: escolher produtos, personalizar e montar o pedido.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { brl, lerValor } from '../../regras/pedido';
import { get, post } from '../api';
import { calcularPedido, carregarCardapio, temOpcoes, textoEscolhas, type Linha, type Produto } from '../cardapio';
import { Carregando, Falha, FotoProduto, Modal, msgErro, useAviso, useConfirmar, useDados, Vazio } from '../comuns';
import { Ic } from '../icones';
import { Cabeca } from '../Layout';
import { usePedido, useSessao, type ItemCarrinho } from '../sessao';

const novaChaveItem = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function Caixa() {
  const cardapio = useDados(carregarCardapio);
  const caixa = useDados(() => get<{ caixa: { id: string } | null }>('/caixa'));
  const { mudar } = usePedido();
  const [cat, setCat] = useState('');
  const [busca, setBusca] = useState('');
  const [editar, setEditar] = useState<{ produto: Produto; item?: ItemCarrinho } | null>(null);
  const [verCarrinho, setVerCarrinho] = useState(false);
  const aviso = useAviso();
  const buscaRef = useRef<HTMLInputElement>(null);

  // Atalho: F2 (ou /) vai para a busca.
  useEffect(() => {
    const t = (e: KeyboardEvent) => { if ((e.key === 'F2' || (e.key === '/' && document.activeElement?.tagName !== 'INPUT')) && !document.querySelector('.fundo-modal')) { e.preventDefault(); buscaRef.current?.focus(); } };
    addEventListener('keydown', t); return () => removeEventListener('keydown', t);
  }, []);

  if (cardapio.carregando && !cardapio.dados) return <Carregando />;
  if (cardapio.erro && !cardapio.dados) return <Falha erro={cardapio.erro} tentar={cardapio.recarregar} />;
  const { produtos, categorias } = cardapio.dados!;
  const ativos = produtos.filter((p) => p.ativo);
  const q = busca.trim().toLowerCase();
  const lista = ativos.filter((p) => (q ? p.nome.toLowerCase().includes(q) || (p.codigo || '').toLowerCase() === q : !cat || p.categoria_id === cat));

  const adicionar = (p: Produto) => {
    if (temOpcoes(p)) return setEditar({ produto: p });
    mudar((ped) => {
      const igual = ped.itens.find((i) => i.produtoId === p.id && !i.adicionais?.length && !i.retirar?.length && !i.observacao && !i.tamanho);
      if (igual) return { ...ped, itens: ped.itens.map((i) => (i === igual ? { ...i, qtd: Math.min(999, i.qtd + 1) } : i)) };
      return { ...ped, itens: [...ped.itens, { chaveItem: novaChaveItem(), produtoId: p.id, qtd: 1 }] };
    });
    aviso(`${p.nome} adicionado`);
  };
  // Leitor de código de barras (ou Enter na busca): código exato entra direto no pedido.
  const enter = () => {
    const exato = ativos.find((p) => p.codigo && p.codigo.toLowerCase() === q);
    if (exato) { adicionar(exato); setBusca(''); return; }
    if (lista.length === 1) { adicionar(lista[0]); setBusca(''); }
  };

  return (
    <>
      <Cabeca titulo="Frente de Caixa" sub="Selecione os produtos e monte o pedido." />
      {caixa.dados && !caixa.dados.caixa && <AbrirCaixa aoAbrir={caixa.recarregar} />}
      <div className="pdv">
        <section className="pdv-produtos" aria-label="Produtos">
          <div className="entrada"><Ic n="busca" />
            <input ref={buscaRef} value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); enter(); } }} placeholder="Buscar produto pelo nome ou código… (F2)" aria-label="Buscar produto" />
            <span className="depois" style={{ color: '#9CA3AF', paddingRight: 8 }} title="Leitor de código de barras: aponte e o produto entra no pedido"><Ic n="barras" /></span>
          </div>
          {!q && <div className="chips" role="tablist">
            <button className={`chip ${!cat ? 'sel' : ''}`} onClick={() => setCat('')}><Ic n="outro" t={18} />Todos</button>
            {categorias.map((c) => <button key={c.id} className={`chip ${cat === c.id ? 'sel' : ''}`} onClick={() => setCat(c.id)}><Ic n={c.icone} t={18} />{c.nome}</button>)}
          </div>}
          {lista.length ? (
            <div className="produtos-grade">
              {lista.map((p) => (
                <button key={p.id} className="produto-cartao" onClick={() => adicionar(p)} aria-label={`Adicionar ${p.nome}, ${brl(p.preco)}`}>
                  <FotoProduto fotoId={p.foto_id} icone={p.categoria_icone} nome={p.nome} />
                  <div className="info"><b>{p.nome}</b><span className="num">{brl(p.preco)}</span></div>
                  <span className="add"><Ic n="mais" t={18} /></span>
                </button>
              ))}
            </div>
          ) : ativos.length ? <Vazio icone="busca" titulo="Nenhum produto encontrado" texto="Confira o nome ou o código." />
            : <SemProdutos aoCriar={cardapio.recarregar} />}
        </section>
        <Carrinho linhasProdutos={produtos} aberto={verCarrinho} aoFechar={() => setVerCarrinho(false)} aoEditar={(produto, item) => setEditar({ produto, item })} caixaAberto={Boolean(caixa.dados?.caixa)} />
      </div>
      <ResumoMovel produtos={produtos} aoAbrir={() => setVerCarrinho(true)} />
      {editar && <Personalizar produto={editar.produto} item={editar.item} aoFechar={() => setEditar(null)} />}
    </>
  );
}

function SemProdutos({ aoCriar }: { aoCriar: () => void }) {
  const { pode } = useSessao();
  const aviso = useAviso();
  const nav = useNavigate();
  const [ocupado, setOcupado] = useState(false);
  return (
    <Vazio icone="produtos" titulo="Seu cardápio está vazio" texto={pode('produtos') ? 'Cadastre os seus produtos ou comece com um cardápio de exemplo (você muda tudo depois).' : 'Peça ao administrador para cadastrar os produtos.'}>
      {pode('produtos') && <div className="dupla" style={{ marginTop: 8 }}>
        <button className="btn" onClick={() => nav('/produtos?novo=1')}>Cadastrar produto</button>
        <button className="btn prim" disabled={ocupado} onClick={async () => { setOcupado(true); try { await post('/exemplo'); aviso('Cardápio de exemplo criado.'); aoCriar(); } catch (e) { aviso(msgErro(e), 'erro'); } finally { setOcupado(false); } }}>Usar cardápio de exemplo</button>
      </div>}
    </Vazio>
  );
}

function AbrirCaixa({ aoAbrir }: { aoAbrir: () => void }) {
  const [fundo, setFundo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const aviso = useAviso();
  const abrir = async () => {
    const v = lerValor(fundo);
    if (Number.isNaN(v)) return aviso('Valor do troco inválido.', 'erro');
    setOcupado(true);
    try { await post('/caixa/abrir', { fundo: v }); aviso('Caixa aberto. Boas vendas!'); aoAbrir(); } catch (e) { aviso(msgErro(e), 'erro'); } finally { setOcupado(false); }
  };
  return (
    <div className="aviso" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
      <Ic n="gaveta" /><b style={{ flex: '1 1 220px' }}>O caixa está fechado. Abra o caixa para finalizar vendas.</b>
      <span className="entrada" style={{ width: 170 }}><input value={fundo} onChange={(e) => setFundo(e.target.value)} inputMode="decimal" placeholder="Troco inicial R$" aria-label="Dinheiro do troco" onKeyDown={(e) => e.key === 'Enter' && abrir()} /></span>
      <button className="btn prim" onClick={abrir} disabled={ocupado}>Abrir caixa</button>
    </div>
  );
}

export function Carrinho({ linhasProdutos, aberto, aoFechar, aoEditar, caixaAberto }: { linhasProdutos: Produto[]; aberto: boolean; aoFechar: () => void; aoEditar: (p: Produto, i: ItemCarrinho) => void; caixaAberto: boolean }) {
  const { pedido, mudar, zerar } = usePedido();
  const { eu } = useSessao();
  const confirmar = useConfirmar();
  const nav = useNavigate();
  const aviso = useAviso();
  const [desc, setDesc] = useState(false);
  const r = useMemo(() => calcularPedido(pedido, linhasProdutos), [pedido, linhasProdutos]);
  useEffect(() => {
    if (r.invalidos.length) { mudar((p) => ({ ...p, itens: p.itens.filter((i) => !r.invalidos.includes(i)) })); aviso('Um item saiu do cardápio e foi tirado do pedido.', 'erro'); }
  }, [r.invalidos.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const qtd = (l: Linha, d: number) => mudar((p) => ({ ...p, itens: p.itens.map((i) => (i.chaveItem === l.chaveItem ? { ...i, qtd: Math.max(1, Math.min(999, i.qtd + d)) } : i)) }));
  const tirar = (l: Linha) => mudar((p) => ({ ...p, itens: p.itens.filter((i) => i.chaveItem !== l.chaveItem) }));
  const finalizar = () => {
    if (!r.linhas.length) return aviso('Adicione produtos ao pedido.', 'erro');
    if (!caixaAberto) return aviso('Abra o caixa antes de finalizar.', 'erro');
    nav('/caixa/pagamento');
  };
  return (
    <>
      {aberto && <div className="fundo-modal" style={{ zIndex: 45 }} onMouseDown={aoFechar} />}
      <aside className={`carrinho ${aberto ? 'aberto' : ''}`} aria-label="Pedido atual">
        {aberto && <div className="alca" />}
        <div className="carrinho-topo">
          <h2>Pedido atual</h2>
          <span style={{ display: 'flex', gap: 4 }}>
            {r.linhas.length > 0 && <button className="link" style={{ color: 'var(--vermelho)', display: 'inline-flex', gap: 6, alignItems: 'center' }} onClick={async () => { if (await confirmar('Limpar todos os itens do pedido?', { sim: 'Limpar', perigo: true })) zerar(); }}><Ic n="lixeira" t={18} />Limpar</button>}
            {aberto && <button className="btn-ic" onClick={aoFechar} aria-label="Fechar o pedido"><Ic n="x" /></button>}
          </span>
        </div>
        <div className="carrinho-itens">
          {r.linhas.length ? r.linhas.map((l) => (
            <div className="c-item" key={l.chaveItem}>
              <FotoProduto fotoId={l.produto.foto_id} icone={l.produto.categoria_icone} nome={l.nome} />
              <div style={{ minWidth: 0 }}>
                <b>{l.nome}</b>
                {textoEscolhas(l.detalhes) && <small>{textoEscolhas(l.detalhes)}</small>}
                {temOpcoes(l.produto) && <button className="link" style={{ fontSize: 12.5 }} onClick={() => aoEditar(l.produto, pedido.itens.find((i) => i.chaveItem === l.chaveItem)!)}>Personalizar</button>}
              </div>
              <div className="lado">
                <span className="qtd"><button onClick={() => (l.qtd > 1 ? qtd(l, -1) : tirar(l))} aria-label={`Menos ${l.nome}`}><Ic n={l.qtd > 1 ? 'menos' : 'lixeira'} t={16} /></button><span className="num">{l.qtd}</span><button onClick={() => qtd(l, 1)} aria-label={`Mais ${l.nome}`}><Ic n="mais" t={16} /></button></span>
                <b className="num">{brl(l.total)}</b>
              </div>
            </div>
          )) : <Vazio icone="sacola" titulo="Pedido vazio" texto="Toque nos produtos para adicionar." />}
          {r.linhas.length > 0 && <div className="entrada" style={{ margin: '12px 0' }}><Ic n="lapis" t={18} />
            <input value={pedido.observacao} onChange={(e) => mudar((p) => ({ ...p, observacao: e.target.value.slice(0, 200) }))} placeholder="Adicionar observação ao pedido…" aria-label="Observação do pedido" /></div>}
        </div>
        <div className="carrinho-pe">
          <div className="linha-valor"><span>Subtotal</span><b className="num">{brl(r.subtotal)}</b></div>
          <div className="linha-valor"><button className="link" onClick={() => setDesc(true)} disabled={!r.linhas.length}>Desconto {pedido.desconto ? (pedido.desconto.tipo === 'pct' ? `(${pedido.desconto.valor}%)` : '') : '+'}</button><b className="num">{r.desconto ? '− ' : ''}{brl(r.desconto)}</b></div>
          <div className="total"><span>Total</span><b className="num">{brl(r.total)}</b></div>
          <button className="btn prim grande bloco" onClick={finalizar} disabled={!r.linhas.length}>Finalizar Pedido <Ic n="seta" /></button>
          <p style={{ margin: 0, textAlign: 'center', color: 'var(--suave)', fontSize: 13.5 }}><Ic n="sacola" t={16} /> {r.qtdItens} {r.qtdItens === 1 ? 'item' : 'itens'} no pedido</p>
        </div>
      </aside>
      {desc && <Desconto limite={eu?.usuario.papel === 'caixa' ? eu.empresa.desconto_max_caixa : 100} subtotal={r.subtotal} aoFechar={() => setDesc(false)} />}
    </>
  );
}

function Desconto({ limite, subtotal, aoFechar }: { limite: number; subtotal: number; aoFechar: () => void }) {
  const { pedido, mudar } = usePedido();
  const [tipo, setTipo] = useState<'valor' | 'pct'>(pedido.desconto?.tipo || 'valor');
  const [valor, setValor] = useState(pedido.desconto ? (pedido.desconto.tipo === 'pct' ? String(pedido.desconto.valor) : (pedido.desconto.valor / 100).toFixed(2).replace('.', ',')) : '');
  const [erro, setErro] = useState('');
  const aplicar = () => {
    const v = tipo === 'pct' ? Number(valor.replace(',', '.')) : lerValor(valor);
    if (!valor.trim() || v === 0) { mudar((p) => ({ ...p, desconto: null })); return aoFechar(); }
    if (!Number.isFinite(v) || v < 0) return setErro('Valor inválido.');
    const pct = tipo === 'pct' ? v : subtotal ? (v * 100) / subtotal : 0;
    if (pct > 100) return setErro('O desconto não pode passar do total.');
    if (pct > limite + 1e-9) return setErro(`Seu usuário pode dar até ${limite}% de desconto. Peça a um gerente.`);
    mudar((p) => ({ ...p, desconto: { tipo, valor: v } })); aoFechar();
  };
  return (
    <Modal titulo="Desconto no pedido" aoFechar={aoFechar} pe={<><button className="btn" onClick={() => { mudar((p) => ({ ...p, desconto: null })); aoFechar(); }}>Sem desconto</button><button className="btn prim" onClick={aplicar}>Aplicar</button></>}>
      <div className="dupla" style={{ marginBottom: 12 }}>
        <button className={`opcao-t ${tipo === 'valor' ? 'sel' : ''}`} onClick={() => setTipo('valor')}>Em reais (R$)</button>
        <button className={`opcao-t ${tipo === 'pct' ? 'sel' : ''}`} onClick={() => setTipo('pct')}>Em porcentagem (%)</button>
      </div>
      <label className="campo">{tipo === 'pct' ? 'Desconto (%)' : 'Desconto (R$)'}<input value={valor} onChange={(e) => { setValor(e.target.value); setErro(''); }} inputMode="decimal" onKeyDown={(e) => e.key === 'Enter' && aplicar()} aria-invalid={Boolean(erro)} /></label>
      {erro && <div className="aviso erro" style={{ marginTop: 10 }}>{erro}</div>}
      {limite < 100 && <p style={{ color: 'var(--suave)', fontSize: 13.5 }}>Limite do seu usuário: {limite}%.</p>}
    </Modal>
  );
}

function ResumoMovel({ produtos, aoAbrir }: { produtos: Produto[]; aoAbrir: () => void }) {
  const { pedido } = usePedido();
  const nav = useNavigate();
  const r = useMemo(() => calcularPedido(pedido, produtos), [pedido, produtos]);
  if (!r.linhas.length) return null;
  return (
    <div className="carrinho-resumo-movel">
      <button onClick={aoAbrir} style={{ flex: 1, border: 0, background: 'none', color: 'inherit', textAlign: 'left', padding: 0 }}>
        <small>{r.qtdItens} {r.qtdItens === 1 ? 'item' : 'itens'} · ver pedido</small><b className="num">{brl(r.total)}</b>
      </button>
      <button className="btn prim" onClick={() => nav('/caixa/pagamento')}>Finalizar <Ic n="seta" t={18} /></button>
    </div>
  );
}

export function Personalizar({ produto, item, aoFechar }: { produto: Produto; item?: ItemCarrinho; aoFechar: () => void }) {
  const { mudar } = usePedido();
  const aviso = useAviso();
  const op = produto.opcoes || {};
  const [tamanho, setTamanho] = useState<string | null>(item?.tamanho ?? op.tamanhos?.[0]?.nome ?? null);
  const [adic, setAdic] = useState<string[]>(item?.adicionais || []);
  const [ret, setRet] = useState<string[]>(item?.retirar || []);
  const [obs, setObs] = useState(item?.observacao || '');
  const [qtd, setQtd] = useState(item?.qtd || 1);
  const base = op.tamanhos?.find((t) => t.nome === tamanho)?.preco ?? produto.preco;
  const unit = base + (op.adicionais || []).filter((a) => adic.includes(a.nome)).reduce((s, a) => s + a.preco, 0);
  const alternar = (lista: string[], set: (l: string[]) => void, v: string) => set(lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  const salvar = () => {
    const escolha = { produtoId: produto.id, qtd, tamanho, adicionais: adic, retirar: ret, observacao: obs.trim() || undefined };
    mudar((p) => item ? { ...p, itens: p.itens.map((i) => (i.chaveItem === item.chaveItem ? { ...escolha, chaveItem: i.chaveItem } : i)) } : { ...p, itens: [...p.itens, { ...escolha, chaveItem: novaChaveItem() }] });
    aviso(item ? 'Item atualizado.' : `${produto.nome} adicionado`);
    aoFechar();
  };
  return (
    <Modal titulo="Personalizar Produto" aoFechar={aoFechar} largo>
      <div className="personalizar">
        <div>
          <FotoProduto fotoId={produto.foto_id} icone={produto.categoria_icone} nome={produto.nome} className="foto-grande" />
          <h2 style={{ margin: '14px 0 4px', fontSize: 24 }}>{produto.nome}</h2>
          {produto.descricao && <p style={{ margin: 0, color: 'var(--suave)' }}>{produto.descricao}</p>}
          <p style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 800, color: 'var(--laranja)' }} className="num">{brl(base)}</p>
        </div>
        <div>
          {!!op.tamanhos?.length && <><h3 style={{ marginTop: 0 }}>Tamanho</h3><div className="opcoes-tamanho">
            {op.tamanhos.map((t) => <button key={t.nome} className={`opcao-t ${tamanho === t.nome ? 'sel' : ''}`} onClick={() => setTamanho(t.nome)}>{t.nome}<small className="num">{brl(t.preco)}</small></button>)}
          </div></>}
          {!!op.adicionais?.length && <><h3>Adicionais</h3>{op.adicionais.map((a) => (
            <label key={a.nome} className="marcar"><input type="checkbox" checked={adic.includes(a.nome)} onChange={() => alternar(adic, setAdic, a.nome)} /><span>{a.nome}</span><small className="num">+ {brl(a.preco)}</small></label>
          ))}</>}
          {!!op.retirar?.length && <><h3>Retirar ingrediente</h3>{op.retirar.map((r) => (
            <label key={r} className="marcar"><input type="checkbox" checked={ret.includes(r)} onChange={() => alternar(ret, setRet, r)} /><span>Sem {r.toLowerCase()}</span></label>
          ))}</>}
          <h3>Observações</h3>
          <textarea value={obs} onChange={(e) => setObs(e.target.value.slice(0, 150))} placeholder="Ex.: ponto da carne, molho à parte, etc." aria-label="Observações do item" />
          <div style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--suave)' }}>{obs.length}/150</div>
          <div className="rodape-fixo"><h3>Quantidade</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="qtd"><button onClick={() => setQtd(Math.max(1, qtd - 1))} aria-label="Menos"><Ic n="menos" /></button><span className="num" style={{ minWidth: 44 }}>{qtd}</span><button onClick={() => setQtd(Math.min(999, qtd + 1))} aria-label="Mais"><Ic n="mais" /></button></span>
            <button className="btn prim grande" style={{ flex: '1 1 230px' }} onClick={salvar}><Ic n="sacola" />{item ? 'Atualizar item' : 'Adicionar ao pedido'}<span className="num" style={{ marginLeft: 'auto' }}>{brl(unit * qtd)}</span></button>
          </div></div>
        </div>
      </div>
    </Modal>
  );
}
