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
  assert.match(m.texto, /Instalar: https:\/\/gestacell\.leunamesoftware\.com\.br\/\?instalar=1/);
  assert.match(m.html, /#0B2545/);
  assert.match(m.html, /Maria/);
});

import { enviarEmailDaCompra } from '../src/email.js';

// Servidor SMTP de mentira: responde como o Gmail e guarda o que recebeu.
function gmailFalso(respostas = {}) {
  const recebido = [];
  const enc = new TextEncoder(), dec = new TextDecoder();
  let entregar;
  const fila = [];
  const empurrar = (t) => { if (entregar) { const e = entregar; entregar = null; e({ value: enc.encode(t), done: false }); } else fila.push(t); };
  const conectar = (alvo, opcoes) => {
    assert.equal(alvo.hostname, 'smtp.gmail.com'); assert.equal(alvo.port, 465); assert.equal(opcoes.secureTransport, 'on');
    setTimeout(() => empurrar('220 smtp.gmail.com pronto\r\n'), 0);
    let dados = false;
    return {
      readable: { getReader: () => ({ read: () => fila.length ? Promise.resolve({ value: enc.encode(fila.shift()), done: false }) : new Promise((r) => { entregar = r; }) }) },
      writable: { getWriter: () => ({ write: async (b) => {
        const t = dec.decode(b); recebido.push(t);
        if (dados) { dados = false; return empurrar('250 2.0.0 OK\r\n'); }
        const cmd = t.split(' ')[0].trim();
        if (cmd === 'EHLO') return empurrar('250-smtp.gmail.com\r\n250-AUTH LOGIN PLAIN\r\n250 SMTPUTF8\r\n');
        if (cmd === 'AUTH') return empurrar('334 VXNlcm5hbWU6\r\n');
        if (cmd === 'MAIL' || cmd === 'RCPT') return empurrar('250 OK\r\n');
        if (cmd === 'DATA') { dados = true; return empurrar('354 Go ahead\r\n'); }
        if (cmd === 'QUIT') return empurrar('221 tchau\r\n');
        // usuário e senha (base64)
        const n = recebido.filter((x) => !/^[A-Z]{4}/.test(x)).length;
        return empurrar(n === 1 ? '334 UGFzc3dvcmQ6\r\n' : (respostas.senha || '235 Accepted\r\n'));
      } }) },
      close: async () => {},
    };
  };
  return { conectar, recebido };
}

test('pelo Gmail: entra com a senha de app e manda o e-mail com o link', async () => {
  const g = gmailFalso();
  const r = await enviarEmailDaCompra({ GMAIL_SENHA_APP: 'abcd efgh ijkl mnop', DONO_EMAIL: 'leunamesoftware@gmail.com' }, pedido, { conectar: g.conectar, teste: true });
  assert.deepEqual(r, { ok: true, como: 'gmail' });
  const tudo = g.recebido.join('');
  assert.match(tudo, /MAIL FROM:<leunamesoftware@gmail\.com>/);
  assert.match(tudo, /RCPT TO:<cliente@exemplo\.com>/);
  assert.ok(g.recebido.includes(btoa('abcdefghijklmnop') + '\r\n'), 'senha sem espaços');
  const corpo = tudo.slice(tudo.indexOf('MIME-Version'));
  const partes = [...corpo.matchAll(/base64\r\n\r\n([A-Za-z0-9+/=\r\n]+?)\r\n--/g)].map((x) => new TextDecoder().decode(Uint8Array.from(atob(x[1].replace(/\r\n/g, '')), (c) => c.charCodeAt(0))));
  assert.match(partes[1], /construgestao\.leunamesoftware\.com\.br\/\?instalar=1/);
});

test('pelo Gmail: senha errada não derruba a compra', async () => {
  const g = gmailFalso({ senha: '535 5.7.8 Username and Password not accepted\r\n' });
  const r = await enviarEmailDaCompra({ GMAIL_SENHA_APP: 'errada', DONO_EMAIL: 'leunamesoftware@gmail.com' }, pedido, { conectar: g.conectar });
  assert.equal(r.ok, false); assert.equal(r.como, 'gmail'); assert.match(r.erro, /235_535/);
});
