-- Conta do cliente (e-mail + senha): substitui a chave de licença. As compras ficam ligadas à conta.
CREATE TABLE IF NOT EXISTS contas (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nome TEXT,
  senha_hash TEXT NOT NULL,
  senha_sal TEXT NOT NULL,
  criado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessoes (
  token_hash TEXT PRIMARY KEY,
  conta_id TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  expira_em TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessoes_conta ON sessoes (conta_id);
ALTER TABLE pedidos ADD COLUMN conta_id TEXT;
CREATE INDEX IF NOT EXISTS pedidos_conta ON pedidos (conta_id);
