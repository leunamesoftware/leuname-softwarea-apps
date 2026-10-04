-- Teste grátis de 7 dias: um por aparelho; limite por IP (hash) para evitar abuso.
CREATE TABLE IF NOT EXISTS testes (
  token TEXT PRIMARY KEY,
  aparelho TEXT NOT NULL UNIQUE,
  ip TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  expira_em TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS testes_ip ON testes (ip, criado_em);
