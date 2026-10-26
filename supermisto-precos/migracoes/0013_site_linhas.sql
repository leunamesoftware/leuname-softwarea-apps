-- Fotos das linhas do site enviadas pelo app: quadradinho (cartão 4:3) e banner largo (capa).
CREATE TABLE site_linhas (
  id TEXT PRIMARY KEY,
  foto TEXT,
  capa TEXT,
  atualizado_em TEXT NOT NULL
);
