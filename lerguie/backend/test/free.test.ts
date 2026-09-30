import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeImageFree, parseSceneJson } from '../src/describeFree.ts';

test('extrai JSON mesmo com texto em volta', () => {
  const r = parseSceneJson('Claro! ```json {"identified":"É uma toalha azul.","hazards":[],"confidence":"high"} ```');
  assert.equal(r.identified, 'É uma toalha azul.');
  assert.equal(r.confidence, 'high');
});

test('resposta sem JSON vira descrição simples', () => {
  assert.equal(parseSceneJson('Um guarda-roupa branco.').identified, 'Um guarda-roupa branco.');
});

test('envia imagem e lê a resposta do Workers AI', async () => {
  let sent: any;
  const ai = { run: async (_m: string, inputs: any) => { sent = inputs; return { response: '{"identified":"É um prego.","hazards":["Há um prego, cuidado com a ponta"],"confidence":"high"}' }; } };
  const r = await describeImageFree(ai, 'modelo', '/9j/abc', 'object', 'pt-BR');
  assert.equal(r.identified, 'É um prego.');
  assert.equal(r.hazards.length, 1);
  assert.ok(JSON.stringify(sent).includes('data:image/jpeg;base64,/9j/abc'));
});
