-- O motoboy entra com e-mail e senha (não pede WhatsApp) e só há moto e bicicleta.
-- Ainda não há motoboys reais: recria as tabelas do entregador com e-mail.
UPDATE vendas SET entregador_id = NULL WHERE entregador_id IS NOT NULL;
DROP TABLE loja_entregadores;
DROP TABLE entregador_sessoes;
DROP TABLE entregadores;
CREATE TABLE entregadores (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,                 -- minúsculo (é o login)
  senha_hash TEXT NOT NULL, senha_sal TEXT NOT NULL,
  veiculo TEXT NOT NULL DEFAULT 'moto' CHECK (veiculo IN ('moto','bike')),
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
