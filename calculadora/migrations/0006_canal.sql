-- Página do canal: quando o dono enviou cada postagem (receita ou dica) para o WhatsApp.
CREATE TABLE IF NOT EXISTS canal_envios (
  post_id TEXT PRIMARY KEY,
  enviado_em TEXT NOT NULL
);
-- As 20 primeiras receitas e as 2 primeiras dicas já foram postadas no canal.
INSERT OR IGNORE INTO canal_envios (post_id, enviado_em) VALUES
 ('r:cocada-queimada','2026-10-04T12:00:00Z'),('r:mousse-maracuja','2026-10-04T12:00:00Z'),('r:beijinho-copinho','2026-10-04T12:00:00Z'),
 ('r:sorvete-coco','2026-10-04T12:00:00Z'),('r:brownie-chocolate','2026-10-04T12:00:00Z'),('r:pudim-leite-condensado','2026-10-04T12:00:00Z'),
 ('r:trufa-chocolate','2026-10-04T12:00:00Z'),('r:morango-creme-travessa','2026-10-04T12:00:00Z'),('r:bolo-cenoura-pote','2026-10-04T12:00:00Z'),
 ('r:pave-limao-pote','2026-10-04T12:00:00Z'),('d:1','2026-10-04T12:00:00Z'),
 ('r:joelho-presunto-queijo','2026-10-05T01:00:00Z'),('r:coxinha-frango','2026-10-05T01:00:00Z'),('r:kibe-frito','2026-10-05T01:00:00Z'),
 ('r:risole-presunto-queijo','2026-10-05T01:00:00Z'),('r:bolinha-queijo','2026-10-05T01:00:00Z'),('r:pastel-carne','2026-10-05T01:00:00Z'),
 ('r:esfiha-carne','2026-10-05T01:00:00Z'),('r:empada-frango','2026-10-05T01:00:00Z'),('r:enroladinho-salsicha','2026-10-05T01:00:00Z'),
 ('r:pao-queijo','2026-10-05T01:00:00Z'),('d:2','2026-10-05T01:00:00Z');
