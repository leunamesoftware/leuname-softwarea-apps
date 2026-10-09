// Clientes: cadastro rápido, histórico de compras e contato pelo WhatsApp.
import { useState } from 'react';
import { brl } from '../../regras/pedido';
import { dataCurta, get, post, put } from '../api';
import { Carregando, Falha, Modal, msgErro, useAviso, useDados, Vazio } from '../comuns';
import { Ic } from '../icones';
import { Cabeca } from '../Layout';

export interface Cliente { id: string; nome: string; telefone: string | null; cpf: string | null; endereco: string | null; observacao: string | null; pedidos: number; gasto: number; ultimo_pedido: string | null }
export const linkWhatsApp = (tel: string | null | undefined, texto = '') => {
  const n = (tel || '').replace(/\D/g, '');
  if (n.length < 10) return null;
  return `https://wa.me/${n.length <= 11 ? '55' + n : n}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
};

export function Clientes() {
  const d = useDados(() => get<{ clientes: Cliente[] }>('/clientes'));
  const [busca, setBusca] = useState('');
  const [editar, setEditar] = useState<Cliente | 'novo' | null>(null);
  if (d.carregando && !d.dados) return <Carregando />;
  if (d.erro && !d.dados) return <Falha erro={d.erro} tentar={d.recarregar} />;
  const todos = d.dados!.clientes;
  const q = busca.trim().toLowerCase(), qn = q.replace(/\D/g, '');
  const lista = todos.filter((c) => !q || c.nome.toLowerCase().includes(q) || (qn && (c.telefone || '').replace(/\D/g, '').includes(qn)));
  return (
    <>
      <Cabeca titulo="Clientes" sub="Cadastre clientes para identificar pedidos e mandar o comprovante.">
        <button className="btn prim" onClick={() => setEditar('novo')}><Ic n="mais" />Novo cliente</button>
      </Cabeca>
      <div className="busca-barra" style={{ marginBottom: 14 }}>
        <span className="entrada"><Ic n="busca" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome ou telefone…" aria-label="Buscar cliente" /></span>
      </div>
      {!lista.length ? <div className="cartao">{todos.length ? <Vazio icone="busca" titulo="Nenhum cliente encontrado" /> : <Vazio icone="clientes" titulo="Nenhum cliente cadastrado" texto="Cadastre aqui ou direto na hora de receber o pagamento." />}</div> : <>
        <div className="cartao tabela-cartao so-pc"><div className="tabela"><table>
          <thead><tr><th>Nome</th><th>Telefone</th><th className="cen">Pedidos</th><th className="dir">Total gasto</th><th>Último pedido</th><th className="dir">Ações</th></tr></thead>
          <tbody>{lista.map((c) => { const wa = linkWhatsApp(c.telefone); return (
            <tr key={c.id}>
              <td><b>{c.nome}</b>{c.endereco && <div style={{ color: 'var(--suave)', fontSize: 13 }}>{c.endereco}</div>}</td>
              <td className="num">{c.telefone || '—'}</td><td className="cen">{c.pedidos}</td><td className="dir num">{brl(c.gasto)}</td>
              <td>{c.ultimo_pedido ? dataCurta(c.ultimo_pedido) : '—'}</td>
              <td className="dir" style={{ whiteSpace: 'nowrap' }}>
                {wa && <a className="btn-ic" href={wa} target="_blank" rel="noopener" aria-label={`WhatsApp de ${c.nome}`}><Ic n="whatsapp" /></a>}
                <button className="btn-ic" onClick={() => setEditar(c)} aria-label={`Editar ${c.nome}`}><Ic n="lapis" /></button>
              </td>
            </tr>
          ); })}</tbody>
        </table></div></div>
        <div className="lista-movel so-movel">{lista.map((c) => (
          <button key={c.id} className="item-movel" onClick={() => setEditar(c)}>
            <span className="bola">{(c.nome.trim()[0] || '?').toUpperCase()}</span>
            <span className="meio"><b>{c.nome}</b><small>{c.telefone || 'Sem telefone'}</small></span>
            <span className="fim"><b className="num">{brl(c.gasto)}</b><small>{c.pedidos} {c.pedidos === 1 ? 'pedido' : 'pedidos'}</small></span>
            <Ic n="direita" />
          </button>
        ))}</div>
      </>}
      {editar && <FormCliente cliente={editar === 'novo' ? null : editar} aoFechar={() => setEditar(null)} aoSalvar={() => { setEditar(null); d.recarregar(); }} />}
    </>
  );
}

export function FormCliente({ cliente, aoFechar, aoSalvar }: { cliente: Cliente | null; aoFechar: () => void; aoSalvar: (id: string, endereco?: string | null) => void }) {
  const aviso = useAviso();
  const c = cliente;
  const [f, setF] = useState({ nome: c?.nome || '', telefone: c?.telefone || '', cpf: c?.cpf || '', endereco: c?.endereco || '', observacao: c?.observacao || '' });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setErros({ ...erros, [k]: '' }); };
  const salvar = async () => {
    if (!f.nome.trim()) return setErros({ nome: 'Digite o nome do cliente.' });
    const tel = f.telefone.replace(/\D/g, '');
    if (tel && (tel.length < 10 || tel.length > 13)) return setErros({ telefone: 'Telefone com DDD (ex.: 11 98765-4321).' });
    setOcupado(true);
    const n = (x: string) => x.trim() || null;
    const dados = { nome: f.nome.trim(), telefone: n(f.telefone), cpf: n(f.cpf), endereco: n(f.endereco), observacao: n(f.observacao) };
    try {
      let id = c?.id || '';
      if (c) await put(`/clientes/${c.id}`, dados); else id = (await post<{ id: string }>('/clientes', dados)).id;
      aviso(c ? 'Cliente salvo.' : 'Cliente cadastrado.'); aoSalvar(id, dados.endereco);
    } catch (err: any) { setErros(err?.campos || {}); aviso(msgErro(err), 'erro'); } finally { setOcupado(false); } // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  const wa = linkWhatsApp(f.telefone);
  return (
    <Modal titulo={c ? 'Editar cliente' : 'Novo cliente'} aoFechar={aoFechar} pe={<>
      {c && wa && <a className="btn" href={wa} target="_blank" rel="noopener" style={{ marginRight: 'auto' }}><Ic n="whatsapp" />WhatsApp</a>}
      <button className="btn" onClick={aoFechar}>Voltar</button><button className="btn prim" onClick={salvar} disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar'}</button>
    </>}>
      {c && <p style={{ margin: '0 0 12px', color: 'var(--suave)' }}>{c.pedidos} {c.pedidos === 1 ? 'pedido' : 'pedidos'} · {brl(c.gasto)} no total{c.ultimo_pedido ? ` · último em ${dataCurta(c.ultimo_pedido)}` : ''}</p>}
      <div className="campos">
        <label className="campo largo">Nome<input value={f.nome} onChange={muda('nome')} maxLength={80} aria-invalid={Boolean(erros.nome)} />{erros.nome && <small className="erro">{erros.nome}</small>}</label>
        <label className="campo">Telefone / WhatsApp<input value={f.telefone} onChange={muda('telefone')} maxLength={20} inputMode="tel" placeholder="(11) 98765-4321" aria-invalid={Boolean(erros.telefone)} />{erros.telefone && <small className="erro">{erros.telefone}</small>}</label>
        <label className="campo">CPF (opcional)<input value={f.cpf} onChange={muda('cpf')} maxLength={14} inputMode="numeric" /></label>
        <label className="campo largo">Endereço (opcional)<input value={f.endereco} onChange={muda('endereco')} maxLength={150} placeholder="Rua, número, bairro" /></label>
        <label className="campo largo">Observação (opcional)<input value={f.observacao} onChange={muda('observacao')} maxLength={200} placeholder="Ex.: sem cebola sempre" /></label>
      </div>
    </Modal>
  );
}
