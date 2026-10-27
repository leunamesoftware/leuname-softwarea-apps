-- Cotação da Ceasa-RJ de 2026-10-27 (boletim enviado pelo dono): preços de partida; ele troca a variedade ou o preço na aba se quiser.
UPDATE ceasa_produtos SET preco_caixa = 210, caixa_kg = 20, tabela_em = '2026-10-27' WHERE id = 'tomate-seco-desidratado';
INSERT INTO ceasa_historico (produto_id, data, tipo, preco, kg_unidade, preco_kg, preco_min, preco_max, var12, linha, criado_em) VALUES ('tomate-seco-desidratado', '2026-10-27', 'tabela', 210, 20, 10.5, 200, 220, 81.48, 'TOMATE ITALIANO Cx 20 kg 81,48% 200,00 210,00 220,00', '2026-10-27T14:00:00.000Z');
UPDATE ceasa_produtos SET preco_caixa = 120, caixa_kg = 20, tabela_em = '2026-10-27' WHERE id = 'cebola-desidratada-em-flocos';
INSERT INTO ceasa_historico (produto_id, data, tipo, preco, kg_unidade, preco_kg, preco_min, preco_max, var12, linha, criado_em) VALUES ('cebola-desidratada-em-flocos', '2026-10-27', 'tabela', 120, 20, 6.0, 110, 130, 145.85, 'CEBOLA NACIONAL Branca Sc 20 kg 145,85% 110,00 120,00 130,00', '2026-10-27T14:00:00.000Z');
UPDATE ceasa_produtos SET preco_caixa = 190, caixa_kg = 10, tabela_em = '2026-10-27' WHERE id = 'alho-desidratado-em-flocos';
INSERT INTO ceasa_historico (produto_id, data, tipo, preco, kg_unidade, preco_kg, preco_min, preco_max, var12, linha, criado_em) VALUES ('alho-desidratado-em-flocos', '2026-10-27', 'tabela', 190, 10, 19.0, 180, 200, -20.36, 'ALHO IMPORTADO Branco Cx 10 kg -20,36% 180,00 190,00 200,00', '2026-10-27T14:00:00.000Z');
UPDATE ceasa_produtos SET preco_caixa = 90, caixa_kg = 10, tabela_em = '2026-10-27' WHERE id = 'pimentao-desidratado';
INSERT INTO ceasa_historico (produto_id, data, tipo, preco, kg_unidade, preco_kg, preco_min, preco_max, var12, linha, criado_em) VALUES ('pimentao-desidratado', '2026-10-27', 'tabela', 90, 10, 9.0, 80, 100, 62.93, 'PIMENTÃO VERDE Extra A Cx 10 kg 62,93% 80,00 90,00 100,00', '2026-10-27T14:00:00.000Z');
UPDATE ceasa_produtos SET preco_caixa = 50, caixa_kg = 20, tabela_em = '2026-10-27' WHERE id = 'banana-desidratada';
INSERT INTO ceasa_historico (produto_id, data, tipo, preco, kg_unidade, preco_kg, preco_min, preco_max, var12, linha, criado_em) VALUES ('banana-desidratada', '2026-10-27', 'tabela', 50, 20, 2.5, 40, 60, -25, 'BANANA NANICA/D’ÁGUA Extra Cx 20 kg -25,00% 40,00 50,00 60,00', '2026-10-27T14:00:00.000Z');
UPDATE ceasa_produtos SET preco_caixa = 125, caixa_kg = 18, tabela_em = '2026-10-27' WHERE id = 'maca-desidratada';
INSERT INTO ceasa_historico (produto_id, data, tipo, preco, kg_unidade, preco_kg, preco_min, preco_max, var12, linha, criado_em) VALUES ('maca-desidratada', '2026-10-27', 'tabela', 125, 18, 6.94, 120, 130, -35.02, 'MAÇÃ IMPORTADA Fuji Cx 18 kg -35,02% 120,00 125,00 130,00', '2026-10-27T14:00:00.000Z');

-- Preços de venda que o dono escolheu para 200 g na Shopee e os concorrentes que ele mostrou (prints de 27/10/2026).
UPDATE ceasa_produtos SET preco_venda = 17.9, gramas_venda = 200 WHERE id = 'tomate-seco-desidratado';
UPDATE ceasa_produtos SET preco_venda = 14.9, gramas_venda = 200 WHERE id = 'cebola-desidratada-em-flocos';
INSERT INTO ceasa_concorrentes (produto_id, loja, gramas, preco, vendidos, criado_em) VALUES
  ('tomate-seco-desidratado', 'Relva Verde (flocos)', 200, 19.02, 156, '2026-10-27T14:00:00.000Z'),
  ('tomate-seco-desidratado', 'Tomate desidratado em flocos', 250, 29.90, 134, '2026-10-27T14:00:00.000Z'),
  ('tomate-seco-desidratado', 'Tomate seco (loja)', 250, 21.98, NULL, '2026-10-27T14:00:00.000Z'),
  ('tomate-seco-desidratado', 'Tomate seco 300 g', 300, 25.90, 14, '2026-10-27T14:00:00.000Z'),
  ('tomate-seco-desidratado', 'Armazém Real premium', 500, 31.92, 4, '2026-10-27T14:00:00.000Z'),
  ('cebola-desidratada-em-flocos', 'Sauce', 200, 14.64, 3, '2026-10-27T14:00:00.000Z'),
  ('cebola-desidratada-em-flocos', 'Cebola em flocos (ES)', 200, 21.23, NULL, '2026-10-27T14:00:00.000Z');
