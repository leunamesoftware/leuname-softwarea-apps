-- Precificador Supermisto: matéria-prima, produtos (receitas), preços da concorrência lidos dos prints e sessões do dono.
CREATE TABLE config (chave TEXT PRIMARY KEY, valor REAL NOT NULL);
CREATE TABLE insumos (nome TEXT PRIMARY KEY, preco_kg REAL NOT NULL, atualizado_em TEXT);
CREATE TABLE produtos (id TEXT PRIMARY KEY, nome TEXT NOT NULL, receita TEXT NOT NULL, ordem INTEGER NOT NULL);
CREATE TABLE concorrentes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, produto_id TEXT, anuncio TEXT, loja TEXT,
  gramas REAL, preco REAL NOT NULL, vendidos INTEGER, criado_em TEXT NOT NULL
);
CREATE INDEX concorrentes_produto ON concorrentes (produto_id);
CREATE TABLE sessoes (token_hash TEXT PRIMARY KEY, expira_em TEXT NOT NULL);

INSERT INTO config (chave, valor) VALUES
  ('taxa_pct', 20), ('taxa_fixa', 4.5), ('lucro_min', 2), ('emb_sache', 0.35), ('emb_kit', 0.5), ('emb_50', 0.8), ('emb_100', 1);

-- Preços de partida (estimativa de atacado): o dono troca pelos da CEASA.
INSERT INTO insumos (nome, preco_kg) VALUES
  ('Sal refinado', 3), ('Alho desidratado', 45), ('Cebola desidratada', 35), ('Salsa desidratada', 60),
  ('Colorau', 14), ('Pimentão desidratado', 70), ('Pimenta-do-reino moída', 60), ('Orégano', 50),
  ('Cebolinha desidratada', 80), ('Cominho moído', 40), ('Chimichurri', 55), ('Páprica doce', 45),
  ('Páprica defumada', 60), ('Cúrcuma', 35), ('Alho em pó', 45), ('Cebola em pó', 35),
  ('Lemon pepper', 45), ('Pimenta calabresa', 40), ('Canela em pó', 50), ('Tempero baiano', 30);

INSERT INTO produtos (id, nome, receita, ordem) VALUES
  ('colorau', 'Colorau', '[{"insumo":"Colorau","pct":100}]', 1),
  ('tempero-completo', 'Tempero Completo', '[{"insumo":"Sal refinado","pct":50},{"insumo":"Alho desidratado","pct":15},{"insumo":"Cebola desidratada","pct":12},{"insumo":"Salsa desidratada","pct":6},{"insumo":"Colorau","pct":6},{"insumo":"Pimentão desidratado","pct":4},{"insumo":"Pimenta-do-reino moída","pct":3},{"insumo":"Orégano","pct":2.5},{"insumo":"Cebolinha desidratada","pct":1.5}]', 2),
  ('pimenta-do-reino', 'Pimenta-do-Reino Moída', '[{"insumo":"Pimenta-do-reino moída","pct":100}]', 3),
  ('cominho', 'Cominho Moído', '[{"insumo":"Cominho moído","pct":100}]', 4),
  ('chimichurri', 'Chimichurri', '[{"insumo":"Chimichurri","pct":100}]', 5),
  ('oregano', 'Orégano', '[{"insumo":"Orégano","pct":100}]', 6),
  ('paprica-doce', 'Páprica Doce', '[{"insumo":"Páprica doce","pct":100}]', 7),
  ('paprica-defumada', 'Páprica Defumada', '[{"insumo":"Páprica defumada","pct":100}]', 8),
  ('curcuma', 'Açafrão-da-Terra (Cúrcuma)', '[{"insumo":"Cúrcuma","pct":100}]', 9),
  ('alho-em-po', 'Alho em Pó', '[{"insumo":"Alho em pó","pct":100}]', 10),
  ('cebola-em-po', 'Cebola em Pó', '[{"insumo":"Cebola em pó","pct":100}]', 11),
  ('lemon-pepper', 'Lemon Pepper', '[{"insumo":"Lemon pepper","pct":100}]', 12),
  ('pimenta-calabresa', 'Pimenta Calabresa', '[{"insumo":"Pimenta calabresa","pct":100}]', 13),
  ('canela', 'Canela em Pó', '[{"insumo":"Canela em pó","pct":100}]', 14),
  ('tempero-baiano', 'Tempero Baiano', '[{"insumo":"Tempero baiano","pct":100}]', 15);
