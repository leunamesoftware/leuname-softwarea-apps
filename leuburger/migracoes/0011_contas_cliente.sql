-- Conta do cliente no app Pedêê (entra com o e-mail e um código de 6 números que chega no e-mail, sem senha): os pedidos e os dados acompanham a pessoa em qualquer celular.
-- Quem não quer conta continua pedindo como visitante.
CREATE TABLE contas_cliente (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,                 -- minúsculo (é o login)
  telefone TEXT NOT NULL,
  endereco TEXT,
  criado_em TEXT NOT NULL
);
CREATE TABLE conta_cliente_sessoes (
  token_hash TEXT PRIMARY KEY,
  conta_id TEXT NOT NULL REFERENCES contas_cliente(id),
  expira_em TEXT NOT NULL, criado_em TEXT NOT NULL
);
CREATE TABLE conta_cliente_codigos (
  email TEXT PRIMARY KEY,
  codigo_hash TEXT NOT NULL,
  expira_em TEXT NOT NULL,
  erros INTEGER NOT NULL DEFAULT 0,
  envios INTEGER NOT NULL DEFAULT 1, envios_desde TEXT NOT NULL,
  ultimo_envio TEXT NOT NULL
);
ALTER TABLE pedidos_online ADD COLUMN conta_id TEXT;
CREATE INDEX pedidos_online_conta ON pedidos_online(conta_id, criado_em);
