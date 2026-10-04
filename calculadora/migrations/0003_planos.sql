-- Planos: básico (vitalício, 30 receitas), anual (tudo por 1 ano) e mensal (tudo, assinatura no cartão).
ALTER TABLE pedidos ADD COLUMN plano TEXT NOT NULL DEFAULT 'basico';
ALTER TABLE pedidos ADD COLUMN assinatura_id TEXT;
CREATE INDEX IF NOT EXISTS pedidos_assinatura ON pedidos (assinatura_id);

-- O que cada chave libera. Chave sem linha aqui (manual, revisor) libera tudo, sem prazo.
CREATE TABLE IF NOT EXISTS acessos (
  chave TEXT PRIMARY KEY,
  plano TEXT NOT NULL,
  expira_em TEXT,
  atualizado_em TEXT NOT NULL
);

-- Cada pagamento aprovado é aplicado uma vez só (o aviso do Mercado Pago pode chegar repetido).
CREATE TABLE IF NOT EXISTS pagamentos_aplicados (
  pagamento_id TEXT PRIMARY KEY,
  pedido_id TEXT NOT NULL,
  criado_em TEXT NOT NULL
);
