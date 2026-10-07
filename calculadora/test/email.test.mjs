import test from 'node:test';
import assert from 'node:assert/strict';
import { avisarCompraPorEmail, montarEmailCompra } from '../src/email.js';

const pedido = { email: 'cliente@exemplo.com', nome: 'Maria Souza', plano: 'construgestao_mensal' };

test('sem chave do provedor, não manda nada', async () => {
  let chamou = false; const antes = globalThis.fetch; globalThis.fetch = async () => { chamou = true; return new Response('{}'); };
  assert.equal(await avisarCompraPorEmail({}, pedido), false);
  assert.equal(chamou, false); globalThis.fetch = antes;
});

test('com chave, manda o link de instalar do app comprado', async () => {
  let corpo; const antes = globalThis.fetch;
  globalThis.fetch = async (url, o) => { corpo = JSON.parse(o.body); assert.equal(url, 'https://api.resend.com/emails'); return new Response('{}', { status: 200 }); };
  assert.equal(await avisarCompraPorEmail({ RESEND_API_KEY: 'x', EMAIL_FROM: 'LeuApps <loja@leunamesoftware.com.br>' }, pedido), true);
  assert.deepEqual(corpo.to, ['cliente@exemplo.com']);
  assert.match(corpo.html, /construgestao\.leunamesoftware\.com\.br\/\?instalar=1/);
  assert.match(corpo.subject, /ConstruGestão/);
  globalThis.fetch = antes;
});

test('erro do provedor não derruba a compra', async () => {
  const antes = globalThis.fetch; globalThis.fetch = async () => { throw new Error('fora do ar'); };
  assert.equal(await avisarCompraPorEmail({ RESEND_API_KEY: 'x', EMAIL_FROM: 'a@b.com' }, pedido), false);
  globalThis.fetch = antes;
});

test('texto tem o passo a passo e o nome', () => {
  const m = montarEmailCompra({ ...pedido, plano: 'gestacell_anual' });
  assert.match(m.texto, /Toque em Instalar|toque em Instalar/);
  assert.match(m.html, /Maria/);
});
