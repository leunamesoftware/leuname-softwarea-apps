-- ERP completo: envio (etiquetas), financeiro, compras de matéria-prima, estoque de matéria-prima e dados da empresa.

-- Pedidos: entrega, envio e o que a Shopee realmente pagou
ALTER TABLE pedidos ADD COLUMN destinatario TEXT;     -- JSON {nome, telefone, endereco, cidade, uf, cep}
ALTER TABLE pedidos ADD COLUMN transportadora TEXT;
ALTER TABLE pedidos ADD COLUMN rastreio TEXT;
ALTER TABLE pedidos ADD COLUMN envio TEXT;            -- 'a_preparar' | 'pronto' | 'etiqueta_impressa' | 'enviado'
ALTER TABLE pedidos ADD COLUMN prazo_envio TEXT;
ALTER TABLE pedidos ADD COLUMN liquido REAL;          -- o que a Shopee repassa (depois de taxas e frete)
ALTER TABLE pedidos ADD COLUMN frete REAL;
ALTER TABLE pedidos ADD COLUMN obs TEXT;
ALTER TABLE pedidos ADD COLUMN pagamento TEXT;        -- venda fora da Shopee: pix, dinheiro, cartão…

-- Matéria-prima em estoque (kg pronto)
ALTER TABLE insumos ADD COLUMN estoque_kg REAL NOT NULL DEFAULT 0;
ALTER TABLE insumos ADD COLUMN minimo_kg REAL NOT NULL DEFAULT 1;

CREATE TABLE compras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  insumo TEXT,                         -- nulo = compra que não é matéria-prima (embalagem, etiqueta…)
  descricao TEXT NOT NULL,
  fornecedor TEXT,
  valor REAL NOT NULL,
  comprado_kg REAL,
  rendeu_kg REAL,
  data TEXT NOT NULL,
  criado_em TEXT NOT NULL
);

-- Financeiro: tudo o que entra e sai
CREATE TABLE lancamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,                  -- 'entrada' | 'saida'
  categoria TEXT NOT NULL,             -- 'Vendas Shopee', 'Vendas diretas', 'Matéria-prima', 'Embalagem', 'Frete', 'Impostos', 'Contas fixas', 'Outros'
  descricao TEXT NOT NULL,
  valor REAL NOT NULL,
  vencimento TEXT NOT NULL,            -- data (AAAA-MM-DD)
  pago INTEGER NOT NULL DEFAULT 1,     -- 0 = a pagar/receber
  pedido_id TEXT,
  compra_id INTEGER,
  criado_em TEXT NOT NULL
);
CREATE INDEX lancamentos_data ON lancamentos (vencimento);
CREATE UNIQUE INDEX lancamentos_pedido ON lancamentos (pedido_id) WHERE pedido_id IS NOT NULL;

-- Dados da empresa (remetente das etiquetas e da declaração de conteúdo)
INSERT INTO shopee (chave, valor) VALUES
  ('empresa_nome', 'SUPER MISTO TEMPEROS LTDA'),
  ('empresa_cnpj', '13.580.397/0001-80'),
  ('empresa_endereco', 'Estrada de Xerém, 484 - Xerém'),
  ('empresa_cidade', 'Duque de Caxias'),
  ('empresa_uf', 'RJ'),
  ('empresa_cep', ''),
  ('empresa_telefone', '(24) 99872-1557');
