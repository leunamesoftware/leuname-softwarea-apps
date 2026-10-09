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
    } catch { setErro('Não deu para abrir a câmera. Permita o uso da câmera no navegador e toque em “Abrir câmera”.'); }
  };
  const fechar = () => { fluxo.current?.getTracks().forEach((t) => t.stop()); fluxo.current = null; };
  useEffect(() => { abrir(); return fechar; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tirar = () => {
    const v = video.current; if (!v || !v.videoWidth) return;
    const lado = Math.min(v.videoWidth, v.videoHeight), c = document.createElement('canvas'); c.width = c.height = 320;
    const x = c.getContext('2d')!; x.translate(320, 0); x.scale(-1, 1); // espelhado, como o celular mostra
    x.drawImage(v, (v.videoWidth - lado) / 2, (v.videoHeight - lado) / 2, lado, lado, 0, 0, 320, 320);
    const dados = c.toDataURL('image/jpeg', 0.72);
    setPrevia(dados); fechar(); setPronto(false);
  };

  return (
    <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
      <div style={{ width: 240, height: 240, borderRadius: '50%', overflow: 'hidden', background: '#111', border: '4px solid var(--verde, #16a34a)' }}>
        {previa ? <img src={previa} alt="Sua foto" width={240} height={240} /> : <video ref={video} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />}
      </div>
      {erro && <p className="aviso erro" style={{ margin: 0 }}>{erro}</p>}
      {!previa && (pronto ? <button type="button" className="btn prim grande bloco" onClick={tirar}>📸 {rotulo}</button> : erro && <button type="button" className="btn bloco" onClick={abrir}>Abrir câmera</button>)}
      {previa && <div className="dupla" style={{ width: '100%' }}><button type="button" className="btn" onClick={abrir}>Tirar outra</button><button type="button" className="btn prim" onClick={() => aoTirar(previa)}>Usar esta foto</button></div>}
      <small style={{ color: 'var(--suave)', textAlign: 'center' }}>Rosto de frente, com boa luz. O cliente vê esta foto quando você estiver com o pedido dele.</small>
    </div>
  );
}
