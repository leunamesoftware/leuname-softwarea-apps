-- Conversa livre entre a loja e o entregador de cada entrega (sem trocar telefone).
CREATE TABLE mensagens_loja (
  id TEXT PRIMARY KEY,
  venda_id TEXT NOT NULL REFERENCES vendas(id),
  de TEXT NOT NULL CHECK (de IN ('loja','entregador')),
  texto TEXT NOT NULL,
  criado_em TEXT NOT NULL
);
CREATE INDEX mensagens_loja_venda ON mensagens_loja(venda_id, criado_em);
