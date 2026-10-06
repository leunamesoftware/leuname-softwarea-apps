// Grava o app Quanto Cobrar sendo usado (celular 360×640 a 3x = 1080×1920) e anota os tempos de cada passo.
const { chromium } = require('playwright');
const fs = require('fs');
const { prepararPagina } = require('./qc-mock.cjs');
const S = process.argv[2];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true});
  const t0 = Date.now(); const marcas = {};
  const marca = (n) => { marcas[n] = (Date.now() - t0) / 1000; };
  const pg = await ctx.newPage(); pg.on('pageerror', (e) => console.log('ERRO', e.message));
  await prepararPagina(pg);
  await pg.addInitScript(() => {
    // Dedo: um círculo onde a pessoa toca.
    addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = '.dedo{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(232,89,12,.35);border:3px solid rgba(232,89,12,.9);pointer-events:none;z-index:99999;animation:dedo .6s ease-out forwards}@keyframes dedo{from{transform:scale(.4);opacity:1}to{transform:scale(1.3);opacity:0}}';
      document.head.appendChild(s);
    });
  });
  const tocar = async (sel) => {
    const el = pg.locator(sel).first(); await el.waitFor();
    await el.evaluate((e) => e.scrollIntoView({ block: 'nearest' })); await pg.waitForTimeout(150);
    const bx = await el.boundingBox();
    await pg.evaluate(([x, y]) => { const d = document.createElement('div'); d.className = 'dedo'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 700); }, [bx.x + bx.width / 2, bx.y + bx.height / 2]);
    await pg.waitForTimeout(220); await el.evaluate((e) => { e.focus(); e.click(); }); };
  const rolarAte = async (sel, ms = 1200) => {
    await pg.evaluate(async ([sel, ms]) => {
      const el = document.querySelector(sel);
      let box = el.parentElement; // quem rola: a folha do livro ou a página
      while (box && !(box.scrollHeight > box.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
      const rolador = box || document.scrollingElement;
      const topo = box ? box.getBoundingClientRect().top : 0;
      const ini = rolador.scrollTop; const alvo = ini + el.getBoundingClientRect().top - topo - 12; const t = performance.now();
      await new Promise((ok) => { const p = () => { const k = Math.min(1, (performance.now() - t) / ms); rolador.scrollTop = ini + (alvo - ini) * (1 - (1 - k) ** 3); k < 1 ? requestAnimationFrame(p) : ok(); }; p(); });
    }, [sel, ms]);
  };
  // Grava tirando fotos da tela sem parar (já em 1080×1920), cada uma com a hora.
  fs.rmSync(S + '/qf', { recursive: true, force: true }); fs.mkdirSync(S + '/qf');
  const cdp = await ctx.newCDPSession(pg); const quadros = []; let gravando = true, tIni = null;
  const laco = (async () => { while (gravando) { try {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: 360, height: 640, scale: 2 } });
    const t = Date.now() / 1000; if (tIni === null) tIni = t;
    const nome = `qf/${String(quadros.length).padStart(5, '0')}.jpg`; fs.writeFileSync(S + '/' + nome, Buffer.from(data, 'base64')); quadros.push([t, nome]);
  } catch (e) { await new Promise((r) => setTimeout(r, 30)); } } })();
  await pg.goto('http://localhost:8772/app/');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 }); await pg.waitForTimeout(1600);
  marca('capa'); await pg.waitForTimeout(1300);
  await tocar('#capa'); marca('sumario'); await pg.waitForTimeout(1500);
  await tocar('#busca-livro'); marca('busca');
  await pg.keyboard.type('brigadeiro', { delay: 110 }); await pg.waitForTimeout(900);
  await tocar('#busca-sugestoes [data-ir-receita]'); marca('receita'); await pg.waitForTimeout(2200);
  await tocar('.partes button:nth-child(2)'); marca('ingredientes'); await pg.waitForTimeout(2300);
  await tocar('.partes button:nth-child(4)'); marca('preco'); await pg.waitForTimeout(1500);
  await rolarAte('#m-res', 1600); marca('custo'); await pg.waitForTimeout(2600);
  await rolarAte('.mini-precos', 900); await pg.waitForTimeout(500);
  await tocar('.mini-precos button:nth-child(2)'); await pg.waitForTimeout(400);
  await rolarAte('#m-lucro', 1000); marca('lucro'); await pg.waitForTimeout(2800);
  marca('fim');
  gravando = false; await laco;
  // As marcas passam a contar a partir do primeiro quadro gravado.
  const desloc = tIni - t0 / 1000;
  for (const k of Object.keys(marcas)) marcas[k] = Math.max(0, marcas[k] - desloc);
  fs.writeFileSync(S + '/qc-quadros.json', JSON.stringify(quadros.map(([t, n]) => [t - tIni, n])));
  fs.writeFileSync(S + '/qc-marcas.json', JSON.stringify(marcas));
  await ctx.close(); await b.close();
  console.log(marcas);
})();
