// Gera sites/supermisto/sitemap.xml e robots.txt a partir do catálogo e das receitas.
// Uso: node entregas/super-misto/gerar_sitemap.mjs  (rodar sempre que entrar produto com foto ou receita nova)
import fs from 'node:fs';
import vm from 'node:vm';
const SITE = new URL('../../sites/supermisto/', import.meta.url);
const ler = (f) => fs.readFileSync(new URL(f, SITE), 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(ler('produtos.js').replace(/^const /gm, 'var ') + ler('receitas.js').replace(/^const /gm, 'var '), ctx);
const fotos = [...ler('site.js').match(/const FOTOS = new Set\(\[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const slug = (n) => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const BASE = 'https://www.supermistotemperos.com.br/';
const urls = ['', 'catalogo.html', 'receitas.html', 'revenda.html', 'privacidade.html',
  ...ctx.LINHAS.map((l) => `linha.html?id=${l.id}`),
  ...ctx.PRODUTOS.filter((p) => fotos.includes(slug(p.nome))).map((p) => `produto.html?id=${slug(p.nome)}`),
  ...ctx.RECEITAS.map((r) => `receita.html?id=${r.id}`)];
fs.writeFileSync(new URL('sitemap.xml', SITE), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${BASE}${u.replace(/&/g, '&amp;')}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(new URL('robots.txt', SITE), `User-agent: *\nAllow: /\nSitemap: ${BASE}sitemap.xml\n`);
console.log('sitemap:', urls.length, 'endereços');
