-- Tempo de preparo da loja (minutos): o cliente vê a previsão e o atraso.
ALTER TABLE empresas ADD COLUMN tempo_preparo INTEGER NOT NULL DEFAULT 20;
-- Reclamações do cliente para o Pedêê (aparecem no Painel Admin).
CREATE TABLE reclamacoes (
  id TEXT PRIMARY KEY,
  pedido_id TEXT NOT NULL REFERENCES pedidos_online(id),
  empresa_id TEXT NOT NULL,
  texto TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  resolvida_em TEXT
);
CREATE INDEX reclamacoes_criado ON reclamacoes(criado_em);
-- Avisos com o app fechado (Web Push): chave do servidor, quem se inscreveu e a fila de avisos de cada aparelho.
CREATE TABLE push_chaves (id TEXT PRIMARY KEY, publica TEXT NOT NULL, privada TEXT NOT NULL, criado_em TEXT NOT NULL);
CREATE TABLE push_inscricoes (
  endpoint TEXT NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('cliente','loja','entregador')),
  ref TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  PRIMARY KEY (endpoint, papel, ref)
);
CREATE INDEX push_inscricoes_ref ON push_inscricoes(papel, ref);
CREATE TABLE push_fila (id TEXT PRIMARY KEY, endpoint TEXT NOT NULL, titulo TEXT NOT NULL, texto TEXT NOT NULL, url TEXT NOT NULL, criado_em TEXT NOT NULL);
CREATE INDEX push_fila_endpoint ON push_fila(endpoint, criado_em);
