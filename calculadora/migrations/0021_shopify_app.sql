-- Ligação do app LeunaPets com a loja Shopify (só o dono): chave/token ficam aqui, nunca no navegador.
CREATE TABLE IF NOT EXISTS shopify_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  loja TEXT NOT NULL,
  token TEXT,
  client_id TEXT,
  client_secret TEXT,
  token_expira TEXT,
  atualizado_em TEXT NOT NULL
);
