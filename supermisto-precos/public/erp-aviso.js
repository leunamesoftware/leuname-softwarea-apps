// Aviso de pedido novo: som próprio ("plim-plim" de caixa), notificação e contador no título da aba.
import { B, $, aviso, brl } from './erp-base.js';

const CHAVE = 'erp-som';
let ligado = (() => { try { return localStorage.getItem(CHAVE) === '1'; } catch { return false; } })();
let audio = null, ultimo = null, base = document.title, novos = 0;

/** Som feito na hora pelo navegador (não é arquivo nem som de marca de ninguém). */
export function tocar() {
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
async function alternar() {
  ligado = !ligado;
  try { localStorage.setItem(CHAVE, ligado ? '1' : '0'); } catch {}
  botao();
  if (ligado) {
    tocar();
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission().catch(() => {});
    aviso('🔔 Som ligado: vai tocar quando chegar pedido novo (com o ERP aberto).');
  } else aviso('🔕 Som de pedido desligado.');
}

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
document.addEventListener('click', (e) => { if (e.target.id === 'som') alternar(); });

export function iniciarAviso() {
  botao();
  conferir();
  setInterval(conferir, 60000);
}
