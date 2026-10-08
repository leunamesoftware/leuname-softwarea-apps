-- Trava de aparelhos: cada conta usa 1 celular + 1 computador ao mesmo tempo.
-- Entrar num aparelho novo do mesmo tipo desconecta o anterior (substituida_em) e avisa por e-mail.
ALTER TABLE sessoes ADD COLUMN tipo TEXT;
ALTER TABLE sessoes ADD COLUMN aparelho TEXT;
ALTER TABLE sessoes ADD COLUMN substituida_em TEXT;
CREATE INDEX IF NOT EXISTS sessoes_conta_tipo ON sessoes (conta_id, tipo);
