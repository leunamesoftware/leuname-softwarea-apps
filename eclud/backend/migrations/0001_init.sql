-- Eclud: esquema inicial (Cloudflare D1 / SQLite).
-- Datas em ISO 8601 (UTC). Valores em euros guardados em centavos (INTEGER)
-- para nunca ter erro de arredondamento.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('member', 'merchant', 'admin')),
  -- Aceite dos termos e da política de privacidade (prova exigida pelo RGPD).
  terms_accepted_at TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Assinatura do membro. Preenchida pelos webhooks do Stripe / Google Play /
-- App Store; o app nunca escreve aqui diretamente.
CREATE TABLE subscriptions (
  user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  provider           TEXT NOT NULL CHECK (provider IN ('stripe', 'google_play', 'app_store', 'manual')),
  external_id        TEXT,
  status             TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled')),
  current_period_end TEXT NOT NULL,
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE merchants (
  id               TEXT PRIMARY KEY,
  owner_user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL CHECK (category IN ('food', 'cafe', 'beauty', 'leisure')),
  price_level      INTEGER NOT NULL CHECK (price_level BETWEEN 1 AND 3),
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 5 AND 50),
  discount_rule    TEXT,
  address          TEXT NOT NULL,
  city             TEXT NOT NULL,
  country          TEXT NOT NULL,
  lat              REAL NOT NULL,
  lng              REAL NOT NULL,
  menu_url         TEXT,
  image_url        TEXT,
  -- PIN guardado só como hash (PBKDF2); nunca em texto puro.
  pin_hash         TEXT NOT NULL,
  -- 'pending' até o administrador aprovar; o lojista pausa com is_active.
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_active        INTEGER NOT NULL DEFAULT 1,
  rating           REAL,
  review_count     INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_merchants_visible ON merchants (status, is_active);
CREATE INDEX idx_merchants_owner ON merchants (owner_user_id);

CREATE TABLE redemptions (
  id               TEXT PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,
  user_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
  merchant_id      TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  discount_percent INTEGER NOT NULL,
  -- Valor pago já com desconto, em centavos; o cliente informa depois.
  amount_paid_cents INTEGER CHECK (amount_paid_cents > 0),
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_redemptions_user ON redemptions (user_id, created_at);
CREATE INDEX idx_redemptions_merchant ON redemptions (merchant_id, created_at);

-- Limite de tentativas (PIN e login): chave livre, ex. "pin:<user>:<merchant>".
CREATE TABLE attempt_limits (
  key          TEXT PRIMARY KEY,
  failures     INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT
);
