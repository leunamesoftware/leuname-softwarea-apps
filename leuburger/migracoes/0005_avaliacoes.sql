-- Avaliação do cliente depois de receber o pedido (1 a 5 estrelas + comentário). Uma por pedido.
CREATE TABLE avaliacoes (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  pedido_id TEXT NOT NULL UNIQUE REFERENCES pedidos_online(id),
  nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT,
  nome TEXT NOT NULL,
  criado_em TEXT NOT NULL
);
CREATE INDEX avaliacoes_empresa ON avaliacoes(empresa_id, criado_em);
