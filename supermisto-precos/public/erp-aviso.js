// Aviso de pedido novo: som próprio ("plim-plim" de caixa), notificação e contador no título da aba.
import { B, $, aviso, brl } from './erp-base.js';

const CHAVE = 'erp-som';
let ligado = (() => { try { return localStorage.getItem(CHAVE) === '1'; } catch { return false; } })();
let audio = null, ultimo = null, base = document.title, novos = 0;

const CHAVE_ARQ = 'erp-som-arquivo', CHAVE_NOME = 'erp-som-nome';
const ler = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

/** Toca o som escolhido pelo dono (arquivo dele) ou, se não tiver, o plim-plim padrão. */
export function tocar() {
  const arq = ler(CHAVE_ARQ);
  if (arq) { try { const a = new Audio(arq); a.play().catch(() => plim()); return; } catch {} }
  plim();
}

/** Som padrão feito na hora pelo navegador (não é arquivo nem som de marca de ninguém). */
function plim() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t0 = audio.currentTime;
    // duas notas brilhantes (plim-plim) e um brilho mais agudo no fim
    [[1318.5, 0, 0.35], [1760, 0.16, 0.45], [2637, 0.32, 0.6]].forEach(([f, ini, dur]) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + ini);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + ini + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur);
      o.connect(g).connect(audio.destination); o.start(t0 + ini); o.stop(t0 + ini + dur + 0.05);
    });
  } catch {}
}
function botao() { const b = $('#som'); if (b) { b.textContent = ligado ? '🔔' : '🔕'; b.title = ligado ? 'Som de pedido novo: ligado' : 'Som de pedido novo: desligado'; } }
const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const t = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(t, (c) => c.charCodeAt(0)); };

/** Inscreve este aparelho para receber o aviso com o ERP fechado (celular bloqueado também). */
async function inscrever() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'sem-suporte';
  const perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (perm !== 'granted') return 'negado';
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { chave } = await B.api('/api/push/chave');
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(chave) });
  }
  await B.post('/api/push/inscrever', { endpoint: sub.endpoint });
  return 'ok';
}

function painelSom() {
  const nome = ler(CHAVE_NOME);
  let el = $('#som-painel');
  if (!el) { el = document.createElement('div'); el.id = 'som-painel'; document.body.append(el); }
  el.innerHTML = `<div class="som-caixa" role="dialog" aria-label="Som do pedido">
    <button class="fechar" aria-label="Fechar">×</button>
    <h3>🔔 Aviso de pedido novo</h3>
    <label class="check"><input type="checkbox" id="som-ligado" ${ligado ? 'checked' : ''}> Avisos ligados neste aparelho</label>
    <p class="suave">Som com o ERP aberto: <b>${nome ? esc(nome) : 'Plim-plim (padrão)'}</b></p>
    <div class="som-bts">
      <button class="btn sec" id="som-testar">▶ Ouvir</button>
      <label class="btn">🎵 Escolher outro som<input type="file" accept="audio/*" id="som-arquivo" hidden></label>
      ${nome ? '<button class="link" id="som-padrao">voltar ao padrão</button>' : ''}
    </div>
    <details class="som-ajuda"><summary>E com o celular bloqueado?</summary>
      <p>Com o celular bloqueado quem toca é o <b>som de notificação do celular</b>. Para trocar por um som seu (Samsung):</p>
      <ol><li>Baixe o som (mp3) no celular.</li>
      <li><b>Configurações → Notificações → Configurações avançadas → Categorias de notificação</b> (ou toque e segure o aviso → ⚙️).</li>
      <li>Escolha <b>Chrome → Sites → precos.supermistotemperos.com.br</b>.</li>
      <li><b>Som</b> → <b>＋</b> (adicionar) → escolha o arquivo baixado.</li></ol></details>
  </div>`;
  el.hidden = false;
}
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
document.addEventListener('click', (e) => {
  const p = $('#som-painel'); if (!p || p.hidden) return;
  if (e.target === p || e.target.classList.contains('fechar') && e.target.closest('#som-painel')) p.hidden = true;
  if (e.target.id === 'som-testar') tocar();
  if (e.target.id === 'som-padrao') { try { localStorage.removeItem(CHAVE_ARQ); localStorage.removeItem(CHAVE_NOME); } catch {} plim(); painelSom(); }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'som-ligado') { if (e.target.checked !== ligado) alternar(); }
  if (e.target.id === 'som-arquivo' && e.target.files[0]) {
    const f = e.target.files[0];
    if (f.size > 1.5e6) return aviso('Som grande demais: escolha um de até 1,5 MB (alguns segundos).', false);
    const r = new FileReader();
    r.onload = () => {
      try { localStorage.setItem(CHAVE_ARQ, r.result); localStorage.setItem(CHAVE_NOME, f.name); } catch { return aviso('Não coube no navegador: escolha um som menor.', false); }
      tocar(); painelSom(); aviso('✅ Som salvo neste aparelho.');
    };
    r.readAsDataURL(f);
  }
});

async function alternar() {
  ligado = !ligado;
  try { localStorage.setItem(CHAVE, ligado ? '1' : '0'); } catch {}
  botao();
  if (!ligado) { const p = $('#som-painel'); if (p && !p.hidden) painelSom(); return aviso('🔕 Avisos desligados neste aparelho.'); }
  tocar();
  const r = await inscrever().catch(() => 'erro');
  if (r === 'ok') { aviso('🔔 Avisos ligados! Chega notificação de pedido novo até com o celular bloqueado.'); B.post('/api/push/testar').catch(() => {}); }
  else if (r === 'negado') aviso('⚠️ O navegador bloqueou as notificações. Libere em: cadeado ao lado do endereço → Notificações → Permitir.', false);
  else aviso('🔔 Som ligado (este navegador não recebe aviso com o ERP fechado).');
  const p = $('#som-painel'); if (p && !p.hidden) painelSom();
}

// o service worker avisa quando chegou pedido com a tela aberta
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', (e) => {
  if (e.data?.tipo === 'pedido') conferir();
  if (e.data?.tipo === 'abrir') document.querySelector('.abas button[data-aba="pedidos"]')?.click();
});

async function conferir() {
  try {
    const r = await B.api('/api/erp/ultimo');
    if (ultimo === null) { ultimo = r.ultimo || ''; return; }
    if (r.ultimo && r.ultimo > ultimo) {
      ultimo = r.ultimo;
      await B.recarregar();
      const p = B.E.pedidos[0];
      novos++;
      document.title = `(${novos}) 🛒 Pedido novo · ${base}`;
      const txt = p ? `${p.origem === 'shopee' ? 'Shopee' : 'Venda'} ${p.id} · ${brl(p.total)}` : 'Chegou pedido novo';
      aviso(`🛒 Pedido novo! ${txt}`);
      if (ligado) {
        tocar();
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          try { new Notification('🛒 Pedido novo na Supermisto', { body: txt, icon: '/icone-192.png', tag: 'pedido' }); } catch {}
        }
      }
    }
  } catch {}
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { novos = 0; document.title = base; } });
document.addEventListener('click', (e) => { if (e.target.id === 'som') { if (!ligado) alternar(); painelSom(); } });

export function iniciarAviso() {
  botao();
  if (location.hash === '#pedidos') document.querySelector('.abas button[data-aba="pedidos"]')?.click();
  if (ligado && 'Notification' in window && Notification.permission === 'granted') inscrever().catch(() => {});
  conferir();
  setInterval(conferir, 60000);
}
