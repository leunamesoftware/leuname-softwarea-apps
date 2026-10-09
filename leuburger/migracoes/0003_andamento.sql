-- Andamento do pedido (cozinha → pronto/a caminho → entregue) e links sem login para o cliente e o motoboy.
-- Vendas antigas ficam como finalizadas; as novas começam "preparando".
ALTER TABLE vendas ADD COLUMN andamento TEXT NOT NULL DEFAULT 'retirado';
ALTER TABLE vendas ADD COLUMN token_cliente TEXT;
ALTER TABLE vendas ADD COLUMN token_entregador TEXT;
ALTER TABLE vendas ADD COLUMN entregador TEXT;
ALTER TABLE vendas ADD COLUMN pronto_em TEXT;
ALTER TABLE vendas ADD COLUMN saiu_em TEXT;
ALTER TABLE vendas ADD COLUMN finalizado_em TEXT;
CREATE UNIQUE INDEX vendas_token_cliente ON vendas(token_cliente);
CREATE UNIQUE INDEX vendas_token_entregador ON vendas(token_entregador);
CREATE INDEX vendas_andamento ON vendas(empresa_id, andamento);
