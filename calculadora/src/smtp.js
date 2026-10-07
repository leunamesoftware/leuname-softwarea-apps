// Envio de e-mail pelo Gmail da empresa (SMTP com "senha de app"), direto do Worker.
// Usuário: GMAIL_USUARIO (ou DONO_EMAIL). Senha: segredo GMAIL_SENHA_APP, colado pelo dono na Cloudflare
// (Workers → calculadora-receitas → Configurações → Variáveis e segredos). Nunca no código.
// O Gmail aceita uns 500 e-mails por dia; o que não sair fica na Área do Dono para mandar à mão.

const b64 = (texto) => {
  const bytes = new TextEncoder().encode(texto);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const linhas76 = (s) => s.replace(/.{1,76}/g, '$&\r\n');
const assunto = (s) => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`;

/** Monta a mensagem (texto + HTML) no formato que o SMTP espera. */
export function montarMensagem({ de, nomeDe, para, responder, titulo, texto, html }) {
  const fronteira = 'leu-' + crypto.randomUUID();
  return [
    `From: ${assunto(nomeDe || 'LeuName Softwares')} <${de}>`,
    `To: <${para}>`,
    responder ? `Reply-To: <${responder}>` : null,
    `Subject: ${assunto(titulo)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${crypto.randomUUID()}@leunamesoftware.com.br>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${fronteira}"`,
    '',
    `--${fronteira}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    linhas76(b64(texto)),
    `--${fronteira}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    linhas76(b64(html)),
    `--${fronteira}--`,
  ].filter((l) => l !== null).join('\r\n');
}

/** Manda um e-mail pelo Gmail. `conectar` só é trocado nos testes. Devolve true ou lança o erro. */
export async function enviarPeloGmail(env, { para, titulo, texto, html }, conectar) {
  const usuario = env.GMAIL_USUARIO || env.DONO_EMAIL;
  if (!usuario || !env.GMAIL_SENHA_APP) throw new Error('gmail_sem_senha');
  if (!conectar) ({ connect: conectar } = await import('cloudflare:sockets'));
  const sock = conectar({ hostname: 'smtp.gmail.com', port: 465 }, { secureTransport: 'on', allowHalfOpen: false });
  const escrever = sock.writable.getWriter(), ler = sock.readable.getReader();
  const dec = new TextDecoder();
  let sobra = '';
  // Lê uma resposta inteira do servidor (pode ter várias linhas "250-..." até a "250 ...").
  async function resposta() {
    for (;;) {
      const linhas = sobra.split('\r\n');
      for (let i = 0; i < linhas.length - 1; i++) {
        if (/^\d{3} /.test(linhas[i])) { sobra = linhas.slice(i + 1).join('\r\n'); return linhas[i]; }
      }
      const { value, done } = await ler.read();
      if (done) throw new Error('gmail_fechou');
      sobra += dec.decode(value, { stream: true });
    }
  }
  async function passo(comando, espera) {
    if (comando !== null) await escrever.write(new TextEncoder().encode(comando + '\r\n'));
    const r = await resposta();
    if (!r.startsWith(espera)) throw new Error(`gmail_${espera}_${r.slice(0, 3)}`);
    return r;
  }
  const tempo = new Promise((_, nao) => setTimeout(() => nao(new Error('gmail_demorou')), 20000));
  const conversa = (async () => {
    await passo(null, '220');
    await passo('EHLO leunamesoftware.com.br', '250');
    await passo('AUTH LOGIN', '334');
    await passo(b64(usuario), '334');
    await passo(b64(String(env.GMAIL_SENHA_APP).replace(/\s+/g, '')), '235');
    await passo(`MAIL FROM:<${usuario}>`, '250');
    await passo(`RCPT TO:<${para}>`, '250');
    await passo('DATA', '354');
    const msg = montarMensagem({ de: usuario, para, responder: usuario, titulo, texto, html })
      .split('\r\n').map((l) => (l.startsWith('.') ? '.' + l : l)).join('\r\n');
    await passo(msg + '\r\n.', '250');
    await passo('QUIT', '221').catch(() => {});
    return true;
  })();
  try { return await Promise.race([conversa, tempo]); } finally { try { await sock.close(); } catch {} }
}
