-- "Esqueci a senha": link por e-mail (vale 1 hora, uma vez só). Guarda só o hash do código.
CREATE TABLE IF NOT EXISTS novas_senhas (
  token_hash TEXT PRIMARY KEY,
  conta_id TEXT NOT NULL,
  expira_em TEXT NOT NULL,
  usado_em TEXT
);
