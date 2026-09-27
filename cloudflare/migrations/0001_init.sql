-- LeuPlace — esquema inicial (Cloudflare D1).
-- Este arquivo é aplicado pela esteira (GitHub Actions), nunca manualmente
-- em produção sem passar por commit — mantém tudo revisável no histórico.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  phone TEXT,
  photo_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  ad_credits INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS subcategories (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  title_lower TEXT NOT NULL,
  description TEXT NOT NULL,
  price REAL NOT NULL,
  image_urls TEXT NOT NULL DEFAULT '[]',
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  condition TEXT NOT NULL DEFAULT 'usado',
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  delivery_option TEXT NOT NULL DEFAULT 'pickupOnly',
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_status_created ON products(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(status, category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_title ON products(status, title_lower);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  listed_price REAL NOT NULL,
  agreed_price REAL NOT NULL,
  validation TEXT NOT NULL DEFAULT 'declarada',
  sold_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  last_message TEXT NOT NULL DEFAULT '',
  last_message_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chats_buyer ON chats(buyer_id);
CREATE INDEX IF NOT EXISTS idx_chats_seller ON chats(seller_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id),
  sender_id TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, sent_at);

CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  product_id TEXT,
  target_user_id TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id, created_at DESC);
