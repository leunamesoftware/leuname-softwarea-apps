-- Teste grátis único: guarda de onde a conta começou o teste (aparelho e rede, em hash) para
-- impedir que a mesma pessoa crie várias contas só para repetir o teste.
ALTER TABLE contas ADD COLUMN teste_aparelho TEXT;
ALTER TABLE contas ADD COLUMN teste_rede TEXT;
ALTER TABLE contas ADD COLUMN sem_teste INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS contas_teste_aparelho ON contas (teste_aparelho);
CREATE INDEX IF NOT EXISTS contas_teste_rede ON contas (teste_rede, criado_em);
