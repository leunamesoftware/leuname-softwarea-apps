-- Brindes: e-mails que ganham o Quanto Cobrar Pro de graça (o dono libera na Área do Dono).
-- Vale quando a pessoa entra (ou cria a conta) com esse e-mail. expira_em vazio = sem prazo.
CREATE TABLE IF NOT EXISTS brindes (
  email TEXT PRIMARY KEY,
  expira_em TEXT,
  obs TEXT,
  criado_em TEXT NOT NULL
);
