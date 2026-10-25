-- ERP Supermisto: produtos à venda (SKUs), estoque, pedidos e ligação com a Shopee.
-- Cada SKU é o que o cliente compra: um sabor num tamanho (COLORAU-50G) ou um kit (KIT15-10G).
CREATE TABLE skus (
  id TEXT PRIMARY KEY,                -- código do SKU (o mesmo vai no campo "SKU" da Shopee)
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,                 -- 'avulso' | 'kit'
  sabores TEXT NOT NULL,              -- JSON com os ids dos produtos (sabores) que vão dentro
  unidades INTEGER NOT NULL,          -- quantos pacotinhos (1 no avulso)
  gramas INTEGER NOT NULL,            -- gramas de cada pacotinho
  preco REAL,                         -- preço de venda (nulo = ainda não definido)
  estoque INTEGER NOT NULL DEFAULT 0,
  estoque_min INTEGER NOT NULL DEFAULT 5,
  foto TEXT,                          -- chave da foto principal no R2
  fotos TEXT,                         -- JSON com as chaves das outras fotos
  ativo INTEGER NOT NULL DEFAULT 1,
  ordem INTEGER NOT NULL DEFAULT 0,
  shopee_item_id INTEGER,             -- anúncio na Shopee
  shopee_model_id INTEGER,            -- variação no anúncio (0 = sem variação)
  shopee_preco REAL,                  -- último preço confirmado na Shopee
  shopee_estoque INTEGER,             -- último estoque confirmado na Shopee
  sync TEXT,                          -- o que falta mandar: JSON {"preco":1,"estoque":1,"fotos":1}
  sync_erro TEXT,
  atualizado_em TEXT
);
CREATE INDEX skus_shopee ON skus (shopee_item_id);

CREATE TABLE movimentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku_id TEXT NOT NULL,
  qtd INTEGER NOT NULL,               -- + entrada, − saída
  motivo TEXT NOT NULL,               -- 'producao' | 'venda' | 'ajuste' | 'cancelamento'
  pedido_id TEXT,
  obs TEXT,
  criado_em TEXT NOT NULL
);
CREATE INDEX movimentos_sku ON movimentos (sku_id, criado_em);

CREATE TABLE pedidos (
  id TEXT PRIMARY KEY,                -- número do pedido na Shopee (order_sn) ou M-<n> manual
  origem TEXT NOT NULL,               -- 'shopee' | 'manual'
  status TEXT NOT NULL,
  cliente TEXT,
  total REAL NOT NULL DEFAULT 0,
  itens TEXT NOT NULL,                -- JSON [{sku, nome, qtd, preco}]
  baixado INTEGER NOT NULL DEFAULT 0, -- 1 = já tirou do estoque
  criado_em TEXT NOT NULL,
  atualizado_em TEXT
);
CREATE INDEX pedidos_data ON pedidos (criado_em);

-- Ligação com a loja da Shopee (tokens) e opções: {chave, valor}
CREATE TABLE shopee (chave TEXT PRIMARY KEY, valor TEXT);

CREATE TABLE registro (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,                 -- 'shopee' | 'estoque' | 'preco' | 'foto' | 'pedido'
  texto TEXT NOT NULL,
  ok INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL
);

-- SKUs iniciais: 15 sabores em 50 g, 100 g e 1 kg (o 10 g sozinho não paga a taxa fixa da Shopee: só em kit)
INSERT INTO skus (id, nome, tipo, sabores, unidades, gramas, foto, ordem)
SELECT upper(replace(p.id, '-', '')) || '-' || t.sufixo, p.nome || ' ' || t.rotulo, 'avulso', '["' || p.id || '"]', 1, t.g,
       'avulso-' || p.id || '-' || lower(t.sufixo) || '.jpg', p.ordem * 10 + t.o
FROM produtos p, (SELECT 50 AS g, '50G' AS sufixo, '50 g' AS rotulo, 1 AS o UNION ALL SELECT 100, '100G', '100 g', 2 UNION ALL SELECT 1000, '1KG', '1 kg', 3) t
WHERE p.id != 'sortido';

-- Kits em 10 g, 50 g e 100 g
INSERT INTO skus (id, nome, tipo, sabores, unidades, gramas, foto, ordem)
SELECT k.cod || '-' || t.sufixo, k.nome || ' ' || t.rotulo, 'kit', k.sabores, k.n, t.g, 'kit-' || k.foto || '-' || lower(t.sufixo) || '.jpg', 1000 + k.o * 10 + t.o
FROM (
  SELECT 'KIT15' AS cod, 'Kit 15 Temperos' AS nome, 'completo' AS foto, 15 AS n, 1 AS o,
    '["colorau","tempero-completo","pimenta-do-reino","cominho","chimichurri","oregano","paprica-doce","curcuma","alho-em-po","cebola-em-po","paprica-defumada","lemon-pepper","pimenta-calabresa","tempero-baiano","canela"]' AS sabores
  UNION ALL SELECT 'KIT10', 'Kit 10 Temperos', 'dia-a-dia', 10, 2,
    '["colorau","tempero-completo","pimenta-do-reino","cominho","chimichurri","oregano","paprica-doce","curcuma","alho-em-po","cebola-em-po"]'
  UNION ALL SELECT 'KIT5ESP', 'Kit 5 Temperos Especiais', 'especiais', 5, 3,
    '["paprica-defumada","lemon-pepper","pimenta-calabresa","tempero-baiano","canela"]'
  UNION ALL SELECT 'KITCHURRASCO', 'Kit Churrasco', 'churrasco', 5, 4,
    '["chimichurri","paprica-defumada","pimenta-do-reino","pimenta-calabresa","alho-em-po"]'
) k, (SELECT 10 AS g, '10G' AS sufixo, '(sachês de 10 g)' AS rotulo, 1 AS o UNION ALL SELECT 50, '50G', '(pacotes de 50 g)', 2 UNION ALL SELECT 100, '100G', '(pacotes de 100 g)', 3) t;

-- O Kit 15 de 10 g já está à venda na Shopee por R$ 29,90
UPDATE skus SET preco = 29.9 WHERE id = 'KIT15-10G';
UPDATE skus SET atualizado_em = datetime('now');
INSERT INTO shopee (chave, valor) VALUES ('automatico', '1');
