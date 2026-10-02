import type { Env } from './types';

/**
 * Envia e-mail pelo Resend. Sem RESEND_API_KEY (desenvolvimento), só
 * registra no log — nunca falha o pedido do usuário por isso.
 */
export async function sendEmail(env: Env, to: string, subject: string, text: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log(`[email não enviado: falta RESEND_API_KEY] para=${to} assunto=${subject}\n${text}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, text }),
  });
  if (!res.ok) console.error(`falha ao enviar e-mail: ${res.status} ${await res.text()}`);
}
