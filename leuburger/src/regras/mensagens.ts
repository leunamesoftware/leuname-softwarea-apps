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
