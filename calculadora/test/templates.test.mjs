import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { montarZip, crc32 } from '../src/zip.js';
import { conferirLicenca, zipDoPedido, dominioLimpo, registrarLicencaTemplate, revogarLicencaTemplate, TEMPLATES } from '../src/templates.js';
import { PLANOS } from '../src/planos.js';
import { montarEmailCompra } from '../src/email.js';

// Banco de mentira só com o que os templates usam.
function banco() {
  const lic = new Map(), pedidos = new Map();
  const prep = (sql) => ({
    bind: (...a) => ({
      async first() {
        if (sql.startsWith('SELECT dominio')) return lic.get(a[0]) || null;
        if (sql.startsWith('SELECT t.chave')) {
          const l = [...lic.values()].find((x) => x.pedido_id === a[0]);
          return l && pedidos.get(a[0]) === 'pago' ? l : null;
        }
        return null;
      },
      async run() {
        if (sql.startsWith('INSERT OR IGNORE INTO template_licencas')) {
          if (!lic.has(a[0])) lic.set(a[0], { chave: a[0], pedido_id: a[1], template: a[2], email: a[3], dominio: null, downloads: 0 });
        } else if (sql.startsWith('UPDATE template_licencas SET dominio')) {
          const l = lic.get(a[2]); if (l && !l.dominio) l.dominio = a[0];
        } else if (sql.startsWith('UPDATE template_licencas SET revogada')) {
          for (const l of lic.values()) if (l.pedido_id === a[1] && !l.revogada) l.revogada = a[0];
        } else if (sql.startsWith('UPDATE template_licencas SET downloads')) {
          lic.get(a[0]).downloads++;
        }
        return { meta: { changes: 1 } };
      },
    }),
  });
  return { lic, pedidos, DB: { prepare: prep } };
}

test('zip abre no unzip de verdade com os arquivos e o conteúdo certos', () => {
  const enc = new TextEncoder();
  const zip = montarZip([{ nome: 'pasta/a.txt', dados: enc.encode('olá mundo') }, { nome: 'pasta/sub/b.bin', dados: new Uint8Array([0, 1, 2, 255]) }]);
  const dir = mkdtempSync(join(tmpdir(), 'zip-'));
  writeFileSync(join(dir, 't.zip'), zip);
  const out = execFileSync('python3', ['-c', `import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(z.read('pasta/a.txt').decode());print(list(z.read('pasta/sub/b.bin')))`, join(dir, 't.zip')]).toString();
  assert.match(out, /olá mundo/);
  assert.match(out, /\[0, 1, 2, 255\]/);
  assert.equal(crc32(enc.encode('123456789')), 0xcbf43926);
});

test('cada template do catálogo vira um plano à venda, com preço e e-mail de download', () => {
  for (const t of Object.values(TEMPLATES)) {
    const P = PLANOS[t.plano];
    assert.equal(P.template, t.id);
    assert.equal(P.preco, t.preco);
    assert.ok(t.arquivos.includes('site/index.html') && t.arquivos.includes('site/configuracao.js') && t.arquivos.includes('LEIA-ME-PRIMEIRO.html'));
    const m = montarEmailCompra({ id: 'a'.repeat(36), nome: 'Ana', email: 'a@b.com', plano: t.plano });
    assert.match(m.texto, /loja-api\/template\/baixar\?p=a{36}/);
  }
  assert.equal(PLANOS.tpl_agencia.preco, 280);
});

test('licença prende no primeiro domínio de verdade; testes e www não contam', async () => {
  const env = banco();
  await registrarLicencaTemplate(env, { id: 'p1', email: 'Cliente@x.com' }, 'LEU-AAAA-BBBB-CC11', 'agencia-de-viagens');
  assert.deepEqual(await conferirLicenca(env, 'LEU-AAAA-BBBB-CC11', 'meusite.netlify.app'), { ok: true, teste: true });
  assert.deepEqual(await conferirLicenca(env, 'LEU-AAAA-BBBB-CC11', 'localhost'), { ok: true, teste: true });
  assert.equal((await conferirLicenca(env, 'LEU-AAAA-BBBB-CC11', 'www.viajebem.com.br')).ok, true);
  assert.equal(env.lic.get('LEU-AAAA-BBBB-CC11').dominio, 'viajebem.com.br');
  assert.equal((await conferirLicenca(env, 'leu-aaaa-bbbb-cc11', 'viajebem.com.br')).ok, true);
  assert.deepEqual(await conferirLicenca(env, 'LEU-AAAA-BBBB-CC11', 'outraloja.com.br'), { ok: false, motivo: 'outro_dominio' });
  assert.deepEqual(await conferirLicenca(env, '', 'copiado.com.br'), { ok: false, motivo: 'sem_licenca' });
  assert.equal(dominioLimpo('https://WWW.Loja.com.br:443/x'), 'loja.com.br');
});

test('ZIP só sai depois de pago, com a licença do cliente e sem a faixa de demonstração', async () => {
  const env = banco();
  const id = 'b'.repeat(36);
  await registrarLicencaTemplate(env, { id, email: 'c@x.com' }, 'LEU-ZZZZ-YYYY-AB12', 'agencia-de-viagens');
  env.ASSETS = { fetch: async (req) => new Response(readFileSync(new URL('../public' + new URL(req.url).pathname, import.meta.url))) };
  env.pedidos.set(id, 'aguardando');
  assert.equal(await zipDoPedido(env, id, 'https://x'), null, 'sem pagamento não baixa');
  env.pedidos.set(id, 'pago');
  const z = await zipDoPedido(env, id, 'https://x');
  assert.equal(z.nome, 'agencia-de-viagens.zip');
  const dir = mkdtempSync(join(tmpdir(), 'tpl-'));
  writeFileSync(join(dir, 't.zip'), z.zip);
  const cfg = execFileSync('python3', ['-c', `import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(len(z.namelist()));print(z.read('agencia-de-viagens/site/configuracao.js').decode())`, join(dir, 't.zip')]).toString();
  assert.match(cfg, /licenca: "LEU-ZZZZ-YYYY-AB12"/);
  assert.match(cfg, /avisoDemonstracao: false/);
  assert.equal(env.lic.get('LEU-ZZZZ-YYYY-AB12').downloads, 1);
  assert.equal(await zipDoPedido(env, 'nao-e-id', 'https://x'), null);
});

test('compra estornada: a licença para de valer no site do cliente', async () => {
  const env = banco();
  await registrarLicencaTemplate(env, { id: 'p9', email: 'x@y.com' }, 'LEU-EEEE-FFFF-0011', 'agencia-de-viagens');
  assert.equal((await conferirLicenca(env, 'LEU-EEEE-FFFF-0011', 'loja.com.br')).ok, true);
  await revogarLicencaTemplate(env, 'p9', 'mercadopago:refunded');
  assert.deepEqual(await conferirLicenca(env, 'LEU-EEEE-FFFF-0011', 'loja.com.br'), { ok: false, motivo: 'cancelada' });
});
