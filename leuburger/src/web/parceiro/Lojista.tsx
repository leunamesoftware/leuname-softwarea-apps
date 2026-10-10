// Pedêê Parceiro (app do lojista): cadastra a loja e cuida de tudo num painel simples
// (Pedidos, Cardápio, Entregadores e Minha loja). O caixa completo continua disponível para quem quiser.
import { CIDADES_RJ } from '../cidades-rj';
import { CULINARIAS } from '../culinarias';
import { faltam, prazo, useRelogio, type Prazos } from '../tempo';
import { useEffect, useRef, useState } from 'react';
import { brl, FORMAS, lerValor, type Forma, type Opcoes } from '../../regras/pedido';
import { RAPIDAS_LOJA_CLIENTE } from '../../regras/mensagens';
import { del, ErroApp, get, post, put } from '../api';
import { Modal, msgErro, reduzirFoto } from '../comuns';
import { AtivarAvisos } from '../avisos';
import { Ic } from '../icones';

const TIPOS: [string, string][] = CULINARIAS.map(([v, n]) => [v, n]);
interface Empresa { id: string; nome: string; cnpj: string | null; telefone: string | null; endereco: string | null; cidade: string | null; uf: string | null; mensagem_cupom: string | null;
  formas_pagamento: Forma[]; desconto_max_caixa: number; largura_cupom: string; taxa_entrega_padrao: number; no_app: boolean; aceitando: boolean; slug: string | null; acesso_ate: string | null; aprovada?: boolean }
interface Eu { usuario: { nome: string }; empresa: Empresa }
const dig = (s: string | null | undefined) => String(s || '').replace(/\D/g, '');
/** Tira o +55 que o celular preenche sozinho. */
const foneBR = (s: string) => { const d = dig(s); return (d.length === 12 || d.length === 13) && d.startsWith('55') ? d.slice(2) : d; };
const reais = (c: number) => (c ? (c / 100).toFixed(2).replace('.', ',') : '');

export function Lojista() {
  const [eu, setEu] = useState<Eu | null>(null);
  const [estado, setEstado] = useState<'carregando' | 'fora' | 'dentro' | 'vencido'>('carregando');
  const carregar = () => get<Eu>('/eu').then((r) => { setEu(r); setEstado('dentro'); })
    .catch((e) => setEstado(e instanceof ErroApp && e.status === 402 ? 'vencido' : 'fora'));
  useEffect(() => { carregar(); }, []);
  if (estado === 'carregando') return <div className="pd"><TopoLoja titulo="Minha loja" /><div className="carregando"><div className="giro" /></div></div>;
  if (estado === 'vencido') return <div className="pd"><TopoLoja titulo="Minha loja" /><main className="pd-corpo"><div className="aviso erro">O período grátis da sua loja terminou. Fale com a gente pelo WhatsApp para continuar: são R$ 29,90 por mês, sem comissão.</div>
    <button className="btn" onClick={async () => { await post('/auth/sair').catch(() => {}); setEstado('fora'); }}>Sair</button></main></div>;
  if (estado === 'fora' || !eu) return <EntrarOuCadastrar aoEntrar={carregar} />;
  return <Painel eu={eu} recarregar={carregar} aoSair={() => setEstado('fora')} />;
}

function TopoLoja({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return <header className="pd-topo"><img src="/parceiro-icone-64.png" alt="" style={{ width: 36, height: 36, borderRadius: 9 }} /><span className="pd-topo-tit">{titulo}</span>{children || <span style={{ width: 36 }} />}</header>;
}

// ---------- entrar ou cadastrar ----------
function EntrarOuCadastrar({ aoEntrar }: { aoEntrar: () => void }) {
  const [aba, setAba] = useState<'cadastrar' | 'entrar'>(() => { try { return localStorage.getItem('parceiro_ja_entrou') ? 'entrar' : 'cadastrar'; } catch { return 'cadastrar'; } });
  const [f, setF] = useState({ loja: '', tipo_loja: 'lanches', nome: '', whatsapp: '', cidade: '', uf: 'RJ', endereco: '', senha: '', login: '' });
  const [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false), [ver, setVer] = useState(false);
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setErro(''); };
  const entrar = async () => {
    const login = f.login.includes('@') ? f.login.trim() : foneBR(f.login);
    if (!login || !f.senha) return setErro('Digite o WhatsApp e a senha.');
    setOcupado(true);
    try { await post('/auth/entrar', { login, senha: f.senha }); try { localStorage.setItem('parceiro_ja_entrou', '1'); } catch { /* sem armazenamento */ } aoEntrar(); } catch (e) { setErro(msgErro(e)); } finally { setOcupado(false); }
  };
  const cadastrar = async () => {
    setOcupado(true);
    try { await post('/publico/app/cadastrar-loja', { loja: f.loja, tipo_loja: f.tipo_loja, nome: f.nome, whatsapp: f.whatsapp, cidade: f.cidade, uf: f.uf, endereco: f.endereco, senha: f.senha }); try { localStorage.setItem('parceiro_ja_entrou', '1'); } catch { /* sem armazenamento */ } aoEntrar(); }
    catch (e) { setErro(e instanceof ErroApp && e.campos ? Object.values(e.campos)[0] || msgErro(e) : msgErro(e)); } finally { setOcupado(false); }
  };
  const campoSenha = <label className="campo largo">Senha<span className="entrada"><input type={ver ? 'text' : 'password'} value={f.senha} onChange={muda('senha')} autoComplete={aba === 'entrar' ? 'current-password' : 'new-password'} placeholder={aba === 'cadastrar' ? 'Pelo menos 6 letras ou números' : ''} />
    <button type="button" className="depois btn-ic" onClick={() => setVer(!ver)} aria-label={ver ? 'Esconder senha' : 'Mostrar senha'}><Ic n={ver ? 'olhoFechado' : 'olho'} /></button></span></label>;
  return (
    <div className="pd">
      <TopoLoja titulo="Pedêê Parceiro" />
      <main className="pd-corpo">
        <section className="cartao" style={{ textAlign: 'center' }}>
          <img src="/pedir-icone-192.png" alt="" style={{ width: 72, height: 72, borderRadius: 18 }} />
          <h1 style={{ margin: '8px 0 4px', fontSize: 22 }}>Venda pelo Pedêê</h1>
          <p style={{ margin: 0, color: 'var(--suave)' }}>Cadastre sua loja em 1 minuto. A equipe do Pedêê confere e libera a loja para os clientes. <b>R$ 29,90 por mês</b>, <b>sem comissão</b> nas suas vendas.</p>
        </section>
        <div className="chips" role="tablist">
          <button className={`chip ${aba === 'cadastrar' ? 'sel' : ''}`} onClick={() => { setAba('cadastrar'); setErro(''); }}>Cadastrar minha loja</button>
          <button className={`chip ${aba === 'entrar' ? 'sel' : ''}`} onClick={() => { setAba('entrar'); setErro(''); }}>Já tenho cadastro</button>
        </div>
        <section className="cartao">
          {aba === 'entrar' ? <div className="campos">
            <label className="campo largo">WhatsApp da loja<input value={f.login} onChange={muda('login')} inputMode="tel" autoComplete="username" placeholder="(21) 99999-9999" /></label>
            {campoSenha}
            <button className="btn prim grande bloco largo" onClick={entrar} disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
          </div> : <div className="campos">
            <label className="campo largo">Nome da loja<input value={f.loja} onChange={muda('loja')} maxLength={60} placeholder="Ex.: Lanchonete do Zé" /></label>
            <label className="campo">Tipo<select value={f.tipo_loja} onChange={muda('tipo_loja')}>{TIPOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
            <label className="campo">Seu nome<input value={f.nome} onChange={muda('nome')} maxLength={60} autoComplete="name" /></label>
            <label className="campo">Seu WhatsApp (é com ele que você entra no app)<input value={f.whatsapp} onChange={muda('whatsapp')} inputMode="tel" autoComplete="tel" placeholder="(21) 99999-9999" /></label>
            <label className="campo">Cidade<input value={f.cidade} onChange={muda('cidade')} maxLength={60} list="cidades-rj" placeholder="Ex.: Duque de Caxias" /><datalist id="cidades-rj">{CIDADES_RJ.map((c) => <option key={c} value={c} />)}</datalist></label>
            <label className="campo largo">Endereço da loja<input value={f.endereco} onChange={muda('endereco')} maxLength={150} placeholder="Rua, número e bairro" /></label>
            <label className="campo">UF<input value={f.uf} onChange={(e) => setF({ ...f, uf: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} /></label>
            {campoSenha}
            <button className="btn prim grande bloco largo" onClick={cadastrar} disabled={ocupado}><Ic n="loja" />{ocupado ? 'Criando a loja…' : 'Cadastrar minha loja'}</button>
          </div>}
          {erro && <p className="aviso erro" role="alert" style={{ marginBottom: 0 }}>{erro}</p>}
        </section>
      </main>
    </div>
  );
}

// ---------- painel ----------
type Aba = 'pedidos' | 'vitrine' | 'entregadores' | 'loja';
function Painel({ eu, recarregar, aoSair }: { eu: Eu; recarregar: () => void; aoSair: () => void }) {
  const [aba, setAba] = useState<Aba>('pedidos');
  const [novos, setNovos] = useState(0);
  const e = eu.empresa;
  const abrirFechar = async () => { await post('/loja-app/aceitando', { aceitando: !e.aceitando }).catch(() => {}); recarregar(); };
  return (
    <div className="pd">
      <TopoLoja titulo={e.nome}><button className="pd-voltar" onClick={abrirFechar} aria-label={e.aceitando ? 'Fechar a loja' : 'Abrir a loja'} title={e.aceitando ? 'Aberta' : 'Fechada'} style={{ width: 'auto', padding: '0 10px', fontWeight: 800, fontSize: 13 }}>{e.aceitando ? '🟢 Aberta' : '🔴 Fechada'}</button></TopoLoja>
      {aba === 'vitrine' && <div style={{ paddingBottom: 80 }}><LojaEditavel e={e} recarregar={recarregar} /></div>}
      <main className="pd-corpo" style={{ paddingBottom: 90, display: aba === 'vitrine' ? 'none' : undefined }}>
        {aba === 'pedidos' && <Pedidos aoContar={setNovos} loja={e.nome} aprovada={e.aprovada} />}
        {aba === 'entregadores' && <Entregadores />}
        {aba === 'loja' && <MinhaLoja e={e} recarregar={recarregar} aoSair={aoSair} />}
      </main>
      <nav className="pd-abas-lojista">
        {([['pedidos', 'pedidos', 'Pedidos'], ['vitrine', 'loja', 'Minha loja'], ['entregadores', 'seta', 'Entregadores'], ['loja', 'config', 'Ajustes']] as [Aba, string, string][]).map(([v, ic, n]) => (
          <button key={v} className={aba === v ? 'ativo' : ''} onClick={() => setAba(v)}><span className="bolha"><Ic n={ic} />{v === 'pedidos' && novos > 0 && <i>{novos}</i>}</span>{n}</button>
        ))}
      </nav>
    </div>
  );
}

// ---------- pedidos ----------
interface Novo { cancelar_ate: string | null; cancelado_em: string | null; nome_cliente?: string; id: string; nome: string; telefone: string; tipo: 'entrega' | 'balcao'; endereco: string | null; forma: Forma; troco_para: number | null; observacao: string | null; itens: { nome: string; qtd: number; detalhes: { tamanho?: string; adicionais?: { nome: string }[]; retirar?: string[]; observacao?: string } }[]; total: number; criado_em: string }
interface EmAndamento { prazos?: Prazos | null; app_id?: string | null; conversa_entregador?: { de: 'loja' | 'entregador'; texto: string; criado_em: string }[]; app_cancelar_ate: string | null; pede_codigo: number | boolean | null; id: string; numero: number; tipo: 'entrega' | 'balcao'; andamento: string; entregador: string | null; entregador_id: string | null; total: number; troco: number; criado_em: string; finalizado_em: string | null; endereco_entrega: string | null; observacao: string | null; token_entregador: string; cliente: string | null; cliente_telefone: string | null; resumo: string | null; formas: string | null }
const det = (d: Novo['itens'][0]['detalhes']) => [d.tamanho && d.tamanho !== 'Padrão' ? d.tamanho : '', ...(d.adicionais || []).map((a) => a.nome), ...(d.retirar || []).map((r) => 'sem ' + r.toLowerCase()), d.observacao || ''].filter(Boolean).join(' · ');
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
function plim() {
  try {
    const A = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext, ctx = new A();
    [0, 0.2, 0.4].forEach((t, k) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = [880, 1175, 1320][k]; g.gain.setValueAtTime(0.3, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35); o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.4); });
    navigator.vibrate?.([300, 100, 300]);
  } catch { /* sem som */ }
}

/** Conversa da loja com o entregador do pedido (livre, sem telefone). */
function ConversaEntregador({ p, aoEnviar }: { p: EmAndamento; aoEnviar: () => Promise<void> }) {
  const msgs = p.conversa_entregador || [];
  const dele = msgs.filter((m) => m.de === 'entregador').length;
  const [aberta, setAberta] = useState(false), [vistas, setVistas] = useState(dele), [texto, setTexto] = useState(''), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const novas = aberta ? 0 : dele - vistas;
  const enviar = async () => {
    if (!texto.trim()) return;
    setOcupado(true);
    try { await post(`/vendas/${p.id}/mensagem-entregador`, { texto: texto.trim() }); setTexto(''); setErro(''); await aoEnviar(); } catch (e) { setErro(msgErro(e)); } finally { setOcupado(false); }
  };
  const nome = p.entregador?.split(' ')[0] || 'entregador';
  if (!aberta) return <button className={`btn bloco peq ${novas > 0 ? 'prim' : ''}`} style={{ marginTop: 8 }} onClick={() => { setAberta(true); setVistas(dele); }}>💬 Conversar com {nome}{novas > 0 && ` (${novas} nova${novas > 1 ? 's' : ''})`}</button>;
  return (
    <div className="ent-chat ent-chat-loja" style={{ marginTop: 8 }}>
      <b>💬 Conversa com {nome}</b><button className="link" style={{ float: 'right' }} onClick={() => { setAberta(false); setVistas(dele); }}>Fechar</button>
      {!msgs.length && <small className="ent-chat-dica">Fale com o entregador por aqui. O número de ninguém aparece.</small>}
      {msgs.map((m, k) => <p key={k} className={m.de === 'loja' ? 'eu' : 'ele'}>{m.texto}<small>{hora(m.criado_em)}</small></p>)}
      {erro && <p className="aviso erro">{erro}</p>}
      <div className="pd-chat-enviar"><input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={300} placeholder={`Mensagem para ${nome}`} aria-label="Mensagem para o entregador" onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }} /><button className="btn prim" onClick={enviar} disabled={!texto.trim() || ocupado}>Enviar</button></div>
    </div>
  );
}

type Msg = { de: string; texto: string; criado_em: string };
/** Conversa da loja com o cliente do pedido (no app, sem telefone; o servidor barra número, link e palavrão). */
function ConversaCliente({ pedidoId, nome, msgs, aoEnviar }: { pedidoId: string; nome: string; msgs: Msg[]; aoEnviar: () => Promise<void> }) {
  const dele = msgs.filter((m) => m.de === 'cliente').length;
  const [aberta, setAberta] = useState(false), [vistas, setVistas] = useState(0), [texto, setTexto] = useState(''), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const novas = aberta ? 0 : dele - vistas;
  const enviar = async (t: string) => {
    if (!t.trim()) return;
    setOcupado(true);
    try { await post(`/pedidos-app/${pedidoId}/mensagem`, { texto: t.trim() }); setTexto(''); setErro(''); await aoEnviar(); } catch (e) { setErro(msgErro(e)); } finally { setOcupado(false); }
  };
  const primeiro = nome.split(' ')[0];
  if (!aberta) return <button className={`btn bloco peq ${novas > 0 ? 'prim' : ''}`} style={{ marginTop: 8 }} onClick={() => { setAberta(true); setVistas(dele); }}>💬 Conversar com {primeiro}{novas > 0 && ` (${novas} nova${novas > 1 ? 's' : ''})`}</button>;
  return (
    <div className="ent-chat" style={{ marginTop: 8 }}>
      <b>💬 Conversa com {primeiro}</b><button className="link" style={{ float: 'right' }} onClick={() => { setAberta(false); setVistas(dele); }}>Fechar</button>
      {msgs.map((m, k) => <p key={k} className={m.de === 'loja' ? 'eu' : 'ele'}>{m.texto}<small>{hora(m.criado_em)}</small></p>)}
      <div className="ent-rapidas">{RAPIDAS_LOJA_CLIENTE.map((t) => <button key={t} className="chip" onClick={() => enviar(t)} disabled={ocupado}>{t}</button>)}</div>
      {erro && <p className="aviso erro">{erro}</p>}
      <div className="pd-chat-enviar"><input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={300} placeholder={`Mensagem para ${primeiro}`} aria-label="Mensagem para o cliente" onKeyDown={(e) => { if (e.key === 'Enter') enviar(texto); }} /><button className="btn prim" onClick={() => enviar(texto)} disabled={!texto.trim() || ocupado}>Enviar</button></div>
    </div>
  );
}

function Pedidos({ aoContar, aprovada }: { aoContar: (n: number) => void; loja: string; aprovada?: boolean }) {
  const [novos, setNovos] = useState<Novo[]>([]), [lista, setLista] = useState<EmAndamento[]>([]);
  const [carregou, setCarregou] = useState(false), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState('');
  const [recusar, setRecusar] = useState<Novo | null>(null), [cancelados, setCancelados] = useState<Novo[]>([]);
  const [escolher, setEscolher] = useState<EmAndamento | null>(null);
  const vistos = useRef<Set<string> | null>(null), msgsVistas = useRef<number | null>(null);
  const [conversas, setConversas] = useState<Record<string, Msg[]>>({});
  const carregar = async () => {
    try {
      const [a, b, cv] = await Promise.all([get<{ pedidos: (Novo & { status: string })[] }>('/pedidos-app'), get<{ pedidos: EmAndamento[] }>('/andamento'), get<{ conversas: Record<string, Msg[]> }>('/pedidos-app/conversas').catch(() => ({ conversas: {} }))]);
      const n = a.pedidos.filter((p) => p.status === 'aguardando');
      if (vistos.current && n.some((p) => !vistos.current!.has(p.id))) plim();
      vistos.current = new Set(n.map((p) => p.id));
      // Mensagem nova do entregador também toca o aviso.
      const nm = b.pedidos.reduce((t, p) => t + (p.conversa_entregador || []).filter((m) => m.de === 'entregador').length, 0)
        + Object.values(cv.conversas).reduce((t, l) => t + l.filter((m) => m.de === 'cliente').length, 0);
      setConversas(cv.conversas);
      if (msgsVistas.current != null && nm > msgsVistas.current) plim();
      msgsVistas.current = nm;
      setCancelados(a.pedidos.filter((p) => p.cancelado_em && Date.now() - new Date(p.cancelado_em).getTime() < 2 * 3600e3));
      setNovos(n); setLista(b.pedidos); aoContar(n.length); setErro(''); setCarregou(true);
    } catch (e) { setErro(msgErro(e)); }
  };
  useEffect(() => { carregar(); const t = setInterval(carregar, 10000); return () => clearInterval(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const agir = async (id: string, fn: () => Promise<unknown>) => { setOcupado(id); try { await fn(); await carregar(); } catch (e) { setErro(msgErro(e)); } finally { setOcupado(''); } };
  const andar = (p: EmAndamento, andamento: string) => {
    // Pedido do app entregue pela própria loja: também pede o código que o cliente tem no app.
    let codigo: string | null = null;
    if (andamento === 'entregue' && p.pede_codigo) { codigo = prompt('Código de entrega (4 números) que o cliente vê no app dele:'); if (!codigo) return; }
    return agir(p.id, () => post(`/vendas/${p.id}/andamento`, { andamento, codigo }));
  };
  useRelogio(novos.some((p) => p.cancelar_ate) || lista.some((p) => p.app_cancelar_ate));
  const abertos = lista.filter((p) => !['entregue', 'retirado'].includes(p.andamento));
  const feitos = lista.filter((p) => ['entregue', 'retirado'].includes(p.andamento)).reverse();
  if (!carregou && !erro) return <div className="carregando"><div className="giro" /></div>;
  return (
    <>
      {erro && <p className="aviso erro">{erro}</p>}
      {aprovada === false && <p className="aviso" style={{ margin: '0 0 12px' }}>⏳ <b>Sua loja está em análise.</b> Enquanto isso, monte o cardápio em “Minha loja”. Assim que a equipe do Pedêê aprovar, ela aparece para os clientes.</p>}
      <AtivarAvisos texto="Toca quando chegar pedido novo ou mensagem, mesmo com o app fechado." registrar={(endpoint) => post('/pedidos-app/push', { endpoint })} />
      <h2 className="pd-tit">Novos pedidos {novos.length > 0 && <span className="selo st-a_caminho">{novos.length}</span>}</h2>
      {!novos.length ? <p style={{ margin: 0, color: 'var(--suave)' }}>Nenhum pedido esperando. Quando chegar, toca um aviso. Deixe esta tela aberta.</p> : novos.map((p) => (
        <article key={p.id} className="ped novo">
          <div className="ped-topo"><b>{p.nome}</b><span className={`selo ${p.tipo === 'entrega' ? 'cat-combo' : ''}`}>{p.tipo === 'entrega' ? '🛵 Entrega' : '🏪 Retirada'}</span><small>{hora(p.criado_em)}</small></div>
          {p.itens.map((i, k) => <div key={k} className="ped-itens">{i.qtd}x {i.nome}{det(i.detalhes) && <span style={{ color: 'var(--suave)' }}> ({det(i.detalhes)})</span>}</div>)}
          {p.observacao && <div className="ped-obs">Obs.: {p.observacao}</div>}
          {p.tipo === 'entrega' && <div className="ped-end"><Ic n="inicio" t={16} />{p.endereco}</div>}
          <div className="ped-status"><span>{FORMAS[p.forma]}{p.troco_para ? ` · troco p/ ${brl(p.troco_para)}` : ''}</span><b className="num">{brl(p.total)}</b></div>
          {faltam(p.cancelar_ate) && <div className="aviso" style={{ margin: '6px 0' }}>⏳ O cliente ainda pode cancelar por {faltam(p.cancelar_ate)}. Se aceitar, só marque “Pronto” depois disso.</div>}
          <div className="ped-acoes">
            <button className="btn prim" disabled={ocupado === p.id} onClick={() => agir(p.id, () => post(`/pedidos-app/${p.id}/aceitar`))}><Ic n="check" />Aceitar</button>
            <button className="btn" onClick={() => setRecusar(p)}><Ic n="x" />Recusar</button>
          </div>
          <ConversaCliente pedidoId={p.id} nome={p.nome} msgs={conversas[p.id] || []} aoEnviar={carregar} />
        </article>
      ))}
      {cancelados.map((p) => <p key={p.id} className="aviso erro" style={{ margin: 0 }}>❌ <b>{p.nome}</b> cancelou o pedido ({brl(p.total)}). Não precisa preparar.</p>)}
      <h2 className="pd-tit">Em andamento</h2>
      {!abertos.length ? <p style={{ margin: 0, color: 'var(--suave)' }}>Nada em andamento.</p> : abertos.map((p) => (
        <article key={p.id} className="ped">
          <div className="ped-topo"><b>#{p.numero}</b><span className={`selo ${p.tipo === 'entrega' ? 'cat-combo' : ''}`}>{p.tipo === 'entrega' ? '🛵 Entrega' : '🏪 Retirada'}</span><small>{hora(p.criado_em)}</small></div>
          {p.cliente && <div className="ped-cli">{p.cliente}</div>}
          {p.resumo && <div className="ped-itens">{p.resumo}</div>}
          {p.tipo === 'entrega' && <div className="ped-end"><Ic n="inicio" t={16} />{p.endereco_entrega}</div>}
          {p.prazos && (() => {
            const pr = prazo(p.andamento === 'preparando' ? p.prazos.pronto : p.prazos.entrega || p.prazos.pronto);
            return pr && <div className={`lj-prazo ${pr.atrasado ? 'ruim' : ''}`}>{p.andamento === 'preparando' ? '👨‍🍳 Pronto até' : p.tipo === 'entrega' ? '🏠 Entregar até' : '🛍️ Retirada até'} <b>{pr.hora}</b> · {pr.atrasado ? `⚠️ ${pr.texto} — o cliente está vendo` : pr.texto}</div>;
          })()}
          <div className="ped-status"><span className={`selo st-${p.andamento}`}>{({ preparando: 'Em preparo', pronto: 'Pronto', a_caminho: 'A caminho' } as Record<string, string>)[p.andamento]}</span><b className="num">{brl(p.total)}</b></div>
          <div className="ped-acoes">
            {p.andamento === 'preparando' && <button className="btn prim" disabled={ocupado === p.id || Boolean(faltam(p.app_cancelar_ate))} onClick={() => andar(p, 'pronto')}><Ic n="check" />{faltam(p.app_cancelar_ate) ? `Pronto (espere ${faltam(p.app_cancelar_ate)})` : 'Pronto'}</button>}
            {p.andamento === 'pronto' && p.tipo === 'balcao' && <button className="btn prim" disabled={ocupado === p.id} onClick={() => andar(p, 'retirado')}><Ic n="check" />Cliente retirou</button>}
            {/* Entrega pronta sem entregador: o caminho principal é escolher o entregador (a entrega aparece no app dele). */}
            {p.andamento === 'pronto' && p.tipo === 'entrega' && !p.entregador_id && <button className="btn prim" onClick={() => setEscolher(p)}><Ic n="seta" />🛵 Escolher entregador</button>}
            {p.andamento === 'pronto' && p.tipo === 'entrega' && !p.entregador_id && <button className="btn" disabled={ocupado === p.id} onClick={() => andar(p, 'a_caminho')}>Eu mesmo levo</button>}
            {p.andamento === 'pronto' && p.tipo === 'entrega' && p.entregador_id && <span className="selo">Enviado para {p.entregador?.split(' ')[0]} · esperando sair</span>}
            {p.tipo === 'entrega' && p.andamento === 'preparando' && <button className="btn" onClick={() => setEscolher(p)}><Ic n="seta" />{p.entregador ? `Entregador: ${p.entregador.split(' ')[0]}` : '🛵 Escolher entregador'}</button>}
            {p.tipo === 'entrega' && p.andamento === 'pronto' && p.entregador_id && <button className="btn" onClick={() => setEscolher(p)}>Trocar entregador</button>}
            {p.andamento === 'a_caminho' && p.entregador && <span className="selo">🛵 Com {p.entregador.split(' ')[0]}</span>}
            {p.andamento === 'a_caminho' && <button className="btn prim" disabled={ocupado === p.id} onClick={() => andar(p, 'entregue')}><Ic n="check" />Entregue</button>}
          </div>
          {p.app_id && <ConversaCliente pedidoId={p.app_id} nome={p.cliente || 'cliente'} msgs={conversas[p.app_id] || []} aoEnviar={carregar} />}
          {p.entregador_id && <ConversaEntregador p={p} aoEnviar={carregar} />}
        </article>
      ))}
      {feitos.length > 0 && <><h2 className="pd-tit">Finalizados (últimas 3 horas)</h2>{feitos.map((p) => (
        <div key={p.id} className="linha-valor" style={{ padding: '6px 0', borderBottom: '1px solid var(--linha)' }}><span>#{p.numero} · {p.cliente || 'Cliente'} · {p.andamento === 'entregue' ? 'entregue' : 'retirado'}</span><b className="num">{brl(p.total)}</b></div>
      ))}</>}
      {escolher && <EscolherEntregador pedido={escolher} aoFechar={() => setEscolher(null)} aoEscolher={async (id) => { const v = escolher; setEscolher(null); await agir(v.id, () => post(`/vendas/${v.id}/entregador`, { entregador_id: id })); }} />}
      {recusar && <Modal titulo="Recusar pedido" aoFechar={() => setRecusar(null)}>
        <p style={{ marginTop: 0 }}>Escolha o motivo. O cliente vê na tela do pedido.</p>
        <div className="chips" style={{ flexWrap: 'wrap' }}>{['Acabou um item do pedido', 'Fora da área de entrega', 'Loja muito cheia agora', 'Já vamos fechar'].map((m) => (
          <button key={m} className="chip" onClick={() => { const id = recusar.id; setRecusar(null); agir(id, () => post(`/pedidos-app/${id}/recusar`, { motivo: m })); }}>{m}</button>
        ))}</div>
      </Modal>}
    </>
  );
}

// ---------- cardápio ----------
interface Prod { id: string; nome: string; descricao: string | null; preco: number; custo: number; foto_id: string | null; categoria_id: string; categoria: string | null; categoria_icone: string | null; ativo: boolean; opcoes: unknown; receita: unknown[]; codigo: string | null }
interface Cat { id: string; nome: string; icone: string }
const iconeDe = (nome: string) => { const n = nome.toLowerCase(); return /burg|lanche|hamb|sandu|x-/.test(n) ? 'hamburguer' : /bebid|refri|suco|água|agua|cerveja/.test(n) ? 'bebida' : /porç|porc|batata|petisc|frit/.test(n) ? 'porcao' : /combo/.test(n) ? 'combo' : /açaí|acai|sorvet/.test(n) ? 'acai' : /doce|sobremesa|bolo|torta/.test(n) ? 'sobremesa' : 'outro'; };

type GrupoEd = { nome: string; min: string; max: string; repetir: boolean; itens: { nome: string; preco: string }[] };
const MODELOS: [string, GrupoEd][] = [
  ['🥫 Molhos', { nome: 'Molhos', min: '0', max: '2', repetir: false, itens: [{ nome: 'Ketchup', preco: '' }, { nome: 'Mostarda', preco: '' }, { nome: 'Maionese', preco: '' }] }],
  ['🥤 Bebida', { nome: 'Bebida', min: '1', max: '1', repetir: false, itens: [{ nome: 'Coca-Cola lata', preco: '' }, { nome: 'Guaraná lata', preco: '' }] }],
  ['➕ Turbinar', { nome: 'Turbine seu lanche', min: '0', max: '3', repetir: true, itens: [{ nome: 'Bacon', preco: '4,00' }, { nome: 'Cheddar', preco: '3,00' }] }],
  ['✏️ Em branco', { nome: '', min: '0', max: '1', repetir: false, itens: [{ nome: '', preco: '' }] }],
];
/** Grupos de escolha do produto: o cliente escolhe dentro de cada grupo (ex.: Molhos — escolha até 2). */
function EditorGrupos({ grupos, set }: { grupos: GrupoEd[]; set: (g: GrupoEd[]) => void }) {
  const muda = (k: number, x: Partial<GrupoEd>) => set(grupos.map((g, i) => (i === k ? { ...g, ...x } : g)));
  return (
    <div className="lj-grupos">
      <b>Escolhas do cliente</b>
      <p>Opcional. Ex.: molhos, bebida do combo, ponto da carne, adicionais pagos. Mínimo 0 = não é obrigatório.</p>
      {grupos.map((g, k) => (
        <div key={k} className="lj-grupo">
          <div className="lj-grupo-topo">
            <input value={g.nome} onChange={(e) => muda(k, { nome: e.target.value.slice(0, 40) })} placeholder="Nome (ex.: Molhos)" aria-label="Nome do grupo" />
            <label>Mín.<input value={g.min} onChange={(e) => muda(k, { min: e.target.value.replace(/\D/g, '').slice(0, 2) })} inputMode="numeric" /></label>
            <label>Máx.<input value={g.max} onChange={(e) => muda(k, { max: e.target.value.replace(/\D/g, '').slice(0, 2) })} inputMode="numeric" /></label>
            <button className="btn-ic vermelho" onClick={() => set(grupos.filter((_, i) => i !== k))} aria-label="Tirar grupo"><Ic n="lixeira" /></button>
          </div>
          {g.itens.map((it, j) => (
            <div key={j} className="lj-grupo-item">
              <input value={it.nome} onChange={(e) => muda(k, { itens: g.itens.map((y, i) => (i === j ? { ...y, nome: e.target.value.slice(0, 40) } : y)) })} placeholder="Opção" aria-label="Opção" />
              <input value={it.preco} onChange={(e) => muda(k, { itens: g.itens.map((y, i) => (i === j ? { ...y, preco: e.target.value } : y)) })} placeholder="+ R$" inputMode="decimal" aria-label="Preço a mais" />
              <button className="btn-ic" onClick={() => muda(k, { itens: g.itens.filter((_, i) => i !== j) })} aria-label="Tirar opção"><Ic n="x" /></button>
            </div>
          ))}
          <div className="lj-grupo-pe">
            <button className="link" onClick={() => muda(k, { itens: [...g.itens, { nome: '', preco: '' }] })}>+ opção</button>
            <label><input type="checkbox" checked={g.repetir} onChange={(e) => muda(k, { repetir: e.target.checked })} />Pode repetir (2x Bacon)</label>
          </div>
        </div>
      ))}
      <div className="chips">{MODELOS.map(([n, m]) => <button key={n} className="chip" onClick={() => set([...grupos, JSON.parse(JSON.stringify(m))])}>{n}</button>)}</div>
    </div>
  );
}

function EditarProduto({ p, categorias, categoriaInicial, aoFechar, aoSalvar }: { p: Prod | null; categorias: Cat[]; categoriaInicial?: string; aoFechar: () => void; aoSalvar: () => void }) {
  const [f, setF] = useState({ nome: p?.nome || '', descricao: p?.descricao || '', preco: reais(p?.preco || 0), categoria: p?.categoria || categoriaInicial || categorias[0]?.nome || '' });
  const [foto, setFoto] = useState(p?.foto_id || null);
  const [grupos, setGrupos] = useState<GrupoEd[]>(() => ((p?.opcoes as Opcoes | undefined)?.grupos || []).map((g) => ({ nome: g.nome, min: String(g.min), max: String(g.max), repetir: Boolean(g.repetir), itens: g.itens.map((i) => ({ nome: i.nome, preco: reais(i.preco) })) })));
  const [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const subir = async (arq?: File) => { if (!arq) return; setOcupado(true); try { setFoto((await post<{ id: string }>('/fotos', { dados: await reduzirFoto(arq) })).id); } catch (e) { setErro(msgErro(e)); } finally { setOcupado(false); } };
  const salvar = async () => {
    const preco = lerValor(f.preco);
    if (!f.nome.trim()) return setErro('Digite o nome do produto.');
    if (Number.isNaN(preco) || preco <= 0) return setErro('Digite o preço.');
    if (!f.categoria.trim()) return setErro('Digite a categoria (ex.: Lanches, Bebidas).');
    let ruim = '';
    const gr = grupos.filter((g) => g.nome.trim()).map((g) => {
      const itens = g.itens.filter((i) => i.nome.trim()).map((i) => { const v = i.preco.trim() ? lerValor(i.preco) : 0; if (Number.isNaN(v)) ruim = `Confira os preços em "${g.nome}".`; return { nome: i.nome.trim(), preco: v }; });
      const min = Number(g.min) || 0, max = Math.max(1, Number(g.max) || 1);
      if (!itens.length) ruim = `Coloque as opções de "${g.nome.trim()}".`;
      if (max < min) ruim = `Em "${g.nome.trim()}" o máximo é menor que o mínimo.`;
      return { nome: g.nome.trim(), min, max, repetir: g.repetir, itens };
    });
    if (ruim) return setErro(ruim);
    setOcupado(true); setErro('');
    try {
      let cat = categorias.find((c) => c.nome.toLowerCase() === f.categoria.trim().toLowerCase());
      if (!cat) { const nome = f.categoria.trim(); const r = await post<{ id: string }>('/categorias', { nome, icone: iconeDe(nome), ordem: categorias.length + 1 }); cat = { id: r.id, nome, icone: iconeDe(nome) }; }
      const dados = { nome: f.nome.trim(), descricao: f.descricao.trim() || null, codigo: p?.codigo || null, categoria_id: cat.id, preco, custo: p?.custo || 0, foto_id: foto, ativo: true, opcoes: { ...((p?.opcoes as Opcoes) || {}), grupos: gr }, receita: p?.receita || [] };
      if (p) await put(`/produtos/${p.id}`, dados); else await post('/produtos', dados);
      aoSalvar();
    } catch (e) { setErro(msgErro(e)); } finally { setOcupado(false); }
  };
  const tirar = async () => { if (!p || !confirm(`Tirar "${p.nome}" do cardápio?`)) return; try { await del(`/produtos/${p.id}`); aoSalvar(); } catch (e) { setErro(msgErro(e)); } };
  return (
    <Modal titulo={p ? 'Editar produto' : 'Novo produto'} aoFechar={aoFechar} pe={<>{p && <button className="btn perigo" onClick={tirar} style={{ marginRight: 'auto' }}><Ic n="lixeira" />Tirar</button>}<button className="btn" onClick={aoFechar}>Voltar</button><button className="btn prim" onClick={salvar} disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar'}</button></>}>
      <div className="campos">
        <div className="largo" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {foto ? <img src={`/api/fotos/${foto}`} alt="" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover' }} /> : <div className="sem-foto" style={{ width: 80, height: 80, borderRadius: 12, display: 'grid', placeItems: 'center' }}><Ic n="foto" t={28} /></div>}
          <label className="btn"><Ic n="foto" />{foto ? 'Trocar foto' : 'Tirar ou escolher foto'}<input type="file" accept="image/*" hidden onChange={(e) => subir(e.target.files?.[0])} /></label>
        </div>
        <label className="campo largo">Nome<input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} maxLength={60} placeholder="Ex.: X-Burger" /></label>
        <label className="campo largo">Descrição (opcional)<input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} maxLength={200} placeholder="Ex.: Pão, carne, queijo e salada" /></label>
        <label className="campo">Preço (R$)<input value={f.preco} onChange={(e) => setF({ ...f, preco: e.target.value })} inputMode="decimal" placeholder="0,00" /></label>
        <label className="campo">Categoria<input value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} list="lista-cats" maxLength={40} placeholder="Ex.: Lanches" /><datalist id="lista-cats">{categorias.map((c) => <option key={c.id} value={c.nome} />)}</datalist></label>
      </div>
      <EditorGrupos grupos={grupos} set={setGrupos} />
      {erro && <p className="aviso erro">{erro}</p>}
    </Modal>
  );
}

// ---------- Minha loja: a loja de verdade, igual o cliente vê, editando direto nela ----------
const fotoUrl = (id: string | null | undefined) => (id ? `/api/fotos/${id}` : null);
const PADRAO_FOTO: Record<string, string> = { hamburguer: '/img/hamburguer.webp', porcao: '/img/porcao.webp', bebida: '/img/bebida.webp', combo: '/img/combo.webp' };
function FotoProd({ p, className }: { p: Pick<Prod, 'foto_id' | 'categoria_icone'>; className?: string }) {
  const src = fotoUrl(p.foto_id) || (p.categoria_icone && PADRAO_FOTO[p.categoria_icone]);
  return src ? <img className={className} src={src} alt="" loading="lazy" /> : <div className={`sem-foto ${className || ''}`}><Ic n={p.categoria_icone || 'outro'} t={30} /></div>;
}
type Cfg = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function LojaEditavel({ e, recarregar }: { e: Empresa; recarregar: () => void }) {
  const [d, setD] = useState<{ cfg: Cfg; produtos: Prod[]; categorias: Cat[]; nota: number | null; avaliacoes: number } | null>(null);
  const [erro, setErro] = useState(''), [aviso, setAviso] = useState(''), [ocupado, setOcupado] = useState('');
  const [editar, setEditar] = useState<{ p: Prod | null; categoria?: string } | null>(null);
  const [dados, setDados] = useState(false), [cat, setCat] = useState('');
  const carregar = async () => {
    try {
      const [l, p, c] = await Promise.all([get<{ loja: Cfg }>('/loja-app'), get<{ produtos: Prod[] }>('/produtos'), get<{ categorias: Cat[] }>('/categorias')]);
      let nota: number | null = null, avaliacoes = 0;
      if (l.loja.slug) try { const pub = await get<{ loja: { nota: number | null; avaliacoes: number } }>(`/publico/app/loja/${encodeURIComponent(l.loja.slug)}`); nota = pub.loja.nota; avaliacoes = pub.loja.avaliacoes; } catch { /* loja ainda fora do app */ }
      setD({ cfg: l.loja, produtos: p.produtos.filter((x) => x.ativo), categorias: c.categorias, nota, avaliacoes }); setErro('');
    } catch (x) { setErro(msgErro(x)); }
  };
  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (aviso) { const t = setTimeout(() => setAviso(''), 2500); return () => clearTimeout(t); } }, [aviso]);
  // Salva a configuração da loja no app com uma mudança (banner, logo...). Manda tudo, como a tela Ajustes.
  const salvarCfg = async (mudanca: Cfg, texto: string) => {
    if (!d) return;
    const c = { ...d.cfg, ...mudanca };
    await put('/loja-app', { slug: c.slug, no_app: true, aceitando: Boolean(c.aceitando), faz_entrega: Boolean(c.faz_entrega), faz_retirada: Boolean(c.faz_retirada), tipo_loja: c.tipo_loja, descricao: c.descricao,
      logo_id: c.logo_id, capa_id: c.capa_id, tempo_entrega: c.tempo_entrega || null, pedido_minimo: c.pedido_minimo || 0, lat: c.lat ?? null, lng: c.lng ?? null, raio_km: c.raio_km || 8 });
    setD({ ...d, cfg: c }); setAviso(texto);
  };
  const trocarFoto = async (qual: 'capa_id' | 'logo_id', arq?: File) => {
    if (!arq) return;
    setOcupado(qual);
    try { const r = await post<{ id: string }>('/fotos', { dados: await reduzirFoto(arq, qual === 'capa_id' ? 1200 : 600) }); await salvarCfg({ [qual]: r.id }, qual === 'capa_id' ? '✓ Banner trocado' : '✓ Logo trocado'); }
    catch (x) { setErro(msgErro(x)); } finally { setOcupado(''); }
  };
  const novaCategoria = async () => {
    const nome = prompt('Nome da nova categoria (ex.: Lanches, Bebidas, Sobremesas):')?.trim();
    if (!nome || !d) return;
    try { await post('/categorias', { nome, icone: iconeDe(nome), ordem: d.categorias.length + 1 }); await carregar(); setAviso('✓ Categoria criada. Agora adicione os produtos dela.'); } catch (x) { setErro(msgErro(x)); }
  };
  const renomear = async (c: Cat) => {
    const nome = prompt('Novo nome da categoria:', c.nome)?.trim();
    if (!nome || nome === c.nome) return;
    try { await put(`/categorias/${c.id}`, { nome, icone: c.icone || iconeDe(nome), ordem: d?.categorias.findIndex((x) => x.id === c.id) ?? 0 }); await carregar(); } catch (x) { setErro(msgErro(x)); }
  };
  if (erro && !d) return <p className="aviso erro">{erro}</p>;
  if (!d) return <div className="carregando"><div className="giro" /></div>;
  const { cfg, produtos, categorias } = d;
  const comProdutos = categorias.filter((c) => produtos.some((p) => p.categoria_id === c.id));
  const vazias = categorias.filter((c) => !produtos.some((p) => p.categoria_id === c.id));
  const destaques = [...produtos].sort((a, b) => Number(Boolean(b.foto_id)) - Number(Boolean(a.foto_id))).slice(0, 6);
  const capa = fotoUrl(cfg.capa_id);
  const tipoNome = CULINARIAS.find(([v]) => v === cfg.tipo_loja)?.[1];
  const taxa = e.taxa_entrega_padrao;
  const irPara2 = (id: string) => { setCat(id); document.getElementById('ed-cat-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  return (
    <div className="pd-loja-pag lj-editavel">
      <div className="pd-loja-capa lj-capa" style={capa ? { backgroundImage: `url(${capa})` } : undefined}>
        <label className="lj-trocar">{ocupado === 'capa_id' ? 'Enviando…' : <><Ic n="foto" t={16} />{capa ? 'Trocar banner' : 'Colocar banner'}</>}<input type="file" accept="image/*" hidden onChange={(x) => trocarFoto('capa_id', x.target.files?.[0])} /></label>
      </div>
      <section className="pd-loja-card">
        <label className="pd-loja-logo lj-logo" title="Trocar logo">
          {cfg.logo_id ? <img className="logo-loja" src={fotoUrl(cfg.logo_id)!} alt="" style={{ width: 84, height: 84 }} /> : <span className="logo-loja letra" style={{ width: 84, height: 84, fontSize: 35 }}>{(e.nome.trim()[0] || '?').toUpperCase()}</span>}
          <i>{ocupado === 'logo_id' ? '…' : <Ic n="foto" t={14} />}</i>
          <input type="file" accept="image/*" hidden onChange={(x) => trocarFoto('logo_id', x.target.files?.[0])} />
        </label>
        <h1>{e.nome}</h1>
        <p className="pd-loja-linha">{[e.cidade, cfg.pedido_minimo > 0 ? `Mín ${brl(cfg.pedido_minimo)}` : '', tipoNome].filter(Boolean).join(' • ')}</p>
        <div className="pd-loja-item"><span>{d.nota ? <>★ <b>{d.nota.toLocaleString('pt-BR')}</b> ({d.avaliacoes} {d.avaliacoes === 1 ? 'avaliação' : 'avaliações'})</> : <><b>Novo</b> no Pedêê</>}</span></div>
        <div className="pd-loja-item"><span>{cfg.aceitando ? 'Padrão' : <b className="fechado">Fechada agora</b>}{cfg.tempo_entrega ? ` • ${cfg.tempo_entrega}` : ''} • <b className={taxa ? '' : 'verde'}>{!cfg.faz_entrega ? 'Só retirada' : taxa ? brl(taxa) : 'Grátis'}</b></span></div>
        {cfg.descricao ? <p className="pd-loja-desc">{cfg.descricao}</p> : <p className="pd-loja-desc" style={{ color: 'var(--suave)' }}>Sem descrição ainda.</p>}
        <button className="btn bloco peq" style={{ margin: '6px 0 10px' }} onClick={() => setDados(true)}><Ic n="lapis" t={16} />Editar nome, descrição, entrega e horários</button>
      </section>
      <div className="pd-loja-fixo">
        {categorias.length > 0 && <nav className="pd-loja-abas">{comProdutos.map((c) => <button key={c.id} className={cat === c.id ? 'sel' : ''} onClick={() => irPara2(c.id)}>{c.nome}</button>)}</nav>}
      </div>
      <main className="pd-corpo" style={{ paddingTop: 6 }}>
        {aviso && <p className="aviso lj-aviso">{aviso}</p>}
        {erro && <p className="aviso erro">{erro}</p>}
        {destaques.length > 2 && <section>
          <h2 className="pd-tit">Destaques</h2>
          <div className="pd-destaques-grade">{destaques.map((p, k) => (
            <button key={p.id} onClick={() => setEditar({ p })} aria-label={`Editar ${p.nome}`}>
              <span className="pd-dg-foto"><FotoProd p={p} />{k === 0 && <em>Mais pedido</em>}</span>
              <b className="num">{brl(p.preco)}</b><span>{p.nome}</span>
            </button>
          ))}</div>
        </section>}
        {!produtos.length && <div className="vazio"><Ic n="produtos" t={40} /><b>Sua loja ainda está vazia</b><span>Crie uma categoria (ex.: Lanches) e adicione os produtos com foto e preço. Assim que tiver o primeiro, os clientes já veem a loja.</span></div>}
        {[...comProdutos, ...vazias].map((c) => {
          const itens = produtos.filter((p) => p.categoria_id === c.id);
          return (
            <section key={c.id} id={'ed-cat-' + c.id} className="pd-loja-secao">
              <h2 className="pd-tit lj-cat"><span>{c.nome}</span><button className="link" onClick={() => renomear(c)}><Ic n="lapis" t={14} />Renomear</button></h2>
              <div className="pd-cardapio2">{itens.map((p) => (
                <button key={p.id} className="pd-prod2" onClick={() => setEditar({ p })} aria-label={`Editar ${p.nome}`}>
                  <span className="pd-prod-txt"><b>{p.nome}</b>{p.descricao && <small>{p.descricao}</small>}<span className="num">{brl(p.preco)}</span></span>
                  <span className="lj-foto"><FotoProd p={p} className="pd-prod2-foto" /><i><Ic n="lapis" t={14} /></i></span>
                </button>
              ))}</div>
              <button className="lj-mais" onClick={() => setEditar({ p: null, categoria: c.nome })}><Ic n="mais" t={18} />Adicionar produto em {c.nome}</button>
            </section>
          );
        })}
        <button className="btn bloco" style={{ marginTop: 18 }} onClick={novaCategoria}><Ic n="mais" />Nova categoria</button>
        {cfg.slug && <a className="btn bloco" style={{ marginTop: 8 }} href={`/pedir/${cfg.slug}`} target="_blank" rel="noopener"><Ic n="olho" />Abrir no app do cliente</a>}
        <div style={{ height: 20 }} />
      </main>
      {editar && <EditarProduto p={editar.p} categoriaInicial={editar.categoria} categorias={categorias} aoFechar={() => setEditar(null)} aoSalvar={() => { setEditar(null); carregar(); setAviso('✓ Salvo. Já aparece assim para os clientes.'); }} />}
      {dados && <Modal titulo="Dados da loja" aoFechar={() => { setDados(false); carregar(); }}><MinhaLoja e={e} recarregar={() => { recarregar(); carregar(); }} aoSair={() => {}} soDados /></Modal>}
    </div>
  );
}

// ---------- minha loja ----------
function MinhaLoja({ e, recarregar, aoSair, soDados }: { e: Empresa; recarregar: () => void; aoSair: () => void; soDados?: boolean }) {
  const [cfg, setCfg] = useState<Record<string, any> | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [f, setF] = useState({ nome: e.nome, telefone: e.telefone || '', endereco: e.endereco || '', cidade: e.cidade || '', uf: e.uf || '', taxa: reais(e.taxa_entrega_padrao), tempo: '', minimo: '', preparo: '20' });
  const [msg, setMsg] = useState(''), [ocupado, setOcupado] = useState(false);
  useEffect(() => { get<{ loja: Record<string, any> }>('/loja-app').then((r) => { setCfg(r.loja); setF((x) => ({ ...x, tempo: r.loja.tempo_entrega || '', minimo: reais(r.loja.pedido_minimo || 0), preparo: String(r.loja.tempo_preparo || 20) })); }).catch(() => {}); }, []); // eslint-disable-line @typescript-eslint/no-explicit-any
  const link = `${location.origin}/pedir/${e.slug || ''}`;
  const subirLogo = async (arq?: File) => {
    if (!arq || !cfg) return;
    try { const r = await post<{ id: string }>('/fotos', { dados: await reduzirFoto(arq) }); setCfg({ ...cfg, logo_id: r.id }); setMsg('Logo escolhido. Toque em Salvar.'); } catch (x) { setMsg(msgErro(x)); }
  };
  const subirCapa = async (arq?: File) => {
    if (!arq || !cfg) return;
    try { const r = await post<{ id: string }>('/fotos', { dados: await reduzirFoto(arq, 1200) }); setCfg({ ...cfg, capa_id: r.id }); setMsg('Banner escolhido. Toque em Salvar.'); } catch (x) { setMsg(msgErro(x)); }
  };
  const marcarLocal = () => navigator.geolocation?.getCurrentPosition((p) => { if (cfg) { setCfg({ ...cfg, lat: Math.round(p.coords.latitude * 1e5) / 1e5, lng: Math.round(p.coords.longitude * 1e5) / 1e5 }); setMsg('Localização marcada. Toque em Salvar.'); } }, () => setMsg('Permita a localização e tente de novo, de dentro da loja.'));
  const salvar = async () => {
    if (!cfg) return;
    const taxa = f.taxa.trim() ? lerValor(f.taxa) : 0, minimo = f.minimo.trim() ? lerValor(f.minimo) : 0;
    if (Number.isNaN(taxa) || Number.isNaN(minimo)) return setMsg('Confira os valores.');
    const preparo = Number(f.preparo);
    if (!(preparo >= 5 && preparo <= 180)) return setMsg('Tempo de preparo: de 5 a 180 minutos.');
    setOcupado(true); setMsg('');
    try {
      await put('/empresa', { nome: f.nome, cnpj: e.cnpj, telefone: f.telefone, endereco: f.endereco, cidade: f.cidade, uf: f.uf, mensagem_cupom: e.mensagem_cupom, formas_pagamento: e.formas_pagamento, desconto_max_caixa: e.desconto_max_caixa, largura_cupom: e.largura_cupom, taxa_entrega_padrao: taxa });
      await put('/loja-app', { slug: cfg.slug, no_app: true, aceitando: Boolean(cfg.aceitando), faz_entrega: Boolean(cfg.faz_entrega), faz_retirada: Boolean(cfg.faz_retirada), tipo_loja: cfg.tipo_loja, descricao: cfg.descricao,
        logo_id: cfg.logo_id, capa_id: cfg.capa_id, tempo_entrega: f.tempo.trim() || null, tempo_preparo: preparo, pedido_minimo: minimo, lat: cfg.lat ?? null, lng: cfg.lng ?? null, raio_km: cfg.raio_km || 8 });
      setMsg('Salvo!'); recarregar();
    } catch (x) { setMsg(msgErro(x)); } finally { setOcupado(false); }
  };
  const copiar = async () => { try { await navigator.clipboard.writeText(link); setMsg('Link copiado.'); } catch { setMsg(link); } };
  return (
    <>
      {!soDados && <section className="cartao">
        <h2 className="cartao-tit">Divulgue a sua loja</h2>
        <p style={{ margin: '0 0 8px', wordBreak: 'break-all' }}><b>{link}</b></p>
        <div className="dupla">
          <button className="btn" onClick={copiar}>Copiar link</button>
          <a className="btn prim" href={`https://wa.me/?text=${encodeURIComponent(`Agora você pede na ${e.nome} pelo Pedêê! 🍔\nToque no link, instale e faça o seu pedido:\n${link}`)}`} target="_blank" rel="noopener"><Ic n="whatsapp" />Mandar no WhatsApp</a>
        </div>
        {e.acesso_ate && <p style={{ color: 'var(--suave)', fontSize: 14, marginBottom: 0 }}>Grátis até {new Date(e.acesso_ate).toLocaleDateString('pt-BR')}. Depois, R$ 29,90 por mês, sem comissão.</p>}
      </section>}
      <section className="cartao">
        <h2 className="cartao-tit">Dados da loja</h2>
        <div className="campos">
          <label className="campo largo">Nome da loja<input value={f.nome} onChange={(x) => setF({ ...f, nome: x.target.value })} maxLength={60} /></label>
          <label className="campo">WhatsApp da loja<input value={f.telefone} onChange={(x) => setF({ ...f, telefone: x.target.value })} inputMode="tel" /></label>
          <label className="campo">Taxa de entrega (R$)<input value={f.taxa} onChange={(x) => setF({ ...f, taxa: x.target.value })} inputMode="decimal" placeholder="0,00 = grátis" /></label>
          <label className="campo">Tempo de entrega<input value={f.tempo} onChange={(x) => setF({ ...f, tempo: x.target.value.slice(0, 20) })} placeholder="Ex.: 30-45 min" /></label>
          <label className="campo">Tempo de preparo (min)<input value={f.preparo} onChange={(x) => setF({ ...f, preparo: x.target.value.replace(/\D/g, '').slice(0, 3) })} inputMode="numeric" placeholder="20" /><small style={{ color: 'var(--suave)', fontWeight: 500 }}>O cliente vê “pronto até…”. Passou, aparece atrasado.</small></label>
          <label className="campo">Pedido mínimo (R$)<input value={f.minimo} onChange={(x) => setF({ ...f, minimo: x.target.value })} inputMode="decimal" placeholder="0,00" /></label>
          <label className="campo largo">Sobre a loja (aparece na vitrine)<input value={cfg?.descricao || ''} onChange={(x) => cfg && setCfg({ ...cfg, descricao: x.target.value.slice(0, 140) })} maxLength={140} placeholder="Ex.: Hambúrguer artesanal feito na brasa desde 2015." /></label>
          <label className="campo largo">Endereço<input value={f.endereco} onChange={(x) => setF({ ...f, endereco: x.target.value })} maxLength={150} /></label>
          <label className="campo">Cidade<input value={f.cidade} onChange={(x) => setF({ ...f, cidade: x.target.value })} maxLength={60} list="cidades-rj" /><datalist id="cidades-rj">{CIDADES_RJ.map((c) => <option key={c} value={c} />)}</datalist></label>
          <label className="campo">UF<input value={f.uf} onChange={(x) => setF({ ...f, uf: x.target.value.toUpperCase().slice(0, 2) })} maxLength={2} /></label>
        </div>
        <div className="lista-config" style={{ marginTop: 10 }}>
          <div><span>Banner (foto grande do topo)<small style={{ display: 'block', color: 'var(--suave)', fontWeight: 500 }}>Foto deitada do seu melhor prato</small></span>{cfg?.capa_id && <img src={`/api/fotos/${cfg.capa_id}`} alt="" style={{ width: 64, height: 40, borderRadius: 8, objectFit: 'cover' }} />}<label className="btn peq"><Ic n="foto" t={16} />{cfg?.capa_id ? 'Trocar' : 'Colocar'}<input type="file" accept="image/*" hidden onChange={(x) => subirCapa(x.target.files?.[0])} /></label></div>
          <div><span>Logo da loja</span>{cfg?.logo_id && <img src={`/api/fotos/${cfg.logo_id}`} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />}<label className="btn peq"><Ic n="foto" t={16} />{cfg?.logo_id ? 'Trocar' : 'Colocar'}<input type="file" accept="image/*" hidden onChange={(x) => subirLogo(x.target.files?.[0])} /></label></div>
          <div><span>Localização (clientes perto veem a loja)<small style={{ display: 'block', color: 'var(--suave)', fontWeight: 500 }}>{cfg?.lat != null ? 'Marcada' : 'Faça de dentro da loja'}</small></span><button className="btn peq" onClick={marcarLocal}><Ic n="inicio" t={16} />Marcar aqui</button></div>
        </div>
        {msg && <p className="aviso" style={{ marginBottom: 0 }}>{msg}</p>}
        <button className="btn prim grande bloco" style={{ marginTop: 12 }} onClick={salvar} disabled={ocupado || !cfg}>{ocupado ? 'Salvando…' : 'Salvar'}</button>
      </section>
      {!soDados && <a className="btn bloco" href="/" target="_blank" rel="noopener"><Ic n="caixa" />Painel completo (caixa, estoque)</a>}
      {!soDados && <button className="btn bloco" onClick={async () => { await post('/auth/sair').catch(() => {}); aoSair(); }}><Ic n="sair" />Sair</button>}
    </>
  );
}

// ---------- entregadores da loja ----------
interface Moto { id: string; nome: string; email: string; veiculo: string; disponivel: boolean; em_rota: number }
const VEICULO: Record<string, string> = { moto: '🛵', bike: '🚲' };

function EscolherEntregador({ pedido, aoFechar, aoEscolher }: { pedido: { numero: number; entregador_id: string | null }; aoFechar: () => void; aoEscolher: (id: string | null) => void }) {
  const [lista, setLista] = useState<Moto[] | null>(null);
  useEffect(() => { get<{ entregadores: Moto[] }>('/entregadores').then((r) => setLista(r.entregadores)).catch(() => setLista([])); }, []);
  return (
    <Modal titulo={`Quem leva o pedido #${pedido.numero}?`} aoFechar={aoFechar}>
      {!lista ? <div className="carregando"><div className="giro" /></div> : !lista.length ? <p style={{ margin: 0 }}>Você ainda não tem entregadores. Abra a aba <b>Entregadores</b> e cadastre pelo e-mail deles (eles precisam ter o app <b>Pedêê Entregador</b>).</p> : (
        <div className="lista-config">{lista.map((m) => (
          <div key={m.id}><span>{VEICULO[m.veiculo] || '🛵'} {m.nome}<small style={{ display: 'block', color: m.disponivel ? 'var(--verde)' : 'var(--suave)', fontWeight: 600 }}>{m.disponivel ? 'Disponível' : 'Indisponível'}{m.em_rota ? ` · ${m.em_rota} entrega(s) com ele` : ''}</small></span>
            <button className={`btn peq ${pedido.entregador_id === m.id ? '' : 'prim'}`} onClick={() => aoEscolher(m.id)}>{pedido.entregador_id === m.id ? 'Escolhido' : 'Escolher'}</button></div>
        ))}</div>
      )}
      {pedido.entregador_id && <button className="btn bloco" style={{ marginTop: 12 }} onClick={() => aoEscolher(null)}>Tirar o entregador deste pedido</button>}
    </Modal>
  );
}

function Entregadores() {
  const [lista, setLista] = useState<Moto[] | null>(null), [email, setEmail] = useState(''), [msg, setMsg] = useState(''), [ocupado, setOcupado] = useState(false);
  const carregar = () => get<{ entregadores: Moto[] }>('/entregadores').then((r) => setLista(r.entregadores)).catch((e) => setMsg(msgErro(e)));
  useEffect(() => { carregar(); const t = setInterval(carregar, 20000); return () => clearInterval(t); }, []);
  const adicionar = async () => {
    setOcupado(true); setMsg('');
    try { const r = await post<{ nome: string }>('/entregadores', { email }); setMsg(`${r.nome} agora é entregador da sua loja.`); setEmail(''); carregar(); } catch (e) { setMsg(msgErro(e)); } finally { setOcupado(false); }
  };
  const tirar = async (m: Moto) => { if (!confirm(`Tirar ${m.nome} dos entregadores da loja?`)) return; await del(`/entregadores/${m.id}`).catch(() => {}); carregar(); };
  return (
    <>
      <section className="cartao">
        <h2 className="cartao-tit">Seus entregadores</h2>
        <p style={{ margin: '0 0 10px', color: 'var(--suave)', fontSize: 14 }}>O entregador baixa o app <b>Pedêê Entregador</b> e se cadastra. Depois você coloca o e-mail dele aqui. Quando o pedido ficar pronto, você escolhe quem leva e a entrega aparece no app dele, com aviso.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8 }}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" placeholder="E-mail do entregador" aria-label="E-mail do entregador" />
          <button className="btn prim" onClick={adicionar} disabled={ocupado || !email.includes('@')}><Ic n="mais" />Adicionar</button>
        </div>
        {msg && <p className="aviso" style={{ marginBottom: 0 }}>{msg}</p>}
      </section>
      {!lista ? <div className="carregando"><div className="giro" /></div> : !lista.length ? <div className="vazio"><span style={{ fontSize: 40 }}>🛵</span><b>Nenhum entregador ainda</b><span>Adicione pelo e-mail acima.</span></div> : (
        <section className="cartao"><div className="lista-config">{lista.map((m) => (
          <div key={m.id}><span>{VEICULO[m.veiculo] || '🛵'} {m.nome}<small style={{ display: 'block', color: m.disponivel ? 'var(--verde)' : 'var(--suave)', fontWeight: 600 }}>{m.disponivel ? 'Disponível' : 'Indisponível'}{m.em_rota ? ` · ${m.em_rota} entrega(s) agora` : ''}</small></span>
            <button className="btn-ic vermelho" onClick={() => tirar(m)} aria-label={`Tirar ${m.nome}`}><Ic n="lixeira" /></button></div>
        ))}</div></section>
      )}
    </>
  );
}
