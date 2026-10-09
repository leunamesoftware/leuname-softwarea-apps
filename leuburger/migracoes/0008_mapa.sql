-- Mapa ao vivo: o app do entregador manda a posição enquanto a entrega está a caminho e o cliente vê no mapa.
ALTER TABLE vendas ADD COLUMN pos_lat REAL;
ALTER TABLE vendas ADD COLUMN pos_lng REAL;
ALTER TABLE vendas ADD COLUMN pos_em TEXT;
ALTER TABLE pedidos_online ADD COLUMN dest_lat REAL;   -- onde o cliente está (se ele mandou a localização)
ALTER TABLE pedidos_online ADD COLUMN dest_lng REAL;
