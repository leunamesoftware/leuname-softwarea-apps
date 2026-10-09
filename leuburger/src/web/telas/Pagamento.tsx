// Pagamento do pedido e tela de venda concluída.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { brl, conferirPagamentos, ErroPedido, FORMAS, lerValor, sugestoesTroco, type Forma } from '../../regras/pedido';
import { get, post } from '../api';
import { calcularPedido, carregarCardapio, textoEscolhas } from '../cardapio';
import { Carregando, Falha, FotoProduto, msgErro, useAviso, useDados } from '../comuns';
import { detalhesItem, imprimirComprovante, textoWhatsApp, type VendaCompleta } from '../comprovante';
import { Ic } from '../icones';
import { usePedido, useSessao } from '../sessao';
import { FormCliente } from './Clientes';

const ICONE_FORMA: Record<string, string> = { dinheiro: 'dinheiro', pix: 'pix', debito: 'cartao', credito: 'cartao' };
const reaisTexto = (c: number) => (c / 100).toFixed(2).replace('.', ',');

export function Pagamento() {
  const cardapio = useDados(carregarCardapio);
  const clientes = useDados(() => get<{ clientes: { id: string; nome: string; telefone: string | null }[] }>('/clientes'));
  const { pedido, mudar, zerar } = usePedido();
  const { eu } = useSessao();
  const nav = useNavigate();
  const aviso = useAviso();
  const formasAtivas = (eu?.empresa.formas_pagamento || Object.keys(FORMAS)) as Forma[];
  const [forma, setForma] = useState<Forma>(formasAtivas[0] || 'dinheiro');
  const [recebido, setRecebido] = useState('');
  const [lancados, setLancados] = useState<{ forma: Forma; valor: number }[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [novoCliente, setNovoCliente] = useState(false);
  const enviandoRef = useRef(false);
  const campo = useRef<HTMLInputElement>(null);
  const r = useMemo(() => (cardapio.dados ? calcularPedido(pedido, cardapio.dados.produtos) : null), [pedido, cardapio.dados]);

  const total = r?.total || 0;
  const jaLancado = lancados.reduce((s, p) => s + p.valor, 0);
  const restante = Math.max(0, total - jaLancado);
  const valorAtual = forma === 'dinheiro' ? (recebido.trim() ? lerValor(recebido) : restante) : (recebido.trim() ? lerValor(recebido) : restante);
  const pagamentos = [...lancados, ...(valorAtual > 0 ? [{ forma, valor: valorAtual }] : [])];
  let situacao: { ok: boolean; troco: number; msg: string } = { ok: false, troco: 0, msg: '' };
  if (Number.isNaN(valorAtual)) situacao = { ok: false, troco: 0, msg: 'Valor recebido inválido.' };
  else try { const c = conferirPagamentos(total, pagamentos); situacao = { ok: true, troco: c.troco, msg: '' }; } catch (e) { situacao = { ok: false, troco: 0, msg: e instanceof ErroPedido ? e.message : 'Confira o pagamento.' }; }

  useEffect(() => { if (forma === 'dinheiro') campo.current?.focus(); }, [forma]);
  useEffect(() => {
    // Teclado do computador: F4 finaliza.
    const t = (e: KeyboardEvent) => { if (e.key === 'F4') { e.preventDefault(); finalizar(); } };
    addEventListener('keydown', t); return () => removeEventListener('keydown', t);
  });

  if (cardapio.carregando && !cardapio.dados) return <Carregando />;
  if (cardapio.erro && !cardapio.dados) return <Falha erro={cardapio.erro} tentar={cardapio.recarregar} />;
  if (!r || !r.linhas.length) return (
    <div className="vazio"><Ic n="sacola" t={40} /><b>Nenhum pedido em andamento</b><Link className="btn prim" to="/caixa">Ir para a Frente de Caixa</Link></div>
  );

  const teclar = (k: string) => {
    if (k === 'apagar') return setRecebido((v) => v.slice(0, -1));
    if (k === ',' && recebido.includes(',')) return;
    if (/,\d\d$/.test(recebido)) return;
    setRecebido((v) => (v === '' && k === ',' ? '0,' : v + k));
  };
  const dividir = () => {
    if (Number.isNaN(valorAtual) || valorAtual <= 0) return setErro('Digite o valor desta parte.');
    if (valorAtual >= restante) return setErro('Para dividir, digite um valor menor que o que falta.');
    setLancados([...lancados, { forma, valor: valorAtual }]); setRecebido(''); setErro('');
  };
  async function finalizar() {
    if (enviandoRef.current) return; // clique duplo não manda duas vezes
    if (!situacao.ok) return setErro(situacao.msg);
    enviandoRef.current = true; setEnviando(true); setErro('');
    try {
      const d = await post<{ venda: VendaCompleta }>('/vendas', {
        chave: pedido.chave, itens: pedido.itens.map(({ chaveItem: _c, ...i }) => i), desconto: pedido.desconto, pagamentos,
        clienteId: pedido.clienteId, observacao: pedido.observacao,
      });
      zerar();
      nav(`/caixa/venda/${d.venda.id}`, { replace: true, state: { venda: d.venda } });
    } catch (e) {
      setErro(msgErro(e)); aviso('A venda não foi salva. ' + msgErro(e), 'erro');
    } finally { enviandoRef.current = false; setEnviando(false); }
  }

  return (
    <>
      <div className="cabeca"><button className="voltar" onClick={() => nav('/caixa')}><Ic n="voltar" />Pagamento do Pedido</button></div>
      <div className="pagamento">
        <section className="cartao">
          <h2 className="cartao-tit">Itens do pedido <Link className="btn peq" to="/caixa">Editar</Link></h2>
          {r.linhas.map((l) => (
            <div className="c-item" key={l.chaveItem}>
              <FotoProduto fotoId={l.produto.foto_id} icone={l.produto.categoria_icone} nome={l.nome} />
              <div><b>{l.nome}</b>{textoEscolhas(l.detalhes) && <small>{textoEscolhas(l.detalhes)}</small>}</div>
              <div className="lado"><span className="selo">{l.qtd}</span><b className="num">{brl(l.total)}</b>{l.qtd > 1 && <small className="num">{brl(l.precoUnit)} cada</small>}</div>
            </div>
          ))}
          <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
            <div className="linha-valor"><span>Subtotal</span><b className="num">{brl(r.subtotal)}</b></div>
            <div className="linha-valor"><span>Desconto</span><b className="num">{r.desconto ? '− ' : ''}{brl(r.desconto)}</b></div>
            <div className="total laranja"><span>Total</span><b className="num">{brl(total)}</b></div>
          </div>
          <label className="campo" style={{ marginTop: 14 }}>Cliente (opcional)
            <span style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8 }}>
              <select value={pedido.clienteId || ''} onChange={(e) => mudar((p) => ({ ...p, clienteId: e.target.value || null }))}>
                <option value="">Sem cliente</option>
                {(clientes.dados?.clientes || []).map((c) => <option key={c.id} value={c.id}>{c.nome}{c.telefone ? ` · ${c.telefone}` : ''}</option>)}
              </select>
              <button type="button" className="btn" onClick={() => setNovoCliente(true)}><Ic n="mais" t={18} />Novo</button>
            </span>
          </label>
          {novoCliente && <FormCliente cliente={null} aoFechar={() => setNovoCliente(false)} aoSalvar={(id) => { setNovoCliente(false); mudar((p) => ({ ...p, clienteId: id })); clientes.recarregar(); }} />}
        </section>
        <section className="cartao">
          <h2 className="cartao-tit">Forma de pagamento</h2>
          <div className="formas" role="radiogroup" aria-label="Forma de pagamento">
            {formasAtivas.map((f) => (
              <button key={f} role="radio" aria-checked={forma === f} className={`forma ${forma === f ? 'sel' : ''}`} onClick={() => { setForma(f); setRecebido(''); setErro(''); }}>
                <Ic n={ICONE_FORMA[f]} t={30} />{FORMAS[f].replace('Cartão ', '')}
              </button>
            ))}
          </div>
          {lancados.length > 0 && <div className="pag-lista">
            {lancados.map((p, i) => <div className="pag-linha" key={i}><span>{FORMAS[p.forma]}</span><span className="num">{brl(p.valor)} <button className="btn-ic" onClick={() => setLancados(lancados.filter((_, k) => k !== i))} aria-label="Tirar este pagamento"><Ic n="x" t={16} /></button></span></div>)}
            <div className="pag-linha" style={{ background: 'var(--laranja-claro)' }}><span>Falta receber</span><b className="num">{brl(restante)}</b></div>
          </div>}
          <div className="receber">
            <div>
              <label className="campo valor-recebido">{forma === 'dinheiro' ? 'Valor recebido' : `Valor no ${FORMAS[forma]}`}
                <span className="entrada"><span style={{ position: 'absolute', left: 16, fontSize: 22, color: 'var(--suave)' }}>R$</span>
                  <input ref={campo} value={recebido} onChange={(e) => { setRecebido(e.target.value.replace(/[^\d,.]/g, '')); setErro(''); }} placeholder={reaisTexto(restante)} inputMode="decimal" style={{ paddingLeft: 56 }} aria-invalid={Boolean(erro)} onKeyDown={(e) => e.key === 'Enter' && finalizar()} />
                </span>
              </label>
              {forma === 'dinheiro' && <div className="sugestoes">
                {sugestoesTroco(restante).map((v) => <button key={v} className={recebido && lerValor(recebido) === v ? 'sel' : ''} onClick={() => setRecebido(reaisTexto(v))}>{brl(v)}</button>)}
              </div>}
              <button className="link" style={{ marginTop: 12 }} onClick={dividir}>+ Dividir: receber parte em {FORMAS[forma]} e o resto em outra forma</button>
            </div>
            <div className="teclado" aria-label="Teclado numérico">
              {['7', '8', '9', 'apagar', '4', '5', '6', '', '1', '2', '3', ''].map((k, i) => k === '' ? <span key={i} /> : <button key={i} onClick={() => teclar(k)} aria-label={k === 'apagar' ? 'Apagar' : k}>{k === 'apagar' ? <Ic n="apagar" /> : k}</button>)}
              <button className="zero" onClick={() => teclar('0')}>0</button><button onClick={() => teclar(',')}>,</button>
            </div>
          </div>
          {situacao.ok ? (
            <div className="troco-caixa"><Ic n="moedas" t={40} /><div>{situacao.troco > 0 ? 'Troco a devolver' : 'Valor certo'}<b className="num">{brl(situacao.troco)}</b></div></div>
          ) : (
            <div className="troco-caixa falta"><Ic n="alerta" t={36} /><div>{situacao.msg}</div></div>
          )}
          {erro && <div className="aviso erro" role="alert" style={{ marginTop: 12 }}>{erro}</div>}
          <div className="dupla" style={{ marginTop: 16 }}>
            <Link className="btn cinza grande" to="/caixa"><Ic n="voltar" />Voltar</Link>
            <button className="btn prim grande" onClick={finalizar} disabled={enviando || !situacao.ok}><Ic n="check" />{enviando ? 'Salvando…' : 'Finalizar pedido'}</button>
          </div>
        </section>
      </div>
    </>
  );
}

export function VendaConcluida() {
  const { id } = useParams();
  const { eu } = useSessao();
  const nav = useNavigate();
  const d = useDados(() => get<{ venda: VendaCompleta }>(`/vendas/${id}`), [id]);
  const imprimiu = useRef(false);
  useEffect(() => {
    if (d.dados && !imprimiu.current && localStorageGet('leuburger_auto_imprimir') === '1') { imprimiu.current = true; imprimirComprovante(d.dados.venda, eu!.empresa); }
  }, [d.dados, eu]);
  if (d.carregando && !d.dados) return <Carregando />;
  if (d.erro || !d.dados) return <Falha erro={d.erro || 'Venda não encontrada.'} tentar={d.recarregar} />;
  const v = d.dados.venda, e = eu!.empresa;
  const digitos = String(v.cliente_telefone || '').replace(/\D/g, '');
  const fone = digitos.length >= 10 && digitos.length <= 11 ? '55' + digitos : digitos;
  return (
    <div className="concluida">
      <div className="topo"><div className="bola"><Ic n="check" t={54} /></div><h1>Venda concluída!</h1><p>Pedido #{v.numero} finalizado com sucesso.</p></div>
      <div className="concluida-grade">
        <section className="cartao">
          <h2 className="cartao-tit">Resumo do pedido <small style={{ color: 'var(--suave)', fontWeight: 500 }}>{new Date(v.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small></h2>
          {v.itens.map((i) => (
            <div className="c-item" key={i.id}>
              <FotoProduto fotoId={i.foto_id} icone={i.icone} nome={i.nome} />
              <div><b>{i.nome}</b>{detalhesItem(i.detalhes) && <small>{detalhesItem(i.detalhes)}</small>}</div>
              <div className="lado"><span className="selo">{i.qtd}</span><b className="num">{brl(i.total)}</b>{i.qtd > 1 && <small className="num">{brl(i.preco_unit)} cada</small>}</div>
            </div>
          ))}
          <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
            <div className="linha-valor"><span>Subtotal</span><b className="num">{brl(v.subtotal)}</b></div>
            <div className="linha-valor"><span>Desconto</span><b className="num">{v.desconto ? '− ' : ''}{brl(v.desconto)}</b></div>
            <div className="total laranja"><span>Total pago</span><b className="num">{brl(v.total)}</b></div>
          </div>
        </section>
        <section style={{ display: 'grid', gap: 14 }}>
          <div className="cartao">
            <div style={{ display: 'flex', gap: 14 }}><Ic n="cartao" t={32} /><div style={{ flex: 1 }}>
              <b style={{ fontSize: 17 }}>Forma de pagamento</b><div style={{ fontSize: 17, marginBottom: 8 }}>{v.pagamentos.map((p) => FORMAS[p.forma as Forma] || p.forma).join(' + ')}</div>
              {v.pagamentos.length > 1 && v.pagamentos.map((p, k) => <div className="linha-valor" key={k}><span>{FORMAS[p.forma as Forma]}</span><b className="num">{brl(p.valor)}</b></div>)}
              <div className="linha-valor"><span>Valor recebido</span><b className="num">{brl(v.pagamentos.reduce((s, p) => s + p.valor, 0))}</b></div>
              <div className="linha-valor"><span>Troco</span><b className="num" style={{ color: 'var(--verde)', fontSize: 20 }}>{brl(v.troco)}</b></div>
            </div></div>
          </div>
          <div className="recebido"><Ic n="check" t={30} /><div><b>Pagamento registrado!</b><div>O pedido foi salvo no sistema.</div></div></div>
          <button className="btn prim grande bloco" onClick={() => imprimirComprovante(v, e)}><Ic n="impressora" />Imprimir comprovante <small style={{ fontWeight: 500 }}>(não fiscal)</small></button>
          <a className="btn cinza grande bloco" href={`https://wa.me/${fone}?text=${encodeURIComponent(textoWhatsApp(v, e))}`} target="_blank" rel="noopener"><Ic n="compartilhar" />Compartilhar por WhatsApp</a>
          <div className="dupla">
            <button className="btn cinza grande" onClick={() => nav('/caixa')}><Ic n="pedidos" />Novo pedido</button>
            <button className="btn grande" onClick={() => nav('/')}><Ic n="inicio" />Voltar ao início</button>
          </div>
        </section>
      </div>
    </div>
  );
}
function localStorageGet(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
