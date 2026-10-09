// Configurações → Loja no app: como a loja aparece no LeuPede (app dos clientes).
import { useState } from 'react';
import { brl, lerValor } from '../../regras/pedido';
import { get, post, put } from '../api';
import { Carregando, Falha, msgErro, reduzirFoto, useAviso, useDados } from '../comuns';
import { Ic } from '../icones';
import { useSessao } from '../sessao';

interface Cfg {
  slug: string; no_app: number; aceitando: number; tipo_loja: string; descricao: string | null; logo_id: string | null; capa_id: string | null; tempo_entrega: string | null;
  pedido_minimo: number; faz_entrega: number; faz_retirada: number; lat: number | null; lng: number | null; raio_km: number; taxa_entrega_padrao: number; cidade: string | null; nome: string;
}
const reais = (c: number) => (c ? (c / 100).toFixed(2).replace('.', ',') : '');

export function LojaApp() {
  const d = useDados(() => get<{ loja: Cfg; tipos: Record<string, string>; nomeApp: string }>('/loja-app'));
  if (d.carregando && !d.dados) return <Carregando />;
  if (d.erro && !d.dados) return <Falha erro={d.erro} tentar={d.recarregar} />;
  return <Form cfg={d.dados!.loja} tipos={d.dados!.tipos} nomeApp={d.dados!.nomeApp} aoSalvar={d.recarregar} />;
}

function Form({ cfg, tipos, nomeApp, aoSalvar }: { cfg: Cfg; tipos: Record<string, string>; nomeApp: string; aoSalvar: () => void }) {
  const aviso = useAviso();
  const { recarregar } = useSessao();
  const [f, setF] = useState({ ...cfg, minimo: reais(cfg.pedido_minimo), raio: String(cfg.raio_km).replace('.', ','), descricao: cfg.descricao || '', tempo_entrega: cfg.tempo_entrega || '' });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const link = `${location.origin}/pedir/${f.slug}`;
  const liga = (k: 'no_app' | 'aceitando' | 'faz_entrega' | 'faz_retirada') => <span className="interruptor"><input type="checkbox" checked={Boolean(f[k])} onChange={(e) => setF({ ...f, [k]: e.target.checked ? 1 : 0 })} /><span /></span>;
  const subirFoto = async (campo: 'logo_id' | 'capa_id', arq?: File) => {
    if (!arq) return;
    try { setOcupado(true); const r = await post<{ id: string }>('/fotos', { dados: await reduzirFoto(arq) }); setF((x) => ({ ...x, [campo]: r.id })); } catch (e) { aviso(msgErro(e), 'erro'); } finally { setOcupado(false); }
  };
  const pegarLocal = () => {
    if (!navigator.geolocation) return aviso('Este aparelho não informa a localização.', 'erro');
    navigator.geolocation.getCurrentPosition((p) => { setF((x) => ({ ...x, lat: Math.round(p.coords.latitude * 1e5) / 1e5, lng: Math.round(p.coords.longitude * 1e5) / 1e5 })); aviso('Localização da loja marcada. Toque em Salvar.'); },
      () => aviso('Não deu para pegar a localização. Permita o acesso e tente de novo, de dentro da loja.', 'erro'), { enableHighAccuracy: true, timeout: 15000 });
  };
  const salvar = async () => {
    const minimo = f.minimo.trim() ? lerValor(f.minimo) : 0, raio = Number(f.raio.replace(',', '.'));
    if (Number.isNaN(minimo) || minimo < 0) return setErros({ minimo: 'Valor inválido.' });
    if (!(raio >= 0.5 && raio <= 60)) return setErros({ raio: 'De 0,5 a 60 km.' });
    setOcupado(true); setErros({});
    try {
      await put('/loja-app', { slug: f.slug.trim().toLowerCase(), no_app: Boolean(f.no_app), aceitando: Boolean(f.aceitando), faz_entrega: Boolean(f.faz_entrega), faz_retirada: Boolean(f.faz_retirada),
        tipo_loja: f.tipo_loja, descricao: f.descricao.trim() || null, logo_id: f.logo_id, capa_id: f.capa_id, tempo_entrega: f.tempo_entrega.trim() || null, pedido_minimo: minimo, lat: f.lat, lng: f.lng, raio_km: raio });
      aviso(f.no_app ? `Salvo! A loja está no ${nomeApp}.` : 'Salvo.'); await recarregar(); aoSalvar();
    } catch (e: any) { setErros(e?.campos || {}); aviso(msgErro(e), 'erro'); } finally { setOcupado(false); } // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  const copiar = async () => { try { await navigator.clipboard.writeText(link); aviso('Link copiado.'); } catch { aviso('Não deu para copiar.', 'erro'); } };
  return (
    <div className="inicio-meio">
      <section className="cartao">
        <h2 className="cartao-tit">Aparecer no {nomeApp}</h2>
        <p style={{ marginTop: 0, color: 'var(--suave)' }}>O {nomeApp} é o app de pedidos dos clientes. Ligado, a sua loja aparece para quem está perto e os pedidos chegam em <b>Acompanhar</b> para você aceitar.</p>
        <div className="lista-config">
          <div><span>Mostrar a loja no app</span>{liga('no_app')}</div>
          <div><span>Aberta para pedidos agora<small style={{ display: 'block', color: 'var(--suave)', fontWeight: 500 }}>Dá para abrir e fechar também em Acompanhar.</small></span>{liga('aceitando')}</div>
          <div><span>Faz entrega</span>{liga('faz_entrega')}</div>
          <div><span>Cliente pode retirar na loja</span>{liga('faz_retirada')}</div>
        </div>
        <label className="campo" style={{ marginTop: 12 }}>Endereço da loja no app
          <span className="entrada"><span style={{ paddingLeft: 12, color: 'var(--suave)', whiteSpace: 'nowrap' }}>/pedir/</span><input value={f.slug} onChange={(e) => { setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40) }); setErros({}); }} aria-invalid={Boolean(erros.slug)} /></span>
          {erros.slug && <small className="erro">{erros.slug}</small>}</label>
        {Boolean(cfg.no_app) && <div className="aviso" style={{ marginTop: 10, wordBreak: 'break-all' }}>
          <b>Link da sua loja:</b> {link}
          <div className="dupla" style={{ marginTop: 8 }}>
            <button className="btn" onClick={copiar}>Copiar link</button>
            <a className="btn prim" href={`https://wa.me/?text=${encodeURIComponent(`Agora você pode pedir na ${cfg.nome} pelo celular! 🍔\nToque no link, instale o ${nomeApp} e faça o seu pedido:\n${link}`)}`} target="_blank" rel="noopener"><Ic n="whatsapp" />Divulgar</a>
          </div>
        </div>}
        {!cfg.cidade && <p className="aviso erro" style={{ marginTop: 10 }}>Preencha a cidade em <b>Dados da empresa</b> para a loja aparecer no app.</p>}
      </section>
      <section className="cartao">
        <h2 className="cartao-tit">Como a loja aparece</h2>
        <div className="campos">
          <label className="campo">Tipo de loja<select value={f.tipo_loja} onChange={(e) => setF({ ...f, tipo_loja: e.target.value })}>{Object.entries(tipos).map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
          <label className="campo">Tempo de entrega<input value={f.tempo_entrega} onChange={(e) => setF({ ...f, tempo_entrega: e.target.value.slice(0, 20) })} placeholder="Ex.: 30-45 min" /></label>
          <label className="campo largo">Frase da loja<input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value.slice(0, 140) })} placeholder="Ex.: Hambúrguer artesanal na brasa desde 2015" /></label>
          <label className="campo">Pedido mínimo (R$)<input value={f.minimo} onChange={(e) => setF({ ...f, minimo: e.target.value })} inputMode="decimal" placeholder="0,00" aria-invalid={Boolean(erros.minimo)} />{erros.minimo && <small className="erro">{erros.minimo}</small>}</label>
          <label className="campo">Entrega até (km)<input value={f.raio} onChange={(e) => setF({ ...f, raio: e.target.value })} inputMode="decimal" aria-invalid={Boolean(erros.raio)} />{erros.raio && <small className="erro">{erros.raio}</small>}</label>
        </div>
        <p style={{ color: 'var(--suave)', fontSize: 14 }}>Taxa de entrega: {cfg.taxa_entrega_padrao ? brl(cfg.taxa_entrega_padrao) : 'grátis'} (muda em Pagamento e caixa).</p>
        <div className="lista-config">
          <div><span>Logo<small style={{ display: 'block', color: 'var(--suave)', fontWeight: 500 }}>{f.logo_id ? 'Colocado' : 'Sem logo (mostra a inicial do nome)'}</small></span>
            {f.logo_id && <img src={`/api/fotos/${f.logo_id}`} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />}
            <label className="btn peq"><Ic n="foto" t={16} />{f.logo_id ? 'Trocar' : 'Colocar'}<input type="file" accept="image/*" hidden onChange={(e) => subirFoto('logo_id', e.target.files?.[0])} /></label></div>
          <div><span>Foto de capa<small style={{ display: 'block', color: 'var(--suave)', fontWeight: 500 }}>{f.capa_id ? 'Colocada' : 'Sem capa (usa uma imagem padrão)'}</small></span>
            <label className="btn peq"><Ic n="foto" t={16} />{f.capa_id ? 'Trocar' : 'Colocar'}<input type="file" accept="image/*" hidden onChange={(e) => subirFoto('capa_id', e.target.files?.[0])} /></label></div>
          <div><span>Localização da loja<small style={{ display: 'block', color: 'var(--suave)', fontWeight: 500 }}>{f.lat != null ? 'Marcada: o app mostra a loja para quem está perto' : 'Faça isso de dentro da loja, pelo celular'}</small></span>
            <button className="btn peq" onClick={pegarLocal}><Ic n="inicio" t={16} />{f.lat != null ? 'Marcar de novo' : 'Marcar aqui'}</button></div>
        </div>
      </section>
      <div><button className="btn prim grande" onClick={salvar} disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar'}</button></div>
    </div>
  );
}
