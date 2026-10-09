-- Pedêê Entregador: o motoboy tem conta própria (app dele). A loja vincula os motoboys dela pelo WhatsApp
-- e escolhe quem leva cada entrega; o motoboy vê, aceita o trajeto e marca saí/entreguei no app.
CREATE TABLE entregadores (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL UNIQUE,              -- só números (é o login)
  senha_hash TEXT NOT NULL, senha_sal TEXT NOT NULL,
  veiculo TEXT NOT NULL DEFAULT 'moto' CHECK (veiculo IN ('moto','bike','carro')),
  cidade TEXT,
  disponivel INTEGER NOT NULL DEFAULT 1,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL
);
CREATE TABLE entregador_sessoes (
  token_hash TEXT PRIMARY KEY,
  entregador_id TEXT NOT NULL REFERENCES entregadores(id),
  expira_em TEXT NOT NULL, criado_em TEXT NOT NULL
);
CREATE TABLE loja_entregadores (
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  entregador_id TEXT NOT NULL REFERENCES entregadores(id),
  criado_em TEXT NOT NULL,
  PRIMARY KEY (empresa_id, entregador_id)
);
ALTER TABLE vendas ADD COLUMN entregador_id TEXT REFERENCES entregadores(id);
CREATE INDEX vendas_entregador ON vendas(entregador_id, andamento);
