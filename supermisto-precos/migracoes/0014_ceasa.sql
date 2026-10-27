-- Ceasa × concorrência × lucro: compra de fruta fresca, perda e rendimento até o produto seco/moído, embalagens, kits.
-- Os números de perda e rendimento são estimativas de partida: o dono acerta com o primeiro lote de verdade.

CREATE TABLE ceasa_produtos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  palavras TEXT NOT NULL,            -- palavras que identificam o produto na cotação (separadas por vírgula)
  exclui TEXT NOT NULL DEFAULT '',   -- palavras que descartam a linha (ex.: "poro" para não pegar alho-poró)
  perda_pct REAL NOT NULL,           -- % que se joga fora ao limpar (casca, miolo, cabo)
  rendimento_pct REAL NOT NULL,      -- % que sobra depois de secar/moer, sobre o que ficou limpo
  secagem_kg REAL NOT NULL DEFAULT 0,-- energia e mão de obra para secar 1 kg pronto
  caixa_kg REAL,                     -- peso da caixa/saco da cotação (1 quando a cotação é por kg)
  preco_caixa REAL,                  -- preço da caixa na última cotação
  tabela_em TEXT,
  pago_caixa REAL,                   -- último preço que o dono realmente pagou
  pago_caixa_kg REAL,
  pago_em TEXT,
  gramas_venda INTEGER NOT NULL DEFAULT 200,
  preco_venda REAL,                  -- preço que o dono vai usar na Shopee para o pacote
  ordem INTEGER NOT NULL
);

CREATE TABLE ceasa_historico (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id TEXT NOT NULL,
  data TEXT NOT NULL,
  tipo TEXT NOT NULL,                -- 'tabela' (cotação) | 'compra' (o que o dono pagou)
  preco REAL NOT NULL,
  kg_unidade REAL NOT NULL,
  preco_kg REAL NOT NULL,
  preco_min REAL,                    -- mínimo e máximo do dia na cotação
  preco_max REAL,
  var12 REAL,                        -- variação em 12 meses (%), como vem no boletim
  linha TEXT,
  criado_em TEXT NOT NULL
);
CREATE INDEX ceasa_historico_produto ON ceasa_historico (produto_id, data);

CREATE TABLE ceasa_concorrentes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id TEXT NOT NULL,
  loja TEXT,
  gramas REAL NOT NULL,
  preco REAL NOT NULL,
  vendidos INTEGER,
  criado_em TEXT NOT NULL
);
CREATE INDEX ceasa_concorrentes_produto ON ceasa_concorrentes (produto_id);

-- Embalagens e etiquetas: quanto custou o pacote e quantas unidades vieram (o sistema divide).
CREATE TABLE ceasa_embalagens (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  uso TEXT NOT NULL,                 -- 'pacote' (em cada pacotinho) | 'envio' (pacote vendido sozinho) | 'kit' (uma vez por kit)
  preco REAL,                        -- NULL = ainda não preenchido
  quantidade REAL,
  ordem INTEGER NOT NULL
);

CREATE TABLE ceasa_kits (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  itens TEXT NOT NULL,               -- JSON [{produto_id, gramas}]
  preco REAL,
  vendas_mes INTEGER NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL
);

CREATE TABLE ceasa_config (chave TEXT PRIMARY KEY, valor REAL NOT NULL);
INSERT INTO ceasa_config (chave, valor) VALUES ('extra_pct', 0), ('unidades_mes', 0), ('limite_caro_pct', 10);

INSERT INTO ceasa_produtos (id, nome, palavras, exclui, perda_pct, rendimento_pct, ordem) VALUES
  ('tomate-seco-desidratado', 'Tomate seco', 'tomate', 'cereja,molho,extrato,pasta,sweet', 5, 9, 1),
  ('cebola-desidratada-em-flocos', 'Cebola em flocos', 'cebola', 'verde,cebolinha,conserva', 15, 10, 2),
  ('alho-desidratado-em-flocos', 'Alho em flocos', 'alho', 'poro,porro,porró,poró', 20, 35, 3),
  ('pimentao-desidratado', 'Pimentão em flocos', 'pimentao', '', 15, 8, 4),
  ('banana-desidratada', 'Banana em fatias', 'banana', 'pao,doce,passa', 38, 25, 5),
  ('maca-desidratada', 'Maçã em fatias', 'maca', 'verde,conserva,banana', 15, 12, 6),
  ('cogumelo-shiitake-desidratado', 'Cogumelo shiitake', 'shiitake,shitake', '', 10, 9, 7),
  ('champignon-desidratado', 'Cogumelo champignon', 'champignon,champingnon,cogumelo', 'shiitake,shitake', 5, 9, 8),
  ('mix-de-cogumelos', 'Mix de cogumelos', 'cogumelo', '', 8, 9, 9);

INSERT INTO ceasa_embalagens (id, nome, uso, ordem) VALUES
  ('saquinho', 'Saquinho transparente', 'pacote', 1),
  ('solapa', 'Solapa (cabeçalho de papel)', 'pacote', 2),
  ('etiqueta', 'Etiqueta / rótulo (tabela, lote, validade)', 'pacote', 3),
  ('envio-pacote', 'Envelope ou saco de envio (pacote vendido sozinho)', 'envio', 4),
  ('caixa-kit', 'Caixa do kit', 'kit', 5),
  ('enchimento-kit', 'Fita e enchimento do kit', 'kit', 6);

-- Kit de partida: os 6 desidratados da primeira etapa (frutas, legumes e temperos). Os cogumelos ficam para a última etapa.
INSERT INTO ceasa_kits (id, nome, itens, preco, ordem) VALUES
  ('kit-6-desidratados', 'Kit 6 Desidratados (100 g cada)',
   '[{"produto_id":"tomate-seco-desidratado","gramas":100},{"produto_id":"cebola-desidratada-em-flocos","gramas":100},{"produto_id":"alho-desidratado-em-flocos","gramas":100},{"produto_id":"pimentao-desidratado","gramas":100},{"produto_id":"banana-desidratada","gramas":100},{"produto_id":"maca-desidratada","gramas":100}]',
   NULL, 1);
