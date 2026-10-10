-- Conversa do cliente com a loja sobre um pedido do app (sem telefone; o servidor barra número, link e palavrão).
CREATE TABLE mensagens_pedido (
  id TEXT PRIMARY KEY,
  pedido_id TEXT NOT NULL REFERENCES pedidos_online(id),
  de TEXT NOT NULL CHECK (de IN ('cliente','loja')),
  texto TEXT NOT NULL,
  criado_em TEXT NOT NULL
);
CREATE INDEX mensagens_pedido_pedido ON mensagens_pedido(pedido_id, criado_em);
