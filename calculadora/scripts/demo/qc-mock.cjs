// Mocks da API do Quanto Cobrar para gravar a demonstração (sem servidor).
const fs = require('fs');
const path = require('path');
const receitas = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../src/receitas.json')));
const liberadas = receitas.filter((r) => !r.liberarEm || Date.parse(r.liberarEm) <= Date.now()).map((r) => { const x = { ...r }; delete x.liberarEm; return x; });
exports.prepararPagina = async (pg) => {
  await pg.addInitScript(() => {
    if (!localStorage.getItem('calc.conta')) {
      localStorage.setItem('calc.conta', JSON.stringify({ nome: 'Maria', email: 'maria@exemplo.com', acesso: { plano: 'mensal' } }));
      localStorage.setItem('calc.acesso', JSON.stringify({ plano: 'mensal' }));
    }
  });
  await pg.route('**/api/conta', (r) => r.fulfill({ json: { conta: { nome: 'Maria', email: 'maria@exemplo.com' }, acesso: { plano: 'mensal', receitas: 999 } } }));
  await pg.route('**/api/receitas', (r) => r.fulfill({ json: { receitas: liberadas, plano: 'mensal', bloqueado: false, pacotes: 0 } }));
  await pg.route('https://apps.leunamesoftware.com.br/img/**', (r) => r.fulfill({ path: path.resolve(__dirname, '../../../leuapps/public/img', r.request().url().split('/img/')[1]) }));
  await pg.route('**/api/rendimento', (r) => r.fulfill({ json: { ok: true } }));
};
exports.total = liberadas.length;
