-- Templates de site vendidos: uma licença por compra, presa ao 1º domínio onde o site for publicado.
CREATE TABLE IF NOT EXISTS template_licencas (
  chave TEXT PRIMARY KEY,
  pedido_id TEXT NOT NULL,
  template TEXT NOT NULL,
  email TEXT NOT NULL,
  dominio TEXT,
  criado_em TEXT NOT NULL,
  ativado_em TEXT,
  downloads INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS template_licencas_pedido ON template_licencas (pedido_id);
