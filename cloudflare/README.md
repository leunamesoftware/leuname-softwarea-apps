# LeuPlace API (Cloudflare Workers + D1 + R2)

Backend do LeuPlace: uma API própria (não é mais Firebase) rodando em
Cloudflare Workers, com Cloudflare D1 (banco SQL) e R2 (fotos).

## Por que existe este backend próprio

O app foi inicialmente construído sobre Firebase, mas o LeuName Softwares já
opera tudo na Cloudflare — então o Firestore/Firebase Auth/Storage foram
substituídos por esta API (Workers) + D1 + R2, mantendo as mesmas telas do
app (só a camada que fala com o banco mudou).

## Configuração inicial (feita UMA VEZ, manualmente, fora da esteira)

Isso precisa da conta Cloudflare de quem administra o LeuName Softwares —
por segurança, não é algo que a esteira automática faz sozinha na primeira
vez:

```bash
cd cloudflare
npm install

# 1. Cria o banco D1 dedicado ao LeuPlace (separado de qualquer outro projeto)
npx wrangler d1 create leuplace-db
# copie o "database_id" retornado para wrangler.toml (campo database_id)

# 2. Cria o bucket de arquivos
npx wrangler r2 bucket create leuplace-files

# 3. Aplica o schema (migrations/)
npx wrangler d1 migrations apply leuplace-db --remote

# 4. Define o segredo do JWT (autenticação)
npx wrangler secret put JWT_SECRET
# (gere um valor aleatório longo, ex.: openssl rand -base64 48)

# 5. Primeiro deploy manual (depois disso, a esteira assume)
npx wrangler deploy
```

## Depois da configuração inicial

Todo `git push` na branch principal builda e publica sozinho via GitHub
Actions (`.github/workflows/preview.yml`), usando os secrets
`CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` do repositório.

## Rotas disponíveis hoje

- `GET /health`
- `GET /categories`
- `POST /auth/register` `{ name, email, password, phone? }`
- `POST /auth/login` `{ email, password }`
- `GET /me` (com `Authorization: Bearer <token>`)

Próximas (mesmo padrão de autenticação): produtos, chat, favoritos,
denúncias, créditos.
