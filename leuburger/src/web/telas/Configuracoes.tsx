// Configurações: dados da lanchonete, usuários e permissões, pagamento, impressão e cópia de segurança.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FORMAS, lerValor, type Forma } from '../../regras/pedido';
import { PAPEIS, type Papel } from '../../regras/permissoes';
import { dataCurta, dataHora, get, post, put } from '../api';
import { Carregando, Falha, Modal, msgErro, useAviso, useDados, Vazio } from '../comuns';
import { Ic } from '../icones';
import { Cabeca } from '../Layout';
import { useSessao, type Empresa } from '../sessao';

type Aba = 'empresa' | 'usuarios' | 'pagamento' | 'impressao' | 'backup';
const ABAS: [Aba, string, string][] = [['empresa', 'Dados da empresa', 'loja'], ['usuarios', 'Usuários e permissões', 'usuario'], ['pagamento', 'Pagamento e caixa', 'cartao'], ['impressao', 'Impressão', 'impressora'], ['backup', 'Backup', 'backup']];
const lerLocal = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarLocal = (k: string, v: string | null) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };

/** Salva a lanchonete mandando todos os campos (o servidor exige o conjunto completo). */
function useSalvarEmpresa() {
  const { eu, recarregar } = useSessao();
  const aviso = useAviso();
  return async (mudancas: Partial<Empresa>) => {
    const e = { ...eu!.empresa, ...mudancas };
    await put('/empresa', { nome: e.nome, cnpj: e.cnpj, telefone: e.telefone, endereco: e.endereco, cidade: e.cidade, uf: e.uf, mensagem_cupom: e.mensagem_cupom, formas_pagamento: e.formas_pagamento, desconto_max_caixa: e.desconto_max_caixa, largura_cupom: e.largura_cupom, taxa_entrega_padrao: e.taxa_entrega_padrao || 0 });
    await recarregar(); aviso('Configurações salvas.');
  };
}

export function Configuracoes() {
  const [aba, setAba] = useState<Aba>('empresa');
  return (
    <>
      <Cabeca titulo="Configurações" sub="Ajuste o LeuBurger do jeito do seu negócio." />
      <div className="abas" role="tablist">{ABAS.map(([v, n, ic]) => <button key={v} role="tab" aria-selected={aba === v} className={`aba ${aba === v ? 'sel' : ''}`} onClick={() => setAba(v)}><Ic n={ic} />{n}</button>)}</div>
      {aba === 'empresa' && <DadosEmpresa />}
      {aba === 'usuarios' && <Usuarios />}
      {aba === 'pagamento' && <PagamentoCaixa />}
      {aba === 'impressao' && <Impressao />}
      {aba === 'backup' && <Backup />}
    </>
  );
}

function DadosEmpresa() {
  const { eu } = useSessao();
  const salvarEmpresa = useSalvarEmpresa();
  const e = eu!.empresa;
  const [f, setF] = useState({ nome: e.nome, cnpj: e.cnpj || '', telefone: e.telefone || '', endereco: e.endereco || '', cidade: e.cidade || '', uf: e.uf || '', mensagem_cupom: e.mensagem_cupom || '' });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const muda = (k: keyof typeof f) => (x: { target: { value: string } }) => { setF({ ...f, [k]: x.target.value }); setErros({ ...erros, [k]: '' }); };
  const salvar = async () => {
    if (f.nome.trim().length < 2) return setErros({ nome: 'Digite o nome da lanchonete.' });
    setOcupado(true);
    try { await salvarEmpresa({ ...f, uf: f.uf.trim().toUpperCase().slice(0, 2) }); } catch (err: any) { setErros(err?.campos || { nome: msgErro(err) }); } finally { setOcupado(false); } // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  return (
    <div className="inicio-meio">
      <section className="cartao"><h2 className="cartao-tit">Dados da empresa</h2>
        <p style={{ marginTop: 0, color: 'var(--suave)' }}>Aparecem no comprovante e na mensagem do WhatsApp.</p>
        <div className="campos">
          <label className="campo largo">Nome da lanchonete<input value={f.nome} onChange={muda('nome')} maxLength={60} aria-invalid={Boolean(erros.nome)} />{erros.nome && <small className="erro">{erros.nome}</small>}</label>
          <label className="campo">CNPJ (opcional)<input value={f.cnpj} onChange={muda('cnpj')} maxLength={20} inputMode="numeric" /></label>
          <label className="campo">Telefone<input value={f.telefone} onChange={muda('telefone')} maxLength={20} inputMode="tel" /></label>
          <label className="campo largo">Endereço<input value={f.endereco} onChange={muda('endereco')} maxLength={150} placeholder="Rua, número, bairro" /></label>
          <label className="campo">Cidade<input value={f.cidade} onChange={muda('cidade')} maxLength={60} /></label>
          <label className="campo">UF<input value={f.uf} onChange={muda('uf')} maxLength={2} style={{ textTransform: 'uppercase' }} /></label>
          <label className="campo largo">Mensagem no fim do comprovante<input value={f.mensagem_cupom} onChange={muda('mensagem_cupom')} maxLength={120} placeholder="Obrigado pela preferência!" /></label>
        </div>
        <button className="btn prim" style={{ marginTop: 16 }} onClick={salvar} disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar'}</button>
      </section>
      <section className="cartao"><h2 className="cartao-tit">Sua conta</h2>
        <div className="lista-config">
          <div><span>Conta LeuApps</span><b>{eu!.usuario.dono ? eu!.usuario.login : 'do dono da lanchonete'}</b></div>
          <div><span>Acesso</span><b>{!e.acesso_ate ? 'Vitalício' : e.acesso_ate > '2090' ? 'Vitalício' : `até ${dataCurta(e.acesso_ate)}`}</b></div>
          <div><span>Cardápio e categorias</span><Link className="btn peq" to="/produtos?categorias=1">Abrir</Link></div>
        </div>
        <p style={{ color: 'var(--suave)', fontSize: 14 }}>Para renovar ou mudar o plano, use a loja <a className="link" href="https://www.leunamesoftware.com.br" target="_blank" rel="noopener">LeuApps</a> com o mesmo e-mail.</p>
      </section>
    </div>
  );
}

interface Usuario { id: string; nome: string; login: string; papel: Papel; dono: number; ativo: number; criado_em: string }
function Usuarios() {
  const d = useDados(() => get<{ usuarios: Usuario[] }>('/usuarios'));
  const [editar, setEditar] = useState<Usuario | 'novo' | null>(null);
  const [auditoria, setAuditoria] = useState(false);
  if (d.carregando && !d.dados) return <Carregando />;
  if (d.erro && !d.dados) return <Falha erro={d.erro} tentar={d.recarregar} />;
  return (
    <>
      <div className="inicio-meio">
        <section className="cartao"><h2 className="cartao-tit">Usuários <button className="btn peq prim" onClick={() => setEditar('novo')}><Ic n="mais" t={16} />Novo usuário</button></h2>
          <div className="lista-movel" style={{ display: 'grid' }}>{d.dados!.usuarios.map((u) => (
            <button key={u.id} className="item-movel" onClick={() => setEditar(u)}>
              <span className="bola">{(u.nome.trim()[0] || '?').toUpperCase()}</span>
              <span className="meio"><b>{u.nome}</b><small>{u.login}{u.dono ? ' · dono' : ''}</small></span>
              <span className="fim"><span className={`selo ${u.ativo ? 'ok' : ''}`}>{u.ativo ? PAPEIS[u.papel].nome : 'Desativado'}</span></span>
              <Ic n="direita" />
            </button>
          ))}</div>
        </section>
        <section className="cartao"><h2 className="cartao-tit">O que cada um pode fazer</h2>
          <div className="lista-config">{(Object.keys(PAPEIS) as Papel[]).map((p) => <div key={p}><span>{PAPEIS[p].nome}<small style={{ display: 'block', color: 'var(--suave)', fontWeight: 500 }}>{PAPEIS[p].resumo}</small></span></div>)}</div>
          <p style={{ color: 'var(--suave)', fontSize: 14 }}>Cada funcionário entra com o próprio login e senha. Tudo o que é importante (cancelamentos, caixa, mudanças) fica registrado com o nome de quem fez.</p>
          <button className="btn" onClick={() => setAuditoria(true)}><Ic n="pedidos" />Ver registro de atividades</button>
        </section>
      </div>
      {editar && <FormUsuario usuario={editar === 'novo' ? null : editar} aoFechar={() => setEditar(null)} aoSalvar={() => { setEditar(null); d.recarregar(); }} />}
      {auditoria && <Auditoria aoFechar={() => setAuditoria(false)} />}
    </>
  );
}

function FormUsuario({ usuario, aoFechar, aoSalvar }: { usuario: Usuario | null; aoFechar: () => void; aoSalvar: () => void }) {
  const aviso = useAviso();
  const u = usuario;
  const [f, setF] = useState({ nome: u?.nome || '', login: u?.login || '', senha: '', papel: (u?.papel || 'caixa') as Papel, ativo: u ? Boolean(u.ativo) : true });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const muda = (k: 'nome' | 'login' | 'senha' | 'papel') => (x: { target: { value: string } }) => { setF({ ...f, [k]: x.target.value }); setErros({ ...erros, [k]: '' }); };
  const salvar = async () => {
    const e: Record<string, string> = {};
    if (f.nome.trim().length < 2) e.nome = 'Digite o nome.';
    if (!u && !/^[a-z0-9._@-]{3,80}$/.test(f.login.trim().toLowerCase())) e.login = 'Use pelo menos 3 letras, sem espaço.';
    if ((!u || f.senha) && f.senha.length < 6) e.senha = 'A senha precisa ter pelo menos 6 caracteres.';
    if (Object.keys(e).length) return setErros(e);
    setOcupado(true);
    try {
      if (u) await put(`/usuarios/${u.id}`, { nome: f.nome.trim(), papel: f.papel, ativo: f.ativo, senha: f.senha });
      else await post('/usuarios', { nome: f.nome.trim(), login: f.login.trim().toLowerCase(), senha: f.senha, papel: f.papel });
      aviso(u ? 'Usuário salvo.' : 'Usuário criado. Passe o login e a senha para ele.'); aoSalvar();
    } catch (err: any) { setErros(err?.campos || {}); aviso(msgErro(err), 'erro'); } finally { setOcupado(false); } // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  const dono = Boolean(u?.dono);
  return (
    <Modal titulo={u ? 'Editar usuário' : 'Novo usuário'} aoFechar={aoFechar} pe={<><button className="btn" onClick={aoFechar}>Voltar</button><button className="btn prim" onClick={salvar} disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar'}</button></>}>
      {dono && <div className="aviso" style={{ marginBottom: 12 }}>Este é o dono da conta: é sempre administrador e entra com a senha da conta LeuApps.</div>}
      <div className="campos">
        <label className="campo largo">Nome<input value={f.nome} onChange={muda('nome')} maxLength={60} aria-invalid={Boolean(erros.nome)} />{erros.nome && <small className="erro">{erros.nome}</small>}</label>
        <label className="campo">Login (para entrar)<input value={f.login} onChange={muda('login')} maxLength={80} disabled={Boolean(u)} autoCapitalize="none" autoComplete="off" placeholder="ex.: maria.caixa" aria-invalid={Boolean(erros.login)} />{erros.login && <small className="erro">{erros.login}</small>}</label>
        <label className="campo">Função<select value={f.papel} onChange={muda('papel')} disabled={dono}>{(Object.keys(PAPEIS) as Papel[]).map((p) => <option key={p} value={p}>{PAPEIS[p].nome}</option>)}</select></label>
        {!dono && <label className="campo">{u ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
          <span className="entrada"><input type={verSenha ? 'text' : 'password'} value={f.senha} onChange={muda('senha')} maxLength={100} autoComplete="new-password" aria-invalid={Boolean(erros.senha)} /><button type="button" className="depois btn-ic" onClick={() => setVerSenha(!verSenha)} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}><Ic n={verSenha ? 'olhoFechado' : 'olho'} /></button></span>
          {erros.senha && <small className="erro">{erros.senha}</small>}</label>}
        {u && !dono && <label className="campo">Situação<select value={f.ativo ? '1' : '0'} onChange={(x) => setF({ ...f, ativo: x.target.value === '1' })}><option value="1">Ativo</option><option value="0">Desativado (não entra mais)</option></select></label>}
      </div>
      <p style={{ color: 'var(--suave)', fontSize: 13.5, marginBottom: 0 }}>{PAPEIS[f.papel].nome}: {PAPEIS[f.papel].resumo}.</p>
    </Modal>
  );
}

const NOME_ACAO: Record<string, string> = { venda_cancelada: 'Cancelou venda', caixa_aberto: 'Abriu o caixa', caixa_fechado: 'Fechou o caixa', sangria: 'Sangria', suprimento: 'Suprimento', configuracoes: 'Mudou configurações', usuario_criado: 'Criou usuário', usuario_alterado: 'Alterou usuário', cardapio_exemplo: 'Criou cardápio de exemplo', produto_criado: 'Cadastrou produto', produto_alterado: 'Alterou produto' };
function Auditoria({ aoFechar }: { aoFechar: () => void }) {
  const d = useDados(() => get<{ registros: { acao: string; detalhe: string | null; criado_em: string; usuario: string | null }[] }>('/auditoria'));
  return (
    <Modal titulo="Registro de atividades" aoFechar={aoFechar} largo>
      {d.carregando && !d.dados ? <Carregando /> : d.erro ? <Falha erro={d.erro} tentar={d.recarregar} /> : !d.dados!.registros.length ? <Vazio titulo="Nada registrado ainda" /> : (
        <div className="tabela"><table><thead><tr><th>Quando</th><th>Quem</th><th>O quê</th></tr></thead>
          <tbody>{d.dados!.registros.map((r, i) => <tr key={i}><td style={{ whiteSpace: 'nowrap' }}>{dataHora(r.criado_em)}</td><td>{r.usuario || '—'}</td><td>{NOME_ACAO[r.acao] || r.acao.replace(/_/g, ' ')}{motivoDe(r.detalhe)}</td></tr>)}</tbody>
        </table></div>
      )}
    </Modal>
  );
}
const motivoDe = (detalhe: string | null) => { try { const d = JSON.parse(detalhe || '{}'); return d.motivo ? ` — ${d.motivo}` : ''; } catch { return ''; } };

function PagamentoCaixa() {
  const { eu } = useSessao();
  const salvarEmpresa = useSalvarEmpresa();
  const aviso = useAviso();
  const e = eu!.empresa;
  const [formas, setFormas] = useState<Forma[]>(e.formas_pagamento as Forma[]);
  const [desc, setDesc] = useState(String(e.desconto_max_caixa));
  const [taxa, setTaxa] = useState(e.taxa_entrega_padrao ? (e.taxa_entrega_padrao / 100).toFixed(2).replace('.', ',') : '');
  const [ocupado, setOcupado] = useState(false);
  const salvar = async () => {
    const n = Number(desc);
    if (!formas.length) return aviso('Deixe pelo menos uma forma de pagamento ligada.', 'erro');
    if (!Number.isInteger(n) || n < 0 || n > 100) return aviso('Desconto máximo: de 0 a 100%.', 'erro');
    const t = taxa.trim() ? lerValor(taxa) : 0;
    if (Number.isNaN(t) || t < 0 || t > 100000) return aviso('Taxa de entrega inválida.', 'erro');
    setOcupado(true);
    try { await salvarEmpresa({ formas_pagamento: (Object.keys(FORMAS) as Forma[]).filter((f) => formas.includes(f)), desconto_max_caixa: n, taxa_entrega_padrao: t }); } catch (err) { aviso(msgErro(err), 'erro'); } finally { setOcupado(false); }
  };
  return (
    <div className="inicio-meio">
      <section className="cartao"><h2 className="cartao-tit">Formas de pagamento</h2>
        <div className="lista-config">{(Object.keys(FORMAS) as Forma[]).map((f) => (
          <div key={f}><span>{FORMAS[f]}</span><label className="interruptor"><input type="checkbox" checked={formas.includes(f)} onChange={(x) => setFormas(x.target.checked ? [...formas, f] : formas.filter((y) => y !== f))} aria-label={FORMAS[f]} /><span /></label></div>
        ))}</div>
      </section>
      <section className="cartao"><h2 className="cartao-tit">Descontos</h2>
        <label className="campo">Desconto máximo que o caixa pode dar (%)<input value={desc} onChange={(x) => setDesc(x.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={3} /></label>
        <p style={{ color: 'var(--suave)', fontSize: 14 }}>Administrador e gerente podem dar qualquer desconto. Use 0 para o caixa não dar desconto.</p>
        <label className="campo" style={{ marginTop: 8 }}>Taxa de entrega padrão (R$)<input value={taxa} onChange={(x) => setTaxa(x.target.value.replace(/[^\d,.]/g, ''))} inputMode="decimal" placeholder="0,00" /></label>
        <p style={{ color: 'var(--suave)', fontSize: 14 }}>Já vem preenchida quando o pedido é para entrega; dá para mudar em cada pedido.</p>
      </section>
      <div><button className="btn prim" onClick={salvar} disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar'}</button></div>
    </div>
  );
}

function Impressao() {
  const { eu } = useSessao();
  const salvarEmpresa = useSalvarEmpresa();
  const aviso = useAviso();
  const [largura, setLargura] = useState(eu!.empresa.largura_cupom);
  const [auto, setAuto] = useState(lerLocal('leuburger_auto_imprimir') === '1');
  return (
    <div className="inicio-meio">
      <section className="cartao"><h2 className="cartao-tit">Impressora de cupom</h2>
        <p style={{ marginTop: 0, color: 'var(--suave)' }}>Funciona com qualquer impressora instalada no computador ou celular (térmica USB, Bluetooth ou de rede). O comprovante não é documento fiscal.</p>
        <div className="opcoes-tamanho" style={{ marginBottom: 14 }}>
          {(['58', '80'] as const).map((l) => <button key={l} className={`opcao-t ${largura === l ? 'sel' : ''}`} onClick={async () => { setLargura(l); try { await salvarEmpresa({ largura_cupom: l }); } catch (e) { aviso(msgErro(e), 'erro'); } }}>{l} mm<small>{l === '58' ? 'bobina pequena' : 'bobina padrão'}</small></button>)}
        </div>
      </section>
      <section className="cartao"><h2 className="cartao-tit">Neste aparelho</h2>
        <div className="lista-config">
          <div><span>Imprimir sozinho ao finalizar a venda<small style={{ display: 'block', color: 'var(--suave)', fontWeight: 500 }}>Abre a impressão assim que a venda é concluída.</small></span>
            <label className="interruptor"><input type="checkbox" checked={auto} onChange={(x) => { setAuto(x.target.checked); gravarLocal('leuburger_auto_imprimir', x.target.checked ? '1' : null); aviso('Preferência salva neste aparelho.'); }} aria-label="Imprimir sozinho" /><span /></label></div>
        </div>
        <p style={{ color: 'var(--suave)', fontSize: 14 }}>Dica: no computador, deixe a impressora térmica como padrão e as margens em “Nenhuma”.</p>
      </section>
    </div>
  );
}

function Backup() {
  const aviso = useAviso();
  const [ocupado, setOcupado] = useState(false);
  const baixar = async () => {
    setOcupado(true);
    try {
      const r = await fetch('/api/backup', { credentials: 'same-origin' });
      if (!r.ok) throw new Error();
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a'); a.href = url; a.download = `leuburger-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      aviso('Cópia baixada.');
    } catch { aviso('Não deu para baixar a cópia. Tente de novo.', 'erro'); } finally { setOcupado(false); }
  };
  return (
    <section className="cartao" style={{ maxWidth: 640 }}><h2 className="cartao-tit">Cópia de segurança</h2>
      <p style={{ marginTop: 0 }}>Seus dados ficam guardados no servidor com segurança e não se perdem se o aparelho quebrar. Se quiser ter uma cópia sua (produtos, estoque, clientes, vendas e caixas), baixe aqui.</p>
      <button className="btn prim" onClick={baixar} disabled={ocupado}><Ic n="backup" />{ocupado ? 'Gerando…' : 'Baixar cópia (JSON)'}</button>
    </section>
  );
}
