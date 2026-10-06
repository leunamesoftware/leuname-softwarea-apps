-- Ajustes guardados pelo dono (ex.: a assinatura que vai nos certificados dos cursos).
CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);
