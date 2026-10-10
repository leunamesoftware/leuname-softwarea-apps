// Entregador e cliente só trocam mensagens prontas (evita briga, ameaça e troca de contato).
// Com a loja o entregador conversa livre (tabela mensagens_loja).
export const RAPIDAS_ENTREGADOR = [
  '🛵 Estou a caminho',
  '📍 Estou chegando',
  '✅ Cheguei, estou na frente',
  '🔎 Não encontrei o endereço',
  '⏱️ Tive um imprevisto, vou atrasar alguns minutos',
] as const;
export const RAPIDAS_CLIENTE = [
  '🏠 Estou em casa, aguardando',
  '👍 Já estou descendo',
  '🏢 Pode deixar na portaria',
  '🔔 Toque o interfone',
  '🚪 Estou no portão',
] as const;
/** Quantas vezes cada mensagem pronta pode ir no mesmo pedido (o imprevisto só uma vez). */
export const vezesPermitidas = (texto: string) => (texto.startsWith('⏱️') ? 1 : 3);

// Conversa cliente ↔ loja: texto livre, mas sem passar contato e sem ofensa.
const PALAVRAS_RUINS = ['porra', 'caralho', 'fdp', 'filho da puta', 'puta', 'merda', 'vagabund', 'otario', 'otário', 'idiota', 'imbecil', 'desgraça', 'desgraca', 'arrombad', 'cuzao', 'cuzão', 'viado', 'vou te matar', 'te pegar', 'safad', 'lixo de'];
export const RAPIDAS_CLIENTE_LOJA = ['Meu pedido vai demorar?', 'Pode caprichar no molho? 😋', 'Vou precisar de troco', 'Errei o endereço, já corrijo aqui'] as const;
export const RAPIDAS_LOJA_CLIENTE = ['Já está saindo! 🛵', 'Vai atrasar uns minutinhos, desculpe', 'Pode deixar!', 'Obrigado pelo pedido! 😊'] as const;
/** Devolve o motivo se a mensagem não pode ir (telefone, link, e-mail ou palavrão); vazio se pode. */
export function conferirMensagem(texto: string): string {
  const t = texto.toLowerCase();
  if (/(\d[\s.\-()]*){8,}/.test(t)) return 'Não é permitido passar número de telefone. Converse por aqui.';
  if (/https?:\/\/|www\.|\.com|\.br\b|wa\.me|@/.test(t)) return 'Não é permitido mandar link, e-mail ou @. Converse por aqui.';
  if (PALAVRAS_RUINS.some((p) => t.includes(p))) return 'Mensagem não enviada: sem palavrão ou ofensa, por favor.';
  return '';
}
