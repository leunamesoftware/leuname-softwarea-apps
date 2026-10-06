-- Teste grátis dos outros apps da LeuApps (Gestacell, Radar): um por conta em cada app.
CREATE TABLE IF NOT EXISTS testes_apps (
  conta_id TEXT NOT NULL,
  app TEXT NOT NULL,
  inicio TEXT NOT NULL,
  PRIMARY KEY (conta_id, app)
);
