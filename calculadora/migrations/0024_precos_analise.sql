-- Custo, frete e lucro de cada produto da loja LeunaPets (para o Claude ler sem print).
CREATE TABLE IF NOT EXISTS precos_analise (
  pid TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);
