-- Login próprio da Área do Dono (separado das contas dos apps): uma senha só, criada pelo dono no primeiro acesso.
CREATE TABLE IF NOT EXISTS dono_acesso (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  email TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  senha_sal TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS dono_sessoes (
  token_hash TEXT PRIMARY KEY,
  expira_em TEXT NOT NULL
);
