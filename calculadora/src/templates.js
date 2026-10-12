// Templates de site (ZIP): licença por compra, download só depois do pagamento e trava por domínio.
// Arquivos de cada template ficam em public/_tpl/<id>/ (bloqueados para acesso direto) e a lista em templates_arquivos.js.
import { TEMPLATES } from './templates_arquivos.js';
import { montarZip } from './zip.js';
import { PLANOS } from './planos.js';

export { TEMPLATES };
const MAX_DOWNLOADS = 20;
// Endereços de teste: funcionam sem prender a licença (o cliente testa antes de ligar o domínio dele).
const TESTE = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.)|\.(local|pages\.dev|netlify\.app|vercel\.app|github\.io)$/;

export const dominioLimpo = (d) => String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/:].*$/, '').replace(/^www\./, '').slice(0, 120);

/** Depois do pagamento aprovado: guarda a licença do template (a chave é a da compra). */
export async function registrarLicencaTemplate(env, pedido, chave, template) {
  await env.DB.prepare('INSERT OR IGNORE INTO template_licencas (chave, pedido_id, template, email, criado_em) VALUES (?, ?, ?, ?, ?)')
    .bind(chave, pedido.id, template, String(pedido.email || '').toLowerCase(), new Date().toISOString()).run();
}

/** Compra estornada ou contestada no Mercado Pago: a licença do template para de valer. */
export async function revogarLicencaTemplate(env, pedidoId, motivo) {
  await env.DB.prepare('UPDATE template_licencas SET revogada = ? WHERE pedido_id = ? AND revogada IS NULL')
    .bind(`${motivo}:${new Date().toISOString()}`, pedidoId).run();
}

/** O site do cliente pergunta se pode abrir neste domínio. Prende no primeiro domínio de verdade. */
export async function conferirLicenca(env, chave, dominio) {
  const d = dominioLimpo(dominio);
  if (!d) return { ok: true };
  if (TESTE.test(d)) return { ok: true, teste: true };
  const l = await env.DB.prepare('SELECT dominio, revogada FROM template_licencas WHERE chave = ?').bind(String(chave || '').trim().toUpperCase()).first();
  if (!l) return { ok: false, motivo: 'sem_licenca' };
  if (l.revogada) return { ok: false, motivo: 'cancelada' };
  if (!l.dominio) {
    await env.DB.prepare('UPDATE template_licencas SET dominio = ?, ativado_em = ? WHERE chave = ? AND dominio IS NULL').bind(d, new Date().toISOString(), String(chave).trim().toUpperCase()).run();
    return { ok: true, registrado: d };
  }
  return l.dominio === d ? { ok: true } : { ok: false, motivo: 'outro_dominio' };
}

/** Monta o ZIP do cliente: arquivos do template + a licença dele no configuracao.js. */
export async function zipDoPedido(env, pedidoId, origem) {
  if (!/^[0-9a-f]{36}$/.test(String(pedidoId || ''))) return null;
  const l = await env.DB.prepare("SELECT t.chave, t.template, t.downloads, p.plano FROM template_licencas t JOIN pedidos p ON p.id = t.pedido_id WHERE t.pedido_id = ? AND p.status = 'pago'").bind(pedidoId).first();
  const T = l && TEMPLATES[l.template];
  if (!T) return null;
  if (l.downloads >= MAX_DOWNLOADS) return { limite: true };
  const arquivos = [];
  for (const nome of T.arquivos) {
    const r = await env.ASSETS.fetch(new Request(`${origem}/_tpl/${T.id}/${nome}`));
    if (!r.ok) throw new Error(`template ${T.id}: falta ${nome}`);
    let dados = new Uint8Array(await r.arrayBuffer());
    if (nome === 'site-completo/configuracao.js') {
      const txt = new TextDecoder().decode(dados).replace('licenca: ""', `licenca: "${l.chave}"`).replace('avisoDemonstracao: true', 'avisoDemonstracao: false');
      dados = new TextEncoder().encode(txt);
    }
    // Comprou o extra "sem crédito": o site vai sem o bloco que escreve o crédito no rodapé.
    if (nome === 'site-completo/js/site.js' && PLANOS[l.plano]?.semCredito) {
      const txt = new TextDecoder().decode(dados), i = txt.indexOf('\n/* rodapé */');
      if (i >= 0) dados = new TextEncoder().encode(txt.slice(0, i) + '\n');
    }
    arquivos.push({ nome: `${T.id}/${nome}`, dados });
  }
  await env.DB.prepare('UPDATE template_licencas SET downloads = downloads + 1 WHERE chave = ?').bind(l.chave).run();
  return { nome: `${T.id}.zip`, zip: montarZip(arquivos) };
}
