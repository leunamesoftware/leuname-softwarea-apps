-- Rendimento real informado pelos usuários. Sem nome, e-mail, telefone ou chave: só um hash irreversível por receita.
CREATE TABLE rendimentos (
  receita_id TEXT NOT NULL,
  autor TEXT NOT NULL,
  unidades_base REAL NOT NULL,
  peso_unidade_g REAL,
  criado_em TEXT NOT NULL,
  PRIMARY KEY (receita_id, autor)
);

-- Compras pelo Mercado Pago. A chave fica também no banco de licenças (leuname_licencas).
CREATE TABLE pedidos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL,
  pagamento_id TEXT,
  chave TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);
CREATE INDEX pedidos_pagamento ON pedidos (pagamento_id);
