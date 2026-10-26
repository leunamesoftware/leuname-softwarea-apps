-- Produtos do site editados pelo app (Meu site): sobrepõem o catálogo fixo pelo slug, ou entram como produto novo.
CREATE TABLE site_produtos (
  slug TEXT PRIMARY KEY,
  nome TEXT,
  linha TEXT,
  descricao TEXT,
  usos TEXT,
  tamanhos TEXT,           -- JSON: ["10 g","50 g"]
  foto TEXT,               -- chave no R2 (site/...)
  fotos_peso TEXT,         -- JSON: {"1 kg": "site/..."}
  ingredientes TEXT,
  conservacao TEXT,
  validade TEXT,
  alergicos TEXT,
  oculto INTEGER NOT NULL DEFAULT 0,
  atualizado_em TEXT NOT NULL
);
