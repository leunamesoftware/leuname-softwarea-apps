// Selfie na hora, pela câmera do celular (o entregador não escolhe foto da galeria).
import { useEffect, useRef, useState } from 'react';

/** Abre a câmera da frente, mostra o rosto ao vivo e devolve uma foto pequena (JPEG) quando toca em "Tirar foto". */
export function Selfie({ aoTirar, rotulo = 'Tirar foto' }: { aoTirar: (dados: string) => void; rotulo?: string }) {
  const video = useRef<HTMLVideoElement>(null), fluxo = useRef<MediaStream | null>(null);
  const [pronto, setPronto] = useState(false), [erro, setErro] = useState(''), [previa, setPrevia] = useState('');

  const abrir = async () => {
    setErro(''); setPrevia(''); setPronto(false);
    try {
      const m = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }, audio: false });
      fluxo.current = m;
      if (video.current) { video.current.srcObject = m; await video.current.play(); setPronto(true); }
    } catch { setErro('A câmera não abriu. Toque em “Abrir câmera” e permita o uso da câmera.'); }
  };
  const fechar = () => { fluxo.current?.getTracks().forEach((t) => t.stop()); fluxo.current = null; };
  useEffect(() => { abrir(); return fechar; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Recorta o centro em quadrado 320×320 e confere se não ficou escura demais. */
  const montar = (fonte: CanvasImageSource, w: number, h: number, espelhar: boolean) => {
    const lado = Math.min(w, h), c = document.createElement('canvas'); c.width = c.height = 320;
    const x = c.getContext('2d')!;
    if (espelhar) { x.translate(320, 0); x.scale(-1, 1); } // como o celular mostra
    x.drawImage(fonte, (w - lado) / 2, (h - lado) / 2, lado, lado, 0, 0, 320, 320);
    const px = x.getImageData(0, 0, 320, 320).data;
    let soma = 0; for (let i = 0; i < px.length; i += 16) soma += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    if (soma / (px.length / 16) < 55) { setErro('🌙 Você está no escuro. Vá para um local mais claro e tire de novo.'); return; }
    setErro(''); setPrevia(c.toDataURL('image/jpeg', 0.72)); fechar(); setPronto(false);
  };
  const tirar = () => { const v = video.current; if (v && v.videoWidth) montar(v, v.videoWidth, v.videoHeight, true); };
  // Enquanto a câmera está aberta, confere a luz e avisa se a pessoa está no escuro.
  const [escuro, setEscuro] = useState(false);
  useEffect(() => {
    if (!pronto) { setEscuro(false); return; }
    const c = document.createElement('canvas'); c.width = c.height = 24;
    const x = c.getContext('2d', { willReadFrequently: true })!;
    const t = setInterval(() => {
      const v = video.current; if (!v || !v.videoWidth) return;
      x.drawImage(v, 0, 0, 24, 24);
      const px = x.getImageData(0, 0, 24, 24).data; let soma = 0;
      for (let i = 0; i < px.length; i += 4) soma += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      setEscuro(soma / (px.length / 4) < 55);
    }, 700);
    return () => clearInterval(t);
  }, [pronto]);

  return (
    <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
      <div style={{ width: 240, height: 240, borderRadius: '50%', overflow: 'hidden', background: '#111', border: '4px solid var(--verde, #16a34a)' }}>
        {previa ? <img src={previa} alt="Sua foto" width={240} height={240} /> : <video ref={video} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />}
      </div>
      {erro && <p className="aviso erro" style={{ margin: 0 }}>{erro}</p>}
      {!previa && (pronto ? <button type="button" className="btn prim grande bloco" onClick={tirar}>📸 {rotulo}</button> : erro && <button type="button" className="btn bloco" onClick={abrir}>Abrir câmera</button>)}
      {pronto && escuro && <p className="aviso erro" style={{ margin: 0 }}>🌙 Você está no escuro. Vá para um local mais claro.</p>}
      {previa && <div className="dupla" style={{ width: '100%' }}><button type="button" className="btn" onClick={abrir}>Tirar outra</button><button type="button" className="btn prim" onClick={() => aoTirar(previa)}>Usar esta foto</button></div>}
      <small style={{ color: 'var(--suave)', textAlign: 'center' }}>Rosto de frente, com boa luz. O cliente vê esta foto quando você estiver com o pedido dele.</small>
    </div>
  );
}
