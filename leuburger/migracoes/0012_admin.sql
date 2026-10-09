-- Painel do administrador do Pedêê (só o dono: DONO_EMAIL + senha da Área do Dono).
CREATE TABLE admin_sessoes (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expira_em TEXT NOT NULL, criado_em TEXT NOT NULL
);
