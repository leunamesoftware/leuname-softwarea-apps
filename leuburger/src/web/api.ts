// Conversa com o servidor. Erros viram ErroApp com a mensagem pronta para mostrar.
export class ErroApp extends Error {
  constructor(public status: number, public codigo: string, mensagem: string, public campos?: Record<string, string>) { super(mensagem); }
}

let aoPerderSessao: (() => void) | null = null;
export const quandoPerderSessao = (f: () => void) => { aoPerderSessao = f; };

export async function api<T = any>(caminho: string, opcoes: { metodo?: string; dados?: unknown } = {}): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let r: Response;
  try {
    r = await fetch('/api' + caminho, {
      method: opcoes.metodo || (opcoes.dados !== undefined ? 'POST' : 'GET'),
      headers: opcoes.dados !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: opcoes.dados !== undefined ? JSON.stringify(opcoes.dados) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new ErroApp(0, 'sem_internet', 'Sem conexão com a internet. Confira a rede e tente de novo.');
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.ok === false) {
    if (r.status === 401 && !caminho.startsWith('/auth/')) aoPerderSessao?.();
    throw new ErroApp(r.status, d.erro || 'erro', d.mensagem || 'Não deu certo. Tente de novo.', d.campos);
  }
  return d as T;
}
export const get = <T = any>(c: string) => api<T>(c); // eslint-disable-line @typescript-eslint/no-explicit-any
export const post = <T = any>(c: string, dados: unknown = {}) => api<T>(c, { metodo: 'POST', dados }); // eslint-disable-line @typescript-eslint/no-explicit-any
export const put = <T = any>(c: string, dados: unknown) => api<T>(c, { metodo: 'PUT', dados }); // eslint-disable-line @typescript-eslint/no-explicit-any
export const del = <T = any>(c: string) => api<T>(c, { metodo: 'DELETE' }); // eslint-disable-line @typescript-eslint/no-explicit-any

// ---------- datas no horário do aparelho ----------
export const hojeLocal = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
export const fuso = () => new Date().getTimezoneOffset();
export const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const dataCurta = (iso: string) => new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('pt-BR');
