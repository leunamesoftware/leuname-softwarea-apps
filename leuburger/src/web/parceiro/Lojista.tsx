// Pedêê Parceiro (app do lojista): cadastra a loja e cuida de tudo num painel simples
// (Pedidos, Cardápio, Motoboys e Minha loja). O caixa completo continua disponível para quem quiser.
import { CIDADES_RJ } from '../cidades-rj';
import { useEffect, useRef, useState } from 'react';
import { brl, FORMAS, lerValor, type Forma } from '../../regras/pedido';
import { del, ErroApp, get, post, put } from '../api';
import { Modal, msgErro, reduzirFoto } from '../comuns';
import { Ic } from '../icones';

const TIPOS: [string, string][] = [['lanches', 'Lanches'], ['hamburgueria', 'Hamburgueria'], ['pizzaria', 'Pizzaria'], ['restaurante', 'Restaurante'], ['marmitaria', 'Marmitaria'],
  ['acai', 'Açaí e sorvetes'], ['pastelaria', 'Pastelaria'], ['japonesa', 'Comida japonesa'], ['doces', 'Doces e bolos'], ['bebidas', 'Bebidas']];
interface Empresa { id: string; nome: string; cnpj: string | null; telefone: string | null; endereco: string | null; cidade: string | null; uf: string | null; mensagem_cupom: string | null;
  formas_pagamento: Forma[]; desconto_max_caixa: number; largura_cupom: string; taxa_entrega_padrao: number; no_app: boolean; aceitando: boolean; slug: string | null; acesso_ate: string | null }
interface Eu { usuario: { nome: string }; empresa: Empresa }
const dig = (s: string | null | undefined) => String(s || '').replace(/\D/g, '');
const wa = (tel: string | null | undefined, texto = '') => { const n = dig(tel); return `https://wa.me/${n.length >= 10 && n.length <= 11 ? '55' + n : n}${texto ? '?text=' + encodeURIComponent(texto) : ''}`; };
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
    const login = f.login.includes('@') ? f.login.trim() : dig(f.login);
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
          <p style={{ margin: 0, color: 'var(--suave)' }}>Cadastre sua lanchonete em 1 minuto. <b>Primeiro mês grátis</b>, depois R$ 29,90 por mês. <b>Sem comissão</b> nas suas vendas.</p>
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
            <label className="campo">WhatsApp (será o seu login)<input value={f.whatsapp} onChange={muda('whatsapp')} inputMode="tel" autoComplete="tel" placeholder="(21) 99999-9999" /></label>
            <label className="campo">Cidade<input value={f.cidade} onChange={muda('cidade')} maxLength={60} list="cidades-rj" placeholder="Ex.: Duque de Caxias" /><datalist id="cidades-rj">{CIDADES_RJ.map((c) => <option key={c} value={c} />)}</datalist></label>
            <label className="campo largo">Endereço da loja<input value={f.endereco} onChange={muda('endereco')} maxLength={150} placeholder="Rua, número e bairro" /></label>
            <label className="campo">UF<input value={f.uf} onChange={(e) => setF({ ...f, uf: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} /></label>
            {campoSenha}
            <button className="btn prim grande bloco largo" onClick={cadastrar} disabled={ocupado}><Ic n="loja" />{ocupado ? 'Criando a loja…' : 'Criar minha loja grátis'}</button>
          </div>}
          {erro && <p className="aviso erro" role="alert" style={{ marginBottom: 0 }}>{erro}</p>}
        </section>
      </main>
    </div>
  );
}

// ---------- painel ----------
type Aba = 'pedidos' | 'cardapio' | 'motoboys' | 'loja';
function Painel({ eu, recarregar, aoSair }: { eu: Eu; recarregar: () => void; aoSair: () => void }) {
  const [aba, setAba] = useState<Aba>('pedidos');
  const [novos, setNovos] = useState(0);
  const e = eu.empresa;
  const abrirFechar = async () => { await post('/loja-app/aceitando', { aceitando: !e.aceitando }).catch(() => {}); recarregar(); };
  return (
    <div className="pd">
      <TopoLoja titulo={e.nome}><button className="pd-voltar" onClick={abrirFechar} aria-label={e.aceitando ? 'Fechar a loja' : 'Abrir a loja'} title={e.aceitando ? 'Aberta' : 'Fechada'} style={{ width: 'auto', padding: '0 10px', fontWeight: 800, fontSize: 13 }}>{e.aceitando ? '🟢 Aberta' : '🔴 Fechada'}</button></TopoLoja>
      <main className="pd-corpo" style={{ paddingBottom: 90 }}>
        {aba === 'pedidos' && <Pedidos aoContar={setNovos} loja={e.nome} />}
        {aba === 'cardapio' && <Cardapio />}
        {aba === 'motoboys' && <Motoboys />}
        {aba === 'loja' && <MinhaLoja e={e} recarregar={recarregar} aoSair={aoSair} />}
      </main>
      <nav className="pd-abas-lojista">
        {([['pedidos', 'pedidos', 'Pedidos'], ['cardapio', 'produtos', 'Cardápio'], ['motoboys', 'seta', 'Motoboys'], ['loja', 'loja', 'Minha loja']] as [Aba, string, string][]).map(([v, ic, n]) => (
          <button key={v} className={aba === v ? 'ativo' : ''} onClick={() => setAba(v)}><span className="bolha"><Ic n={ic} />{v === 'pedidos' && novos > 0 && <i>{novos}</i>}</span>{n}</button>
        ))}
      </nav>
    </div>
  );
}

// ---------- pedidos ----------
interface Novo { id: string; nome: string; telefone: string; tipo: 'entrega' | 'balcao'; endereco: string | null; forma: Forma; troco_para: number | null; observacao: string | null; itens: { nome: string; qtd: number; detalhes: { tamanho?: string; adicionais?: { nome: string }[]; retirar?: string[]; observacao?: string } }[]; total: number; criado_em: string }
interface EmAndamento { id: string; numero: number; tipo: 'entrega' | 'balcao'; andamento: string; entregador: string | null; entregador_id: string | null; total: number; troco: number; criado_em: string; finalizado_em: string | null; endereco_entrega: string | null; observacao: string | null; token_entregador: string; cliente: string | null; cliente_telefone: string | null; resumo: string | null; formas: string | null }
const det = (d: Novo['itens'][0]['detalhes']) => [d.tamanho && d.tamanho !== 'Padrão' ? d.tamanho : '', ...(d.adicionais || []).map((a) => a.nome), ...(d.retirar || []).map((r) => 'sem ' + r.toLowerCase()), d.observacao || ''].filter(Boolean).join(' · ');
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
function plim() {
  try {
    const A = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext, ctx = new A();
    [0, 0.2, 0.4].forEach((t, k) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = [880, 1175, 1320][k]; g.gain.setValueAtTime(0.3, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35); o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.4); });
    navigator.vibrate?.([300, 100, 300]);
  } catch { /* sem som */ }
}

function Pedidos({ aoContar }: { aoContar: (n: number) => void; loja: string }) {
  const [novos, setNovos] = useState<Novo[]>([]), [lista, setLista] = useState<EmAndamento[]>([]);
  const [carregou, setCarregou] = useState(false), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState('');
  const [recusar, setRecusar] = useState<Novo | null>(null);
  const [escolher, setEscolher] = useState<EmAndamento | null>(null);
  const vistos = useRef<Set<string> | null>(null);
  const carregar = async () => {
    try {
      const [a, b] = await Promise.all([get<{ pedidos: (Novo & { status: string })[] }>('/pedidos-app'), get<{ pedidos: EmAndamento[] }>('/andamento')]);
      const n = a.pedidos.filter((p) => p.status === 'aguardando');
      if (vistos.current && n.some((p) => !vistos.current!.has(p.id))) plim();
      vistos.current = new Set(n.map((p) => p.id));
      setNovos(n); setLista(b.pedidos); aoContar(n.length); setErro(''); setCarregou(true);
    } catch (e) { setErro(msgErro(e)); }
  };
  useEffect(() => { carregar(); const t = setInterval(carregar, 10000); return () => clearInterval(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const agir = async (id: string, fn: () => Promise<unknown>) => { setOcupado(id); try { await fn(); await carregar(); } catch (e) { setErro(msgErro(e)); } finally { setOcupado(''); } };
  const andar = (p: EmAndamento, andamento: string) => agir(p.id, () => post(`/vendas/${p.id}/andamento`, { andamento }));
  const abertos = lista.filter((p) => !['entregue', 'retirado'].includes(p.andamento));
  const feitos = lista.filter((p) => ['entregue', 'retirado'].includes(p.andamento)).reverse();
  if (!carregou && !erro) return <div className="carregando"><div className="giro" /></div>;
  return (
    <>
      {erro && <p className="aviso erro">{erro}</p>}
      <h2 className="pd-tit">Novos pedidos {novos.length > 0 && <span className="selo st-a_caminho">{novos.length}</span>}</h2>
      {!novos.length ? <p style={{ margin: 0, color: 'var(--suave)' }}>Nenhum pedido esperando. Quando chegar, toca um aviso. Deixe esta tela aberta.</p> : novos.map((p) => (
        <article key={p.id} className="ped novo">
          <div className="ped-topo"><b>{p.nome}</b><span className={`selo ${p.tipo === 'entrega' ? 'cat-combo' : ''}`}>{p.tipo === 'entrega' ? '🛵 Entrega' : '🏪 Retirada'}</span><small>{hora(p.criado_em)}</small></div>
          {p.itens.map((i, k) => <div key={k} className="ped-itens">{i.qtd}x {i.nome}{det(i.detalhes) && <span style={{ color: 'var(--suave)' }}> ({det(i.detalhes)})</span>}</div>)}
          {p.observacao && <div className="ped-obs">Obs.: {p.observacao}</div>}
          {p.tipo === 'entrega' && <div className="ped-end"><Ic n="inicio" t={16} />{p.endereco}</div>}
          <div className="ped-status"><span>{FORMAS[p.forma]}{p.troco_para ? ` · troco p/ ${brl(p.troco_para)}` : ''}</span><b className="num">{brl(p.total)}</b></div>
          <div className="ped-acoes">
            <button className="btn prim" disabled={ocupado === p.id} onClick={() => agir(p.id, () => post(`/pedidos-app/${p.id}/aceitar`))}><Ic n="check" />Aceitar</button>
            <button className="btn" onClick={() => setRecusar(p)}><Ic n="x" />Recusar</button>
            <a className="btn" href={wa(p.telefone)} target="_blank" rel="noopener"><Ic n="whatsapp" /></a>
          </div>
        </article>
      ))}
      <h2 className="pd-tit">Em andamento</h2>
      {!abertos.length ? <p style={{ margin: 0, color: 'var(--suave)' }}>Nada em andamento.</p> : abertos.map((p) => (
        <article key={p.id} className="ped">
          <div className="ped-topo"><b>#{p.numero}</b><span className={`selo ${p.tipo === 'entrega' ? 'cat-combo' : ''}`}>{p.tipo === 'entrega' ? '🛵 Entrega' : '🏪 Retirada'}</span><small>{hora(p.criado_em)}</small></div>
          {p.cliente && <div className="ped-cli">{p.cliente}</div>}
          {p.resumo && <div className="ped-itens">{p.resumo}</div>}
          {p.tipo === 'entrega' && <div className="ped-end"><Ic n="inicio" t={16} />{p.endereco_entrega}</div>}
          <div className="ped-status"><span className={`selo st-${p.andamento}`}>{({ preparando: 'Em preparo', pronto: 'Pronto', a_caminho: 'A caminho' } as Record<string, string>)[p.andamento]}</span><b className="num">{brl(p.total)}</b></div>
          <div className="ped-acoes">
            {p.andamento === 'preparando' && <button className="btn prim" disabled={ocupado === p.id} onClick={() => andar(p, 'pronto')}><Ic n="check" />Pronto</button>}
            {p.andamento === 'pronto' && p.tipo === 'balcao' && <button className="btn prim" disabled={ocupado === p.id} onClick={() => andar(p, 'retirado')}><Ic n="check" />Cliente retirou</button>}
            {/* Entrega pronta sem motoboy: o caminho principal é escolher o motoboy (a entrega aparece no app dele). */}
            {p.andamento === 'pronto' && p.tipo === 'entrega' && !p.entregador_id && <button className="btn prim" onClick={() => setEscolher(p)}><Ic n="seta" />🛵 Escolher motoboy</button>}
            {p.andamento === 'pronto' && p.tipo === 'entrega' && !p.entregador_id && <button className="btn" disabled={ocupado === p.id} onClick={() => andar(p, 'a_caminho')}>Eu mesmo levo</button>}
            {p.andamento === 'pronto' && p.tipo === 'entrega' && p.entregador_id && <span className="selo">Enviado para {p.entregador?.split(' ')[0]} · esperando sair</span>}
            {p.tipo === 'entrega' && p.andamento === 'preparando' && <button className="btn" onClick={() => setEscolher(p)}><Ic n="seta" />{p.entregador ? `Motoboy: ${p.entregador.split(' ')[0]}` : '🛵 Escolher motoboy'}</button>}
            {p.tipo === 'entrega' && p.andamento === 'pronto' && p.entregador_id && <button className="btn" onClick={() => setEscolher(p)}>Trocar motoboy</button>}
            {p.andamento === 'a_caminho' && p.entregador && <span className="selo">🛵 Com {p.entregador.split(' ')[0]}</span>}
            {p.andamento === 'a_caminho' && <button className="btn prim" disabled={ocupado === p.id} onClick={() => andar(p, 'entregue')}><Ic n="check" />Entregue</button>}
            {p.cliente_telefone && <a className="btn" href={wa(p.cliente_telefone)} target="_blank" rel="noopener" aria-label="WhatsApp do cliente"><Ic n="usuario" /></a>}
          </div>
        </article>
      ))}
      {feitos.length > 0 && <><h2 className="pd-tit">Finalizados (últimas 3 horas)</h2>{feitos.map((p) => (
        <div key={p.id} className="linha-valor" style={{ padding: '6px 0', borderBottom: '1px solid var(--linha)' }}><span>#{p.numero} · {p.cliente || 'Cliente'} · {p.andamento === 'entregue' ? 'entregue' : 'retirado'}</span><b className="num">{brl(p.total)}</b></div>
      ))}</>}
      {escolher && <EscolherMotoboy pedido={escolher} aoFechar={() => setEscolher(null)} aoEscolher={async (id) => { const v = escolher; setEscolher(null); await agir(v.id, () => post(`/vendas/${v.id}/entregador`, { entregador_id: id })); }} />}
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

function Cardapio() {
  const [d, setD] = useState<{ produtos: Prod[]; categorias: Cat[] } | null>(null), [erro, setErro] = useState('');
  const [editar, setEditar] = useState<Prod | 'novo' | null>(null);
  const carregar = () => Promise.all([get<{ produtos: Prod[] }>('/produtos'), get<{ categorias: Cat[] }>('/categorias')]).then(([p, c]) => setD({ produtos: p.produtos.filter((x) => x.ativo), categorias: c.categorias })).catch((e) => setErro(msgErro(e)));
  useEffect(() => { carregar(); }, []);
  if (erro) return <p className="aviso erro">{erro}</p>;
  if (!d) return <div className="carregando"><div className="giro" /></div>;
  return (
    <>
      <button className="btn prim grande bloco" onClick={() => setEditar('novo')}><Ic n="mais" />Adicionar produto</button>
      {!d.produtos.length && <div className="vazio"><Ic n="produtos" t={40} /><b>Seu cardápio está vazio</b><span>Adicione os seus lanches com foto e preço. Assim que tiver o primeiro produto, a loja aparece para os clientes.</span></div>}
      {d.categorias.filter((c) => d.produtos.some((p) => p.categoria_id === c.id)).map((c) => (
        <section key={c.id}>
          <h2 className="pd-tit">{c.nome}</h2>
          <div className="pd-cardapio">{d.produtos.filter((p) => p.categoria_id === c.id).map((p) => (
            <button key={p.id} className="pd-prod" onClick={() => setEditar(p)}>
              <span className="pd-prod-txt"><b>{p.nome}</b>{p.descricao && <small>{p.descricao}</small>}<span className="num">{brl(p.preco)} · <span style={{ color: 'var(--laranja)' }}>editar</span></span></span>
              {p.foto_id ? <img className="pd-prod-foto" src={`/api/fotos/${p.foto_id}`} alt="" /> : <div className="sem-foto pd-prod-foto"><Ic n={p.categoria_icone || 'outro'} t={30} /></div>}
            </button>
          ))}</div>
        </section>
      ))}
      {editar && <EditarProduto p={editar === 'novo' ? null : editar} categorias={d.categorias} aoFechar={() => setEditar(null)} aoSalvar={() => { setEditar(null); carregar(); }} />}
    </>
  );
}

function EditarProduto({ p, categorias, aoFechar, aoSalvar }: { p: Prod | null; categorias: Cat[]; aoFechar: () => void; aoSalvar: () => void }) {
  const [f, setF] = useState({ nome: p?.nome || '', descricao: p?.descricao || '', preco: reais(p?.preco || 0), categoria: p?.categoria || categorias[0]?.nome || '' });
  const [foto, setFoto] = useState(p?.foto_id || null);
  const [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const subir = async (arq?: File) => { if (!arq) return; setOcupado(true); try { setFoto((await post<{ id: string }>('/fotos', { dados: await reduzirFoto(arq) })).id); } catch (e) { setErro(msgErro(e)); } finally { setOcupado(false); } };
  const salvar = async () => {
    const preco = lerValor(f.preco);
    if (!f.nome.trim()) return setErro('Digite o nome do produto.');
    if (Number.isNaN(preco) || preco <= 0) return setErro('Digite o preço.');
    if (!f.categoria.trim()) return setErro('Digite a categoria (ex.: Lanches, Bebidas).');
    setOcupado(true); setErro('');
    try {
      let cat = categorias.find((c) => c.nome.toLowerCase() === f.categoria.trim().toLowerCase());
      if (!cat) { const nome = f.categoria.trim(); const r = await post<{ id: string }>('/categorias', { nome, icone: iconeDe(nome), ordem: categorias.length + 1 }); cat = { id: r.id, nome, icone: iconeDe(nome) }; }
      const dados = { nome: f.nome.trim(), descricao: f.descricao.trim() || null, codigo: p?.codigo || null, categoria_id: cat.id, preco, custo: p?.custo || 0, foto_id: foto, ativo: true, opcoes: p?.opcoes || {}, receita: p?.receita || [] };
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
      {erro && <p className="aviso erro">{erro}</p>}
    </Modal>
  );
}

// ---------- minha loja ----------
function MinhaLoja({ e, recarregar, aoSair }: { e: Empresa; recarregar: () => void; aoSair: () => void }) {
  const [cfg, setCfg] = useState<Record<string, any> | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [f, setF] = useState({ nome: e.nome, telefone: e.telefone || '', endereco: e.endereco || '', cidade: e.cidade || '', uf: e.uf || '', taxa: reais(e.taxa_entrega_padrao), tempo: '', minimo: '' });
  const [msg, setMsg] = useState(''), [ocupado, setOcupado] = useState(false);
  useEffect(() => { get<{ loja: Record<string, any> }>('/loja-app').then((r) => { setCfg(r.loja); setF((x) => ({ ...x, tempo: r.loja.tempo_entrega || '', minimo: reais(r.loja.pedido_minimo || 0) })); }).catch(() => {}); }, []); // eslint-disable-line @typescript-eslint/no-explicit-any
  const link = `${location.origin}/pedir/${e.slug || ''}`;
  const subirLogo = async (arq?: File) => {
    if (!arq || !cfg) return;
    try { const r = await post<{ id: string }>('/fotos', { dados: await reduzirFoto(arq) }); setCfg({ ...cfg, logo_id: r.id }); setMsg('Logo escolhido. Toque em Salvar.'); } catch (x) { setMsg(msgErro(x)); }
  };
  const marcarLocal = () => navigator.geolocation?.getCurrentPosition((p) => { if (cfg) { setCfg({ ...cfg, lat: Math.round(p.coords.latitude * 1e5) / 1e5, lng: Math.round(p.coords.longitude * 1e5) / 1e5 }); setMsg('Localização marcada. Toque em Salvar.'); } }, () => setMsg('Permita a localização e tente de novo, de dentro da loja.'));
  const salvar = async () => {
    if (!cfg) return;
    const taxa = f.taxa.trim() ? lerValor(f.taxa) : 0, minimo = f.minimo.trim() ? lerValor(f.minimo) : 0;
    if (Number.isNaN(taxa) || Number.isNaN(minimo)) return setMsg('Confira os valores.');
    setOcupado(true); setMsg('');
    try {
      await put('/empresa', { nome: f.nome, cnpj: e.cnpj, telefone: f.telefone, endereco: f.endereco, cidade: f.cidade, uf: f.uf, mensagem_cupom: e.mensagem_cupom, formas_pagamento: e.formas_pagamento, desconto_max_caixa: e.desconto_max_caixa, largura_cupom: e.largura_cupom, taxa_entrega_padrao: taxa });
      await put('/loja-app', { slug: cfg.slug, no_app: true, aceitando: Boolean(cfg.aceitando), faz_entrega: Boolean(cfg.faz_entrega), faz_retirada: Boolean(cfg.faz_retirada), tipo_loja: cfg.tipo_loja, descricao: cfg.descricao,
        logo_id: cfg.logo_id, capa_id: cfg.capa_id, tempo_entrega: f.tempo.trim() || null, pedido_minimo: minimo, lat: cfg.lat ?? null, lng: cfg.lng ?? null, raio_km: cfg.raio_km || 8 });
      setMsg('Salvo!'); recarregar();
    } catch (x) { setMsg(msgErro(x)); } finally { setOcupado(false); }
  };
  const copiar = async () => { try { await navigator.clipboard.writeText(link); setMsg('Link copiado.'); } catch { setMsg(link); } };
  return (
    <>
      <section className="cartao">
        <h2 className="cartao-tit">Divulgue a sua loja</h2>
        <p style={{ margin: '0 0 8px', wordBreak: 'break-all' }}><b>{link}</b></p>
        <div className="dupla">
          <button className="btn" onClick={copiar}>Copiar link</button>
          <a className="btn prim" href={`https://wa.me/?text=${encodeURIComponent(`Agora você pede na ${e.nome} pelo Pedêê! 🍔\nToque no link, instale e faça o seu pedido:\n${link}`)}`} target="_blank" rel="noopener"><Ic n="whatsapp" />Mandar no WhatsApp</a>
        </div>
        {e.acesso_ate && <p style={{ color: 'var(--suave)', fontSize: 14, marginBottom: 0 }}>Grátis até {new Date(e.acesso_ate).toLocaleDateString('pt-BR')}. Depois, R$ 29,90 por mês, sem comissão.</p>}
      </section>
      <section className="cartao">
        <h2 className="cartao-tit">Dados da loja</h2>
        <div className="campos">
          <label className="campo largo">Nome da loja<input value={f.nome} onChange={(x) => setF({ ...f, nome: x.target.value })} maxLength={60} /></label>
          <label className="campo">WhatsApp da loja<input value={f.telefone} onChange={(x) => setF({ ...f, telefone: x.target.value })} inputMode="tel" /></label>
          <label className="campo">Taxa de entrega (R$)<input value={f.taxa} onChange={(x) => setF({ ...f, taxa: x.target.value })} inputMode="decimal" placeholder="0,00 = grátis" /></label>
          <label className="campo">Tempo de entrega<input value={f.tempo} onChange={(x) => setF({ ...f, tempo: x.target.value.slice(0, 20) })} placeholder="Ex.: 30-45 min" /></label>
          <label className="campo">Pedido mínimo (R$)<input value={f.minimo} onChange={(x) => setF({ ...f, minimo: x.target.value })} inputMode="decimal" placeholder="0,00" /></label>
          <label className="campo largo">Endereço<input value={f.endereco} onChange={(x) => setF({ ...f, endereco: x.target.value })} maxLength={150} /></label>
          <label className="campo">Cidade<input value={f.cidade} onChange={(x) => setF({ ...f, cidade: x.target.value })} maxLength={60} list="cidades-rj" /><datalist id="cidades-rj">{CIDADES_RJ.map((c) => <option key={c} value={c} />)}</datalist></label>
          <label className="campo">UF<input value={f.uf} onChange={(x) => setF({ ...f, uf: x.target.value.toUpperCase().slice(0, 2) })} maxLength={2} /></label>
        </div>
        <div className="lista-config" style={{ marginTop: 10 }}>
          <div><span>Logo da loja</span>{cfg?.logo_id && <img src={`/api/fotos/${cfg.logo_id}`} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />}<label className="btn peq"><Ic n="foto" t={16} />{cfg?.logo_id ? 'Trocar' : 'Colocar'}<input type="file" accept="image/*" hidden onChange={(x) => subirLogo(x.target.files?.[0])} /></label></div>
          <div><span>Localização (clientes perto veem a loja)<small style={{ display: 'block', color: 'var(--suave)', fontWeight: 500 }}>{cfg?.lat != null ? 'Marcada' : 'Faça de dentro da loja'}</small></span><button className="btn peq" onClick={marcarLocal}><Ic n="inicio" t={16} />Marcar aqui</button></div>
        </div>
        {msg && <p className="aviso" style={{ marginBottom: 0 }}>{msg}</p>}
        <button className="btn prim grande bloco" style={{ marginTop: 12 }} onClick={salvar} disabled={ocupado || !cfg}>{ocupado ? 'Salvando…' : 'Salvar'}</button>
      </section>
      <a className="btn bloco" href="/" target="_blank" rel="noopener"><Ic n="caixa" />Painel completo (caixa, estoque)</a>
      <button className="btn bloco" onClick={async () => { await post('/auth/sair').catch(() => {}); aoSair(); }}><Ic n="sair" />Sair</button>
    </>
  );
}

// ---------- motoboys da loja ----------
interface Moto { id: string; nome: string; email: string; veiculo: string; disponivel: boolean; em_rota: number }
const VEICULO: Record<string, string> = { moto: '🛵', bike: '🚲' };

function EscolherMotoboy({ pedido, aoFechar, aoEscolher }: { pedido: { numero: number; entregador_id: string | null }; aoFechar: () => void; aoEscolher: (id: string | null) => void }) {
  const [lista, setLista] = useState<Moto[] | null>(null);
  useEffect(() => { get<{ entregadores: Moto[] }>('/entregadores').then((r) => setLista(r.entregadores)).catch(() => setLista([])); }, []);
  return (
    <Modal titulo={`Quem leva o pedido #${pedido.numero}?`} aoFechar={aoFechar}>
      {!lista ? <div className="carregando"><div className="giro" /></div> : !lista.length ? <p style={{ margin: 0 }}>Você ainda não tem motoboys. Abra a aba <b>Motoboys</b> e cadastre pelo e-mail deles (eles precisam ter o app <b>Pedêê Entregador</b>).</p> : (
        <div className="lista-config">{lista.map((m) => (
          <div key={m.id}><span>{VEICULO[m.veiculo] || '🛵'} {m.nome}<small style={{ display: 'block', color: m.disponivel ? 'var(--verde)' : 'var(--suave)', fontWeight: 600 }}>{m.disponivel ? 'Disponível' : 'Indisponível'}{m.em_rota ? ` · ${m.em_rota} entrega(s) com ele` : ''}</small></span>
            <button className={`btn peq ${pedido.entregador_id === m.id ? '' : 'prim'}`} onClick={() => aoEscolher(m.id)}>{pedido.entregador_id === m.id ? 'Escolhido' : 'Escolher'}</button></div>
        ))}</div>
      )}
      {pedido.entregador_id && <button className="btn bloco" style={{ marginTop: 12 }} onClick={() => aoEscolher(null)}>Tirar o motoboy deste pedido</button>}
    </Modal>
  );
}

function Motoboys() {
  const [lista, setLista] = useState<Moto[] | null>(null), [email, setEmail] = useState(''), [msg, setMsg] = useState(''), [ocupado, setOcupado] = useState(false);
  const carregar = () => get<{ entregadores: Moto[] }>('/entregadores').then((r) => setLista(r.entregadores)).catch((e) => setMsg(msgErro(e)));
  useEffect(() => { carregar(); const t = setInterval(carregar, 20000); return () => clearInterval(t); }, []);
  const adicionar = async () => {
    setOcupado(true); setMsg('');
    try { const r = await post<{ nome: string }>('/entregadores', { email }); setMsg(`${r.nome} agora é motoboy da sua loja.`); setEmail(''); carregar(); } catch (e) { setMsg(msgErro(e)); } finally { setOcupado(false); }
  };
  const tirar = async (m: Moto) => { if (!confirm(`Tirar ${m.nome} dos motoboys da loja?`)) return; await del(`/entregadores/${m.id}`).catch(() => {}); carregar(); };
  return (
    <>
      <section className="cartao">
        <h2 className="cartao-tit">Seus motoboys</h2>
        <p style={{ margin: '0 0 10px', color: 'var(--suave)', fontSize: 14 }}>O motoboy baixa o app <b>Pedêê Entregador</b> e se cadastra. Depois você coloca o e-mail dele aqui. Quando o pedido ficar pronto, você escolhe quem leva e a entrega aparece no app dele, com aviso.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8 }}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" placeholder="E-mail do motoboy" aria-label="E-mail do motoboy" />
          <button className="btn prim" onClick={adicionar} disabled={ocupado || !email.includes('@')}><Ic n="mais" />Adicionar</button>
        </div>
        {msg && <p className="aviso" style={{ marginBottom: 0 }}>{msg}</p>}
      </section>
      {!lista ? <div className="carregando"><div className="giro" /></div> : !lista.length ? <div className="vazio"><span style={{ fontSize: 40 }}>🛵</span><b>Nenhum motoboy ainda</b><span>Adicione pelo e-mail acima.</span></div> : (
        <section className="cartao"><div className="lista-config">{lista.map((m) => (
          <div key={m.id}><span>{VEICULO[m.veiculo] || '🛵'} {m.nome}<small style={{ display: 'block', color: m.disponivel ? 'var(--verde)' : 'var(--suave)', fontWeight: 600 }}>{m.disponivel ? 'Disponível' : 'Indisponível'}{m.em_rota ? ` · ${m.em_rota} entrega(s) agora` : ''}</small></span>
            <button className="btn-ic vermelho" onClick={() => tirar(m)} aria-label={`Tirar ${m.nome}`}><Ic n="lixeira" /></button></div>
        ))}</div></section>
      )}
    </>
  );
}
