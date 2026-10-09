-- Foto do entregador (tirada na hora, pela câmera) e mensagens entre entregador e cliente (sem trocar telefone).
ALTER TABLE entregadores ADD COLUMN foto TEXT;            -- imagem em data URL, pequena (rosto)
CREATE TABLE mensagens_entrega (
  id TEXT PRIMARY KEY,
  venda_id TEXT NOT NULL REFERENCES vendas(id),
  de TEXT NOT NULL CHECK (de IN ('entregador','cliente')),
  texto TEXT NOT NULL,
  criado_em TEXT NOT NULL
);
CREATE INDEX mensagens_entrega_venda ON mensagens_entrega(venda_id, criado_em);
-- Código de entrega (4 números): o cliente passa ao entregador na hora de receber; sem ele não dá para marcar "entregue".
ALTER TABLE vendas ADD COLUMN codigo_entrega TEXT;
