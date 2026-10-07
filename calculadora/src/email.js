// E-mail depois da compra: link para instalar o app no celular e no computador, com o passo a passo.
// Só manda se o servidor tiver RESEND_API_KEY e EMAIL_FROM (segredos na Cloudflare). Sem eles, não faz nada.
// Nunca atrapalha a compra: qualquer erro aqui é só registrado.
import { PLANOS } from './planos.js';

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

export async function avisarCompraPorEmail(env, pedido) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !pedido?.email) return false;
  try {
    const m = montarEmailCompra(pedido);
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [pedido.email], reply_to: env.DONO_EMAIL || undefined, subject: m.assunto, html: m.html, text: m.texto }),
    });
    if (!r.ok) console.log('email da compra não saiu', r.status);
    return r.ok;
  } catch (e) {
    console.log('email da compra não saiu', String(e));
    return false;
  }
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
