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
    } catch { setErro('A câmera não abriu aqui. Toque no botão abaixo para tirar a foto com a câmera do celular.'); }
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
    if (soma / (px.length / 16) < 55) { setErro('A foto ficou muito escura. Vá para um lugar com luz, de frente para a claridade, e tire de novo.'); return; }
    setErro(''); setPrevia(c.toDataURL('image/jpeg', 0.72)); fechar(); setPronto(false);
  };
  const tirar = () => { const v = video.current; if (v && v.videoWidth) montar(v, v.videoWidth, v.videoHeight, true); };
  /** Plano B: abre a câmera do próprio celular (frontal) quando a câmera ao vivo não liga. */
  const arquivo = useRef<HTMLInputElement>(null);
  const daCamera = (f: File | undefined) => {
    if (!f) return;
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => { montar(img, img.naturalWidth, img.naturalHeight, false); URL.revokeObjectURL(url); };
    img.src = url;
  };

  return (
    <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
      <div style={{ width: 240, height: 240, borderRadius: '50%', overflow: 'hidden', background: '#111', border: '4px solid var(--verde, #16a34a)' }}>
        {previa ? <img src={previa} alt="Sua foto" width={240} height={240} /> : <video ref={video} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />}
      </div>
      {erro && <p className="aviso erro" style={{ margin: 0 }}>{erro}</p>}
      <input ref={arquivo} type="file" accept="image/*" capture="user" hidden onChange={(e) => { daCamera(e.target.files?.[0]); e.target.value = ''; }} />
      {!previa && (pronto ? <button type="button" className="btn prim grande bloco" onClick={tirar}>📸 {rotulo}</button>
        : erro && <button type="button" className="btn prim grande bloco" onClick={() => arquivo.current?.click()}>📸 Tirar foto com a câmera do celular</button>)}
      {previa && <div className="dupla" style={{ width: '100%' }}><button type="button" className="btn" onClick={abrir}>Tirar outra</button><button type="button" className="btn prim" onClick={() => aoTirar(previa)}>Usar esta foto</button></div>}
      <small style={{ color: 'var(--suave)', textAlign: 'center' }}>💡 Fique num lugar com luz, de frente para a claridade, sem boné nem óculos escuros. O cliente vê esta foto quando você estiver com o pedido dele.</small>
    </div>
  );
}
