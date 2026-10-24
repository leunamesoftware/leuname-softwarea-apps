-- Embalagens mais perto do mercado (só troca se o dono ainda não mexeu).
UPDATE config SET valor = 0.25 WHERE chave = 'emb_sache' AND valor = 0.35;
UPDATE config SET valor = 0.15 WHERE chave = 'emb_50' AND valor = 0.8;
UPDATE config SET valor = 0.20 WHERE chave = 'emb_100' AND valor = 1;
UPDATE config SET valor = 0.05 WHERE chave = 'etiqueta' AND valor = 0.1;
UPDATE config SET valor = 0.30 WHERE chave = 'emb_kit' AND valor = 0.5;
