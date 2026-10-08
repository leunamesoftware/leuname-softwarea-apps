// E-mail depois da compra: link para instalar o app no celular e no computador, com o passo a passo.
// Sai pelo Gmail da empresa (segredo GMAIL_SENHA_APP) ou, se um dia trocar, pelo Resend (RESEND_API_KEY + EMAIL_FROM).
// Sem nenhum dos dois, não manda: a venda fica na Área do Dono para mandar à mão.
// Nunca atrapalha a compra: qualquer erro aqui é só registrado.
// App novo à venda: acrescente o link dele em LINKS (o mesmo link de instalar usado na página de compra aprovada).
import { PLANOS } from './planos.js';
import { enviarPeloGmail } from './smtp.js';

export const LINKS = {
  gestacell: { nome: 'Gestacell', url: 'https://gestacell.leunamesoftware.com.br/?instalar=1' },
  radar: { nome: 'Radar Preventivo', url: 'https://radar.leunamesoftware.com.br/?instalar=1' },
  construgestao: { nome: 'ConstruGestão', url: 'https://construgestao.leunamesoftware.com.br/?instalar=1' },
  quantocobrar: { nome: 'Quanto Cobrar', url: 'https://quantocobrar.leunamesoftware.com.br/app/?instalar=1' },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function montarEmailCompra(pedido) {
  const P = PLANOS[pedido.plano] || {};
  const app = LINKS[P.app] || LINKS.quantocobrar;
  const nome = String(pedido.nome || '').split(' ')[0];
  const passos = (titulo, itens) => `<p style="margin:18px 0 6px"><b>${titulo}</b></p><ol style="margin:0;padding-left:20px">${itens.map((i) => `<li style="margin:4px 0">${i}</li>`).join('')}</ol>`;
  const html = `<div style="font:16px/1.5 Arial,sans-serif;color:#1A1630;max-width:520px">
  <h2 style="margin:0 0 8px">Compra aprovada, ${esc(nome)}! 🎉</h2>
  <p>O <b>${esc(app.nome)}</b> já está liberado na sua conta. Para instalar, use este link (serve para o celular e para o computador):</p>
  <p style="margin:20px 0"><a href="${app.url}" style="background:#ea580c;color:#fff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:999px;display:inline-block">Instalar o ${esc(app.nome)}</a></p>
  ${passos('No celular', ['Abra o link no <b>Chrome</b>.', 'Toque em <b>Instalar</b> e espere uns segundos.', 'Confirme em <b>Instalar</b>. O ícone aparece na tela do celular.'])}
  ${passos('No computador', ['Abra o link no <b>Chrome</b> ou no <b>Edge</b>.', 'Clique em <b>Instalar</b> e confirme.', 'O ícone aparece na área de trabalho.'])}
  ${passos('No iPhone', ['Abra o link no <b>Safari</b>.', 'Toque em <b>Compartilhar</b> e em <b>Adicionar à Tela de Início</b>.'])}
  <p style="margin-top:18px">Para entrar, use o <b>mesmo e-mail e senha</b> da sua compra. Eles também funcionam na loja LeuApps: <a href="https://www.leunamesoftware.com.br">www.leunamesoftware.com.br</a></p>
  <p style="color:#5D5A6B;font-size:14px">Dúvidas? Responda este e-mail.<br>LeuName Softwares</p></div>`;
  const texto = `Compra aprovada, ${nome}!\n\nO ${app.nome} já está liberado na sua conta. Para instalar no celular ou no computador, abra este link no Chrome e toque em Instalar:\n${app.url}\n\nNo iPhone: abra no Safari, toque em Compartilhar e em Adicionar à Tela de Início.\n\nPara entrar, use o mesmo e-mail e senha da sua compra.\n\nLeuName Softwares`;
  return { assunto: `Seu ${app.nome} está liberado: veja como instalar`, html, texto };
}

/** Manda um e-mail pelo serviço ligado (Gmail da empresa ou Resend). Devolve { ok, como, erro }. */
export async function enviarEmail(env, { para, titulo, texto, html }, conectar) {
  if (!para) return { ok: false, como: 'nenhum', erro: 'sem_email' };
  try {
    if (env.GMAIL_SENHA_APP) {
      await enviarPeloGmail(env, { para, titulo, texto, html }, conectar);
      return { ok: true, como: 'gmail' };
    }
    if (env.RESEND_API_KEY && env.EMAIL_FROM) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.EMAIL_FROM, to: [para], reply_to: env.DONO_EMAIL || undefined, subject: titulo, html, text: texto }),
      });
      return r.ok ? { ok: true, como: 'resend' } : { ok: false, como: 'resend', erro: `resend_${r.status}` };
    }
    return { ok: false, como: 'nenhum', erro: 'sem_servico' };
  } catch (e) {
    console.log('email não saiu', String(e?.message || e));
    return { ok: false, como: env.GMAIL_SENHA_APP ? 'gmail' : 'resend', erro: String(e?.message || e) };
  }
}

/** Manda o e-mail da compra. Devolve { ok, como: 'gmail' | 'resend' | 'nenhum', erro }. */
export async function enviarEmailDaCompra(env, pedido, { teste = false, conectar } = {}) {
  if (!pedido?.email) return { ok: false, como: 'nenhum', erro: 'sem_email' };
  const m = montarEmailCompra(pedido);
  return enviarEmail(env, { para: pedido.email, titulo: (teste ? 'TESTE · ' : '') + m.assunto, texto: m.texto, html: m.html }, conectar);
}

/** Aviso da trava de aparelhos: a conta entrou num celular (ou computador) novo e o anterior foi desconectado. */
export function montarAvisoAparelho(conta, tipo, quando = new Date()) {
  const nome = String(conta?.nome || '').split(' ')[0] || 'cliente';
  const data = quando.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const titulo = `Sua conta entrou em um ${tipo} novo`;
  const texto = `Olá, ${nome}.\n\nSua conta LeuApps entrou em um ${tipo} novo (${data}). O ${tipo} que estava conectado antes foi desconectado: cada conta usa 1 celular e 1 computador ao mesmo tempo.\n\nFoi você? Está tudo certo.\nNão foi você? Responda este e-mail que a gente te ajuda a proteger a conta.\n\nLeuName Softwares`;
  const html = `<div style="font:16px/1.5 Arial,sans-serif;color:#1A1630;max-width:520px">
  <h2 style="margin:0 0 8px">Sua conta entrou em um ${esc(tipo)} novo</h2>
  <p>Olá, ${esc(nome)}. Sua conta LeuApps entrou em um <b>${esc(tipo)} novo</b> (${esc(data)}).</p>
  <p>O ${esc(tipo)} que estava conectado antes foi <b>desconectado</b>: cada conta usa <b>1 celular e 1 computador</b> ao mesmo tempo.</p>
  <p><b>Foi você?</b> Está tudo certo.<br><b>Não foi você?</b> Responda este e-mail que a gente te ajuda a proteger a conta.</p>
  <p style="color:#5D5A6B;font-size:14px">LeuName Softwares</p></div>`;
  return { titulo, texto, html };
}

export async function avisarAparelhoNovo(env, conta, tipo) {
  return enviarEmail(env, { para: conta?.email, ...montarAvisoAparelho(conta, tipo) });
}

export async function avisarCompraPorEmail(env, pedido) {
  return (await enviarEmailDaCompra(env, pedido)).ok;
}

/** Vendas pagas cujo e-mail com o link ainda não saiu (o dono manda à mão pela Área do Dono). */
export async function emailsPendentes(env) {
  const { results = [] } = await env.DB.prepare("SELECT id, nome, email, plano, atualizado_em FROM pedidos WHERE status = 'pago' AND email_enviado IS NULL ORDER BY atualizado_em DESC LIMIT 200").all();
  return results.map((p) => {
    const m = montarEmailCompra(p), app = LINKS[(PLANOS[p.plano] || {}).app] || LINKS.quantocobrar;
    return { id: p.id, nome: p.nome, email: p.email, app: app.nome, link: app.url, quando: p.atualizado_em, assunto: m.assunto, texto: m.texto };
  });
}

export async function marcarEmailEnviado(env, id, como) {
  await env.DB.prepare('UPDATE pedidos SET email_enviado = ? WHERE id = ?').bind(`${como}:${new Date().toISOString()}`, String(id || '')).run();
}

/** E-mail do "Esqueci a senha": botão para criar a senha nova (vale 1 hora). */
export function montarEmailNovaSenha(conta, link) {
  const nome = String(conta?.nome || '').split(' ')[0] || 'cliente';
  const titulo = 'Crie a sua senha nova';
  const texto = `Olá, ${nome}.\n\nPara criar a sua senha nova da LeuApps, abra este link (vale por 1 hora):\n${link}\n\nNão pediu? É só ignorar: a sua senha continua a mesma.\n\nLeuName Softwares`;
  const html = `<div style="font:16px/1.5 Arial,sans-serif;color:#1A1630;max-width:520px">
  <h2 style="margin:0 0 8px">Crie a sua senha nova</h2>
  <p>Olá, ${esc(nome)}. Toque no botão para criar a senha nova da sua conta LeuApps. O link vale por <b>1 hora</b>.</p>
  <p style="margin:20px 0"><a href="${esc(link)}" style="background:#1B3FD6;color:#fff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:999px;display:inline-block">Criar senha nova</a></p>
  <p style="color:#5D5A6B;font-size:14px">Não pediu? É só ignorar: a sua senha continua a mesma.<br>LeuName Softwares</p></div>`;
  return { titulo, texto, html };
}
