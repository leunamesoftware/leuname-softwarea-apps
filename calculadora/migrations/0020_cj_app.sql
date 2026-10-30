-- Ligação do app LeunaPets com a CJ Dropshipping (só o dono): a chave de API e o token ficam guardados aqui, nunca no navegador.
CREATE TABLE IF NOT EXISTS cj_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  api_key TEXT NOT NULL,
  access_token TEXT,
  token_expira TEXT,
  atualizado_em TEXT NOT NULL
);
