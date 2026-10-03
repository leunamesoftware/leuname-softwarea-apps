-- Rendimento real informado pelos usuários. Sem nome, e-mail, telefone ou chave: só um hash irreversível por receita.
CREATE TABLE rendimentos (
  receita_id TEXT NOT NULL,
  autor TEXT NOT NULL,
  unidades_base REAL NOT NULL,
  peso_unidade_g REAL,
  criado_em TEXT NOT NULL,
  PRIMARY KEY (receita_id, autor)
);

CREATE TABLE licencas_cache (
  chave_hash TEXT PRIMARY KEY,
  valida_ate INTEGER NOT NULL
);
