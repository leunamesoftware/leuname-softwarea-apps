-- Texto técnico da CJ dos produtos enviados à loja (para o Claude escrever as descrições sem print).
CREATE TABLE IF NOT EXISTS cj_detalhes (
  pid TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);
