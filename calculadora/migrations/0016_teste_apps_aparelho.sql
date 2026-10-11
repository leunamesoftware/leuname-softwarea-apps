-- Teste grátis dos apps preso ao aparelho e à rede (em hash), não só ao e-mail:
-- trocar de e-mail no mesmo aparelho não dá outro teste do mesmo app.
ALTER TABLE testes_apps ADD COLUMN aparelho TEXT;
ALTER TABLE testes_apps ADD COLUMN rede TEXT;
CREATE INDEX IF NOT EXISTS testes_apps_aparelho ON testes_apps (app, aparelho);
CREATE INDEX IF NOT EXISTS testes_apps_rede ON testes_apps (app, rede, inicio);
