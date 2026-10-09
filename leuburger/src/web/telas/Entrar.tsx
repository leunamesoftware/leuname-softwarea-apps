// Entrar: dono com a conta LeuApps; operadores com o login criado pelo dono.
import { useState, type FormEvent } from 'react';
import { post } from '../api';
import { msgErro } from '../comuns';
import { Ic } from '../icones';
import { useSessao } from '../sessao';

const LOJA = 'https://www.leunamesoftware.com.br';

export function Entrar() {
  const { recarregar, bloqueio } = useSessao();
  const [login, setLogin] = useState(() => { try { return localStorage.getItem('leuburger_login') || ''; } catch { return ''; } });
  const [senha, setSenha] = useState('');
  const [ver, setVer] = useState(false);
  const [lembrar, setLembrar] = useState(true);
  const [erro, setErro] = useState(bloqueio?.mensagem || '');
  const [semAcesso, setSemAcesso] = useState(bloqueio?.codigo === 'sem_acesso' || bloqueio?.codigo === 'teste_acabou' || bloqueio?.codigo === 'acesso_vencido');
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !senha) return setErro('Digite o e-mail (ou usuário) e a senha.');
    setEnviando(true); setErro('');
    try {
      await post('/auth/entrar', { login: login.trim(), senha });
      try { if (lembrar) localStorage.setItem('leuburger_login', login.trim()); else localStorage.removeItem('leuburger_login'); } catch { /* sem armazenamento */ }
      await recarregar();
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setErro(msgErro(e));
      setSemAcesso(e?.status === 402);
    } finally { setEnviando(false); }
  };
  const testar = async () => {
    setEnviando(true); setErro('');
    try { await post('/auth/teste'); await recarregar(); }
    catch (e) { setErro(msgErro(e)); }
    finally { setEnviando(false); }
  };

  return (
    <div className="login">
      <section className="login-foto" aria-hidden="true">
        <img src="/icone-192.png" alt="" />
        <h1>Leu<span>Burger</span> PDV</h1>
        <p>Seu negócio de lanches mais simples e lucrativo.</p>
      </section>
      <div>
        <div className="login-movel" aria-hidden="true">
          <img src="/icone-192.png" alt="" />
          <h1>Leu<span>Burger</span></h1>
          <p>Seu negócio de lanches mais simples e lucrativo.</p>
        </div>
        <div className="login-form">
          <form onSubmit={entrar} noValidate>
            <h2>Bem-vindo!</h2>
            <p className="sub">Acesse sua conta para continuar no LeuBurger PDV.</p>
            <label className="campo">E-mail ou usuário
              <span className="entrada"><Ic n="email" /><input value={login} onChange={(e) => setLogin(e.target.value)} type="text" inputMode="email" autoComplete="username" placeholder="seu@email.com" autoCapitalize="none" /></span>
            </label>
            <label className="campo">Senha
              <span className="entrada"><Ic n="cadeado" /><input value={senha} onChange={(e) => setSenha(e.target.value)} type={ver ? 'text' : 'password'} autoComplete="current-password" placeholder="Sua senha" style={{ paddingRight: 48 }} />
                <button type="button" className="btn-ic depois" onClick={() => setVer(!ver)} aria-label={ver ? 'Esconder a senha' : 'Mostrar a senha'}><Ic n={ver ? 'olhoFechado' : 'olho'} /></button></span>
            </label>
            <div className="lembrar">
              <label><input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />Lembrar de mim</label>
              <a className="link" href={`${LOJA}/loja/esqueci`}>Esqueceu a senha?</a>
            </div>
            {erro && <div className="aviso erro" role="alert">{erro}</div>}
            <button className="btn prim grande bloco" disabled={enviando}>{enviando ? 'Entrando…' : <>Entrar <Ic n="seta" /></>}</button>
            {semAcesso ? <>
              <button type="button" className="btn grande bloco" onClick={testar} disabled={enviando}>Testar 7 dias grátis</button>
              <a className="btn bloco" href={`${LOJA}/#leuburger`}>Ver planos na loja LeuApps</a>
            </> : <>
              <div className="linha-ou">ou</div>
              <a className="btn grande bloco" href={`${LOJA}/#leuburger`}><img src="/icone-32.png" alt="" width="22" height="22" style={{ borderRadius: 6 }} />Ainda não tem? Testar 7 dias grátis</a>
            </>}
            <p className="rodape-login">Dono: entre com o e-mail e a senha da sua conta LeuApps.<br />Funcionários: com o usuário criado pelo dono.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
