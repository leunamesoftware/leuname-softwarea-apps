-- Assinatura da Google Play, recuperação de senha, avaliações e horários.

-- O token de compra da Play é único: uma compra nunca vale para duas contas.
CREATE UNIQUE INDEX idx_subscriptions_external ON subscriptions (provider, external_id);

-- Código de 6 dígitos enviado por e-mail (guardado só como hash).
CREATE TABLE password_resets (
  email       TEXT PRIMARY KEY COLLATE NOCASE,
  code_hash   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0
);

-- Só quem usou o desconto no estabelecimento pode avaliar (uma vez, editável).
CREATE TABLE reviews (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, merchant_id)
);
CREATE INDEX idx_reviews_merchant ON reviews (merchant_id, created_at);

-- Horário semanal em JSON: {"1":[["13:00","16:00"],["20:00","23:30"]], ...}
-- (1 = segunda ... 7 = domingo; dia ausente = fechado).
ALTER TABLE merchants ADD COLUMN opening_hours TEXT;
