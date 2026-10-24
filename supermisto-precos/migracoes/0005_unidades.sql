-- Kit do concorrente: quantos pacotinhos e quantos gramas cada (30 sachês × 30 g = 900 g).
ALTER TABLE concorrentes ADD COLUMN unidades INTEGER;
ALTER TABLE concorrentes ADD COLUMN gramas_unidade REAL;
