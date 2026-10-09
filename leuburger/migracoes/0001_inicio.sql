-- LeuBurger PDV: estrutura inicial. Valores em centavos (inteiros). Datas em ISO (UTC).
-- Toda tabela de dados tem empresa_id: cada lanchonete só enxerga o que é dela.

CREATE TABLE empresas (
  id TEXT PRIMARY KEY,
  conta_email TEXT NOT NULL UNIQUE,         -- conta LeuApps do dono (quem comprou)
  nome TEXT NOT NULL,
  cnpj TEXT, telefone TEXT, endereco TEXT, cidade TEXT, uf TEXT,
  mensagem_cupom TEXT,
  formas_pagamento TEXT NOT NULL DEFAULT '["dinheiro","pix","debito","credito"]',
  desconto_max_caixa INTEGER NOT NULL DEFAULT 10, -- % de desconto que o caixa pode dar sem gerente
  largura_cupom TEXT NOT NULL DEFAULT '80',
  acesso_ate TEXT,                          -- validade do acesso (teste/mensal); NULL = vitalício
  proximo_numero INTEGER NOT NULL DEFAULT 1001,
  criado_em TEXT NOT NULL
);

CREATE TABLE usuarios (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  nome TEXT NOT NULL,
  login TEXT NOT NULL UNIQUE,               -- e-mail ou usuário (único no sistema todo)
  senha_hash TEXT, senha_sal TEXT,          -- o dono entra pela conta LeuApps (sem senha local)
  papel TEXT NOT NULL CHECK (papel IN ('admin','gerente','caixa')),
  dono INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL
);
CREATE INDEX usuarios_empresa ON usuarios(empresa_id);

CREATE TABLE sessoes (
  token_hash TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  expira_em TEXT NOT NULL,
  criado_em TEXT NOT NULL
);
CREATE INDEX sessoes_usuario ON sessoes(usuario_id);

CREATE TABLE tentativas (chave TEXT PRIMARY KEY, qtd INTEGER NOT NULL, desde TEXT NOT NULL);

CREATE TABLE categorias (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  nome TEXT NOT NULL,
  icone TEXT NOT NULL DEFAULT 'hamburguer',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX categorias_empresa ON categorias(empresa_id);

-- Itens de estoque: insumos (pão, carne) e produtos de revenda (refrigerante).
CREATE TABLE estoque_itens (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  nome TEXT NOT NULL,
  categoria TEXT,
  unidade TEXT NOT NULL DEFAULT 'un',       -- un, kg, l
  qtd REAL NOT NULL DEFAULT 0,
  minimo REAL NOT NULL DEFAULT 0,
  custo INTEGER NOT NULL DEFAULT 0,         -- custo por unidade (centavos)
  ultima_entrada TEXT, ultima_saida TEXT,
  ativo INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX estoque_empresa ON estoque_itens(empresa_id);

CREATE TABLE produtos (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  categoria_id TEXT REFERENCES categorias(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  codigo TEXT,
  preco INTEGER NOT NULL CHECK (preco >= 0),
  custo INTEGER NOT NULL DEFAULT 0 CHECK (custo >= 0),
  foto_id TEXT,
  -- Opções de personalização (JSON): tamanhos [{nome,preco}], adicionais [{nome,preco}], retirar [nome]
  opcoes TEXT NOT NULL DEFAULT '{}',
  -- Baixa de estoque (JSON): [{item_id, qtd}] por unidade vendida
  receita TEXT NOT NULL DEFAULT '[]',
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL
);
CREATE INDEX produtos_empresa ON produtos(empresa_id);

CREATE TABLE fotos (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  tipo TEXT NOT NULL,
  dados BLOB NOT NULL
);

CREATE TABLE clientes (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  nome TEXT NOT NULL,
  telefone TEXT, cpf TEXT, endereco TEXT, observacao TEXT,
  criado_em TEXT NOT NULL
);
CREATE INDEX clientes_empresa ON clientes(empresa_id);

CREATE TABLE caixas (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  aberto_por TEXT NOT NULL REFERENCES usuarios(id),
  aberto_em TEXT NOT NULL,
  fundo INTEGER NOT NULL DEFAULT 0,
  fechado_por TEXT REFERENCES usuarios(id),
  fechado_em TEXT,
  contado INTEGER, esperado INTEGER
);
CREATE INDEX caixas_empresa ON caixas(empresa_id, fechado_em);

CREATE TABLE caixa_movimentos (
  id TEXT PRIMARY KEY,
  caixa_id TEXT NOT NULL REFERENCES caixas(id),
  empresa_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('sangria','suprimento')),
  valor INTEGER NOT NULL CHECK (valor > 0),
  motivo TEXT,
  usuario_id TEXT NOT NULL,
  criado_em TEXT NOT NULL
);

CREATE TABLE vendas (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  numero INTEGER NOT NULL,
  chave TEXT NOT NULL,                      -- chave de envio: evita venda duplicada no clique duplo
  caixa_id TEXT REFERENCES caixas(id),
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  cliente_id TEXT REFERENCES clientes(id),
  observacao TEXT,
  subtotal INTEGER NOT NULL, desconto INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL,
  troco INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'concluida' CHECK (status IN ('concluida','cancelada')),
  cancelada_em TEXT, cancelada_por TEXT, motivo_cancelamento TEXT,
  criado_em TEXT NOT NULL,
  UNIQUE (empresa_id, chave),
  UNIQUE (empresa_id, numero)
);
CREATE INDEX vendas_empresa_data ON vendas(empresa_id, criado_em);

CREATE TABLE venda_itens (
  id TEXT PRIMARY KEY,
  venda_id TEXT NOT NULL REFERENCES vendas(id),
  produto_id TEXT,
  nome TEXT NOT NULL,
  categoria TEXT,
  qtd INTEGER NOT NULL CHECK (qtd > 0),
  preco_unit INTEGER NOT NULL,              -- já com tamanho e adicionais
  custo_unit INTEGER NOT NULL DEFAULT 0,
  detalhes TEXT NOT NULL DEFAULT '{}',      -- tamanho, adicionais, retirar, observação
  total INTEGER NOT NULL
);
CREATE INDEX venda_itens_venda ON venda_itens(venda_id);

CREATE TABLE pagamentos (
  id TEXT PRIMARY KEY,
  venda_id TEXT NOT NULL REFERENCES vendas(id),
  forma TEXT NOT NULL,
  valor INTEGER NOT NULL CHECK (valor > 0)
);
CREATE INDEX pagamentos_venda ON pagamentos(venda_id);

CREATE TABLE estoque_movimentos (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES estoque_itens(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','venda','cancelamento','perda','ajuste')),
  qtd REAL NOT NULL,
  custo INTEGER,
  ref TEXT, motivo TEXT,
  usuario_id TEXT,
  criado_em TEXT NOT NULL
);
CREATE INDEX estoque_mov_item ON estoque_movimentos(item_id, criado_em);

-- Histórico das operações importantes (quem fez o quê).
CREATE TABLE auditoria (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL,
  usuario_id TEXT,
  acao TEXT NOT NULL,
  detalhe TEXT,
  criado_em TEXT NOT NULL
);
CREATE INDEX auditoria_empresa ON auditoria(empresa_id, criado_em);
