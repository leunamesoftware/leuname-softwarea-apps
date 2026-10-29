-- Presente vitalício dos outros apps (Gestacell, Radar...): o dono libera o e-mail e a licença fica presa a ele.
CREATE TABLE IF NOT EXISTS brindes_apps (
  email TEXT NOT NULL,
  app TEXT NOT NULL,
  chave TEXT NOT NULL,
  obs TEXT,
  criado_em TEXT NOT NULL,
  PRIMARY KEY (email, app)
);
