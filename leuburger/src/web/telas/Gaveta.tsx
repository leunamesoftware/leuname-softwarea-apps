// Caixa (gaveta de dinheiro): abrir com fundo de troco, sangria, suprimento e fechamento com conferência.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { brl, FORMAS, lerValor, type Forma } from '../../regras/pedido';
import { dataHora, get, post } from '../api';
import { Carregando, Falha, Modal, msgErro, useAviso, useDados } from '../comuns';
import { Ic } from '../icones';
import { Cabeca } from '../Layout';
import { useSessao } from '../sessao';

interface Resumo { qtdVendas: number; totalVendido: number; porForma: Record<string, number>; sangrias: number; suprimentos: number; dinheiroEsperado: number; movimentos: { id: string; tipo: string; valor: number; motivo: string | null; usuario: string | null; criado_em: string }[] }
interface DadosCaixa { caixa: { id: string; aberto_em: string; fundo: number } | null; resumo?: Resumo }

export function Gaveta() {
  const d = useDados(() => get<DadosCaixa>('/caixa'));
  const { pode } = useSessao();
  const [mov, setMov] = useState<'sangria' | 'suprimento' | null>(null);
  const [fechar, setFechar] = useState(false);
  const [fechado, setFechado] = useState<{ resumo: Resumo; diferenca: number; contado: number } | null>(null);
  if (d.carregando && !d.dados) return <Carregando />;
  if (d.erro && !d.dados) return <Falha erro={d.erro} tentar={d.recarregar} />;
  const { caixa, resumo } = d.dados!;
  return (
    <>
      <Cabeca titulo="Caixa" sub={caixa ? `Aberto em ${dataHora(caixa.aberto_em)}` : 'Abra o caixa no começo do expediente e feche no final.'}>
        {caixa && <>
          <button className="btn" onClick={() => setMov('sangria')}><Ic n="menos" />Sangria</button>
          <button className="btn" onClick={() => setMov('suprimento')}><Ic n="mais" />Suprimento</button>
          <button className="btn prim" onClick={() => setFechar(true)}><Ic n="cadeado" />Fechar caixa</button>
        </>}
      </Cabeca>
      {fechado && <ResultadoFechamento {...fechado} aoFechar={() => setFechado(null)} />}
      {!caixa ? <Abrir aoAbrir={d.recarregar} /> : resumo && <>
        <div className="resumo-caixa">
          <div className="kpi"><span className="kpi-ic laranja"><Ic n="sacola" t={24} /></span><span>Vendido no caixa</span><b className="num">{brl(resumo.totalVendido)}</b><small>{resumo.qtdVendas} {resumo.qtdVendas === 1 ? 'pedido' : 'pedidos'}</small></div>
          <div className="kpi"><span className="kpi-ic verde"><Ic n="dinheiro" t={24} /></span><span>Dinheiro na gaveta</span><b className="num">{brl(resumo.dinheiroEsperado)}</b><small>fundo + dinheiro − troco ± movimentos</small></div>
          <div className="kpi"><span className="kpi-ic amarelo"><Ic n="menos" t={24} /></span><span>Sangrias</span><b className="num">{brl(resumo.sangrias)}</b><small>dinheiro retirado</small></div>
          <div className="kpi"><span className="kpi-ic azul"><Ic n="mais" t={24} /></span><span>Fundo + suprimentos</span><b className="num">{brl(caixa.fundo + resumo.suprimentos)}</b><small>fundo de troco {brl(caixa.fundo)}</small></div>
        </div>
        <div className="inicio-meio">
          <section className="cartao"><h2 className="cartao-tit">Recebido por forma de pagamento</h2>
            <div className="lista-config">{(Object.keys(FORMAS) as Forma[]).map((f) => (
              <div key={f}><span>{FORMAS[f]}{f === 'dinheiro' && <small style={{ display: 'block', color: 'var(--suave)', fontWeight: 500 }}>já descontado o troco</small>}</span><b className="num">{brl(resumo.porForma[f] || 0)}</b></div>
            ))}</div>
          </section>
          <section className="cartao"><h2 className="cartao-tit">Movimentações</h2>
            {!resumo.movimentos.length ? <p style={{ color: 'var(--suave)', margin: 0 }}>Nenhuma sangria ou suprimento neste caixa.</p> : (
              <div className="lista-config">{resumo.movimentos.map((m) => (
                <div key={m.id}><span>{m.tipo === 'sangria' ? 'Sangria' : 'Suprimento'}<small style={{ display: 'block', color: 'var(--suave)', fontWeight: 500 }}>{dataHora(m.criado_em)} · {m.usuario || '—'}{m.motivo ? ` · ${m.motivo}` : ''}</small></span>
                  <b className="num" style={{ color: m.tipo === 'sangria' ? 'var(--vermelho)' : 'var(--verde)' }}>{m.tipo === 'sangria' ? '−' : '+'} {brl(m.valor)}</b></div>
              ))}</div>
            )}
          </section>
        </div>
        <div className="so-movel" style={{ marginTop: 4 }}><Link className="btn prim bloco" to="/caixa"><Ic n="caixa" />Ir para a Frente de Caixa</Link></div>
        {pode('relatorios') && <p style={{ color: 'var(--suave)', fontSize: 14 }}>Os caixas já fechados ficam em <Link className="link" to="/relatorios">Relatórios → Fechamentos de caixa</Link>.</p>}
      </>}
      {mov && <Movimento tipo={mov} aoFechar={() => setMov(null)} aoSalvar={() => { setMov(null); d.recarregar(); }} />}
      {fechar && resumo && <Fechar esperado={resumo.dinheiroEsperado} aoFechar={() => setFechar(false)} aoFechou={(r) => { setFechar(false); setFechado(r); d.recarregar(); }} />}
    </>
  );
}

function Abrir({ aoAbrir }: { aoAbrir: () => void }) {
  const aviso = useAviso();
  const [fundo, setFundo] = useState(''), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const abrir = async () => {
    const v = fundo.trim() ? lerValor(fundo) : 0;
    if (Number.isNaN(v) || v < 0) return setErro('Valor inválido.');
    setOcupado(true);
    try { await post('/caixa/abrir', { fundo: v }); aviso('Caixa aberto. Boas vendas!'); aoAbrir(); } catch (e) { setErro(msgErro(e)); } finally { setOcupado(false); }
  };
  return (
    <div className="cartao" style={{ maxWidth: 480 }}>
      <h2 className="cartao-tit">O caixa está fechado</h2>
      <p style={{ color: 'var(--suave)', marginTop: 0 }}>Conte o dinheiro que fica na gaveta para troco e digite abaixo. Se não tiver, deixe em branco.</p>
      <label className="campo">Fundo de troco (R$)<input value={fundo} onChange={(e) => { setFundo(e.target.value); setErro(''); }} inputMode="decimal" placeholder="0,00" onKeyDown={(e) => e.key === 'Enter' && abrir()} autoFocus /></label>
      {erro && <div className="aviso erro" style={{ marginTop: 10 }}>{erro}</div>}
      <button className="btn prim bloco grande" style={{ marginTop: 14 }} onClick={abrir} disabled={ocupado}><Ic n="gaveta" />{ocupado ? 'Abrindo…' : 'Abrir caixa'}</button>
    </div>
  );
}

function Movimento({ tipo, aoFechar, aoSalvar }: { tipo: 'sangria' | 'suprimento'; aoFechar: () => void; aoSalvar: () => void }) {
  const aviso = useAviso();
  const [valor, setValor] = useState(''), [motivo, setMotivo] = useState(''), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const salvar = async () => {
    const v = lerValor(valor);
    if (Number.isNaN(v) || v <= 0) return setErro('Digite o valor.');
    setOcupado(true);
    try { await post('/caixa/movimento', { tipo, valor: v, motivo: motivo.trim() || undefined }); aviso(tipo === 'sangria' ? 'Sangria registrada.' : 'Suprimento registrado.'); aoSalvar(); }
    catch (e) { setErro(msgErro(e)); } finally { setOcupado(false); }
  };
  return (
    <Modal titulo={tipo === 'sangria' ? 'Sangria (tirar dinheiro)' : 'Suprimento (pôr dinheiro)'} aoFechar={aoFechar} pe={<><button className="btn" onClick={aoFechar}>Voltar</button><button className="btn prim" onClick={salvar} disabled={ocupado}>Confirmar</button></>}>
      <div className="campos">
        <label className="campo">Valor (R$)<input value={valor} onChange={(e) => { setValor(e.target.value); setErro(''); }} inputMode="decimal" placeholder="0,00" /></label>
        <label className="campo">Motivo (opcional)<input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={120} placeholder={tipo === 'sangria' ? 'Ex.: depósito, pagar fornecedor' : 'Ex.: mais troco'} /></label>
      </div>
      {erro && <div className="aviso erro" style={{ marginTop: 12 }}>{erro}</div>}
    </Modal>
  );
}

function Fechar({ esperado, aoFechar, aoFechou }: { esperado: number; aoFechar: () => void; aoFechou: (r: { resumo: Resumo; diferenca: number; contado: number }) => void }) {
  const [contado, setContado] = useState(''), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const v = contado.trim() ? lerValor(contado) : NaN;
  const dif = Number.isNaN(v) ? null : v - esperado;
  const salvar = async () => {
    if (Number.isNaN(v) || v < 0) return setErro('Conte o dinheiro da gaveta e digite o valor.');
    setOcupado(true);
    try { const r = await post<{ resumo: Resumo; diferenca: number }>('/caixa/fechar', { contado: v }); aoFechou({ ...r, contado: v }); }
    catch (e) { setErro(msgErro(e)); } finally { setOcupado(false); }
  };
  return (
    <Modal titulo="Fechar caixa" aoFechar={aoFechar} pe={<><button className="btn" onClick={aoFechar}>Voltar</button><button className="btn prim" onClick={salvar} disabled={ocupado}>{ocupado ? 'Fechando…' : 'Fechar caixa'}</button></>}>
      <p style={{ marginTop: 0 }}>Conte todo o dinheiro da gaveta (incluindo o fundo de troco) e digite o total.</p>
      <label className="campo">Dinheiro contado (R$)<input value={contado} onChange={(e) => { setContado(e.target.value); setErro(''); }} inputMode="decimal" placeholder="0,00" /></label>
      <div className="lista-config" style={{ marginTop: 10 }}>
        <div><span>Esperado na gaveta</span><b className="num">{brl(esperado)}</b></div>
        {dif != null && <div><span>Diferença</span><b className="num" style={{ color: dif === 0 ? 'var(--verde)' : dif < 0 ? 'var(--vermelho)' : 'var(--ambar)' }}>{dif === 0 ? 'Bateu certinho' : `${dif > 0 ? 'Sobrou' : 'Faltou'} ${brl(Math.abs(dif))}`}</b></div>}
      </div>
      {erro && <div className="aviso erro" style={{ marginTop: 12 }}>{erro}</div>}
    </Modal>
  );
}

function ResultadoFechamento({ resumo, diferenca, contado, aoFechar }: { resumo: Resumo; diferenca: number; contado: number; aoFechar: () => void }) {
  return (
    <div className={`aviso ${diferenca === 0 ? 'ok' : diferenca < 0 ? 'erro' : ''}`} style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <Ic n={diferenca === 0 ? 'check' : 'alerta'} />
      <span style={{ flex: '1 1 260px' }}><b>Caixa fechado.</b> {resumo.qtdVendas} pedido(s), {brl(resumo.totalVendido)} vendidos. Contado {brl(contado)}, esperado {brl(resumo.dinheiroEsperado)}: {diferenca === 0 ? 'bateu certinho.' : `${diferenca > 0 ? 'sobrou' : 'faltou'} ${brl(Math.abs(diferenca))}.`}</span>
      <button className="btn-ic" onClick={aoFechar} aria-label="Fechar aviso"><Ic n="x" /></button>
    </div>
  );
}
