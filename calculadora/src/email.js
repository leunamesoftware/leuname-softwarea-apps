// E-mail depois da compra: link para instalar o app no celular e no computador, com o passo a passo.
// Sai pelo Gmail da empresa (segredo GMAIL_SENHA_APP) ou, se um dia trocar, pelo Resend (RESEND_API_KEY + EMAIL_FROM).
// Sem nenhum dos dois, não manda: a venda fica na Área do Dono para mandar à mão.
// Nunca atrapalha a compra: qualquer erro aqui é só registrado.
// App novo à venda: acrescente em LINKS o link de instalar (o mesmo da página de compra aprovada) e a cor do app.
import { PLANOS } from './planos.js';
import { enviarPeloGmail } from './smtp.js';

export const LINKS = {
  gestacell: { nome: 'Gestacell', url: 'https://gestacell.leunamesoftware.com.br/?instalar=1', cor: '#0B2545' },
  radar: { nome: 'Radar Preventivo', url: 'https://radar.leunamesoftware.com.br/?instalar=1', cor: '#1F6FEB' },
  construgestao: { nome: 'ConstruGestão', url: 'https://construgestao.leunamesoftware.com.br/?instalar=1', cor: '#EA580C' },
  quantocobrar: { nome: 'Quanto Cobrar', url: 'https://quantocobrar.leunamesoftware.com.br/app/?instalar=1', cor: '#E8590C' },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Curto de propósito (pedido do dono): o nome do app e um botão só, Instalar, na cor do app.
export function montarEmailCompra(pedido) {
  const P = PLANOS[pedido.plano] || {};
  const app = LINKS[P.app] || LINKS.quantocobrar;
  const nome = String(pedido.nome || '').split(' ')[0];
  const html = `<div style="font:16px/1.5 Arial,sans-serif;color:#1A1630;max-width:480px;text-align:center;padding:8px 0">
  <p style="margin:0 0 4px;color:#5D5A6B;font-size:14px">LeuName Softwares</p>
  <h2 style="margin:0 0 18px">${esc(nome ? nome + ', seu ' : 'Seu ')}${esc(app.nome)} está liberado</h2>
  <a href="${app.url}" style="background:${app.cor};color:#fff;text-decoration:none;font-weight:bold;font-size:18px;padding:16px 40px;border-radius:999px;display:inline-block">Instalar</a>
  <p style="margin:18px 0 0;color:#5D5A6B;font-size:14px">Entre com o mesmo e-mail e senha da compra.</p></div>`;
  const texto = `${nome ? nome + ', seu ' : 'Seu '}${app.nome} está liberado.\n\nInstalar: ${app.url}\n\nEntre com o mesmo e-mail e senha da compra.\n\nLeuName Softwares`;
  return { assunto: `Seu ${app.nome} está liberado`, html, texto };
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
