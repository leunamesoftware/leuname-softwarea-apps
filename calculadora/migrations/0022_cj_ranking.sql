-- Última busca/ranking do app LeunaPets, guardada para o Claude conseguir ler sem print.
CREATE TABLE IF NOT EXISTS cj_ranking (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  consulta TEXT NOT NULL,
  total INTEGER NOT NULL,
  itens TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);
