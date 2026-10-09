-- Pedido para entrega: endereço que sai no comprovante (para o motoboy) e taxa de entrega.
ALTER TABLE vendas ADD COLUMN tipo TEXT NOT NULL DEFAULT 'balcao';
ALTER TABLE vendas ADD COLUMN endereco_entrega TEXT;
ALTER TABLE vendas ADD COLUMN taxa_entrega INTEGER NOT NULL DEFAULT 0;
ALTER TABLE empresas ADD COLUMN taxa_entrega_padrao INTEGER NOT NULL DEFAULT 0;
