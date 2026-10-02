# Eclud API (Cloudflare Workers + D1)

API do app Eclud. Roda na Cloudflare (servidores na Europa; o plano gratuito
cobre o início) com banco D1 (SQLite).

## Rotas

| Método | Rota | Acesso | Para quê |
|---|---|---|---|
| GET | `/health` | público | verificação |
| POST | `/auth/register` | público | cadastro `{ name, email, password, acceptTerms }` |
| POST | `/auth/login` | público | login (bloqueia 15 min após 5 erros) |
| GET | `/me` | logado | perfil + assinatura |
| DELETE | `/me` | logado | apagar conta (RGPD) |
| GET | `/partners` | público | parceiros aprovados e ativos |
| POST | `/redemptions` | logado | resgate `{ merchantId, pin }` (PIN conferido só aqui) |
| GET | `/me/redemptions` | logado | histórico do mês (`?month=AAAA-MM`) |
| PATCH | `/me/redemptions/:code` | logado | valor pago `{ amountPaid }` |
| GET | `/merchant/dashboard` | lojista | números do mês e últimos 30 dias |
| PUT | `/merchant/settings` | lojista | desconto, regra, carta, PIN, pausar |

Erros sempre como `{ "error": "<código>" }`; o app traduz o código.

## Desenvolvimento

```bash
npm install
printf 'JWT_SECRET=dev-secret\nENVIRONMENT=development\n' > .dev.vars
npm run migrate:local
npm run dev          # http://localhost:8787
npm test             # testes de integração no runtime do Workers
```

Para o app usar esta API:

```bash
cd ..   # pasta eclud
flutter run -d chrome --dart-define=API_URL=http://localhost:8787
```

## Publicar (uma vez)

```bash
npx wrangler d1 create eclud-db          # cole o database_id no wrangler.toml
npm run migrate:remote
npx wrangler secret put JWT_SECRET       # valor longo e aleatório: openssl rand -base64 48
npx wrangler deploy
```

Ajuste em `wrangler.toml`:

- `ALLOWED_ORIGINS`: domínio(s) da versão web (PC).
- `REQUIRE_SUBSCRIPTION`: `"true"` quando o pagamento estiver integrado.

## Cadastrar um estabelecimento (até existir o painel de administração)

```bash
node scripts/hash-secret.mjs 1234   # gera o hash do PIN da loja
npx wrangler d1 execute eclud-db --remote --command "INSERT INTO merchants
  (id, owner_user_id, name, category, price_level, discount_percent, address,
   city, country, lat, lng, pin_hash, status)
  VALUES ('<uuid>', '<id do usuário lojista>', 'Nombre', 'food', 2, 15,
   'Calle ...', 'Madrid', 'España', 40.41, -3.70, '<hash>', 'approved')"
npx wrangler d1 execute eclud-db --remote --command \
  "UPDATE users SET role = 'merchant' WHERE id = '<id do usuário lojista>'"
```
