-- Compra com perda (moer/secar): paguei, comprei e rendeu pronto; e o adesivo/etiqueta de cada pacote.
ALTER TABLE insumos ADD COLUMN pago REAL;
ALTER TABLE insumos ADD COLUMN comprado_kg REAL;
ALTER TABLE insumos ADD COLUMN rendeu_kg REAL;
INSERT INTO config (chave, valor) VALUES ('etiqueta', 0.1);
