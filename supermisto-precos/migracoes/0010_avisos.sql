-- Avisos no celular com o ERP fechado (Web Push): chave do servidor, aparelhos inscritos e fila dos textos.
CREATE TABLE push_chaves (id TEXT PRIMARY KEY, publica TEXT NOT NULL, privada TEXT NOT NULL, criado_em TEXT NOT NULL);
CREATE TABLE push_inscricoes (endpoint TEXT PRIMARY KEY, criado_em TEXT NOT NULL);
CREATE TABLE push_fila (id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT NOT NULL, titulo TEXT NOT NULL, texto TEXT NOT NULL, url TEXT NOT NULL, criado_em TEXT NOT NULL);
CREATE INDEX push_fila_endpoint ON push_fila (endpoint);
