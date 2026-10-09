-- LeuPede (app de pedidos dos clientes): a loja aparece no app e recebe pedidos para aceitar ou recusar.
ALTER TABLE empresas ADD COLUMN slug TEXT;                               -- endereço da loja no app (/pedir/<slug>)
CREATE UNIQUE INDEX empresas_slug ON empresas(slug);
ALTER TABLE empresas ADD COLUMN no_app INTEGER NOT NULL DEFAULT 0;       -- aparece no app
ALTER TABLE empresas ADD COLUMN aceitando INTEGER NOT NULL DEFAULT 1;    -- aberta para pedidos agora
ALTER TABLE empresas ADD COLUMN tipo_loja TEXT NOT NULL DEFAULT 'lanches';
ALTER TABLE empresas ADD COLUMN descricao TEXT;
ALTER TABLE empresas ADD COLUMN logo_id TEXT;
ALTER TABLE empresas ADD COLUMN capa_id TEXT;
ALTER TABLE empresas ADD COLUMN tempo_entrega TEXT;
ALTER TABLE empresas ADD COLUMN pedido_minimo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE empresas ADD COLUMN faz_entrega INTEGER NOT NULL DEFAULT 1;
ALTER TABLE empresas ADD COLUMN faz_retirada INTEGER NOT NULL DEFAULT 1;
ALTER TABLE empresas ADD COLUMN lat REAL;
ALTER TABLE empresas ADD COLUMN lng REAL;
ALTER TABLE empresas ADD COLUMN raio_km REAL NOT NULL DEFAULT 8;

CREATE TABLE pedidos_online (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  token TEXT NOT NULL UNIQUE,                 -- link de acompanhamento do cliente
  chave TEXT NOT NULL,                        -- evita pedido duplicado (toque duplo)
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando','aceito','recusado')),
  nome TEXT NOT NULL, telefone TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrega','balcao')), endereco TEXT,
  forma TEXT NOT NULL, troco_para INTEGER, observacao TEXT,
  itens TEXT NOT NULL,                        -- escolhas do cliente (JSON)
  resumo TEXT NOT NULL,                       -- itens calculados para mostrar (JSON)
  subtotal INTEGER NOT NULL, taxa_entrega INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL,
  motivo_recusa TEXT, venda_id TEXT, ip TEXT,
  criado_em TEXT NOT NULL, respondido_em TEXT,
  UNIQUE (empresa_id, chave)
);
CREATE INDEX pedidos_online_empresa ON pedidos_online(empresa_id, status, criado_em);
CREATE INDEX pedidos_online_ip ON pedidos_online(ip, criado_em);
