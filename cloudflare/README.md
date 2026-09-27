# LeuPlace API (Cloudflare Workers + D1 + R2)

Backend do LeuPlace: uma API própria (não é mais Firebase) rodando em
Cloudflare Workers, com Cloudflare D1 (banco SQL) e R2 (fotos).

## Por que existe este backend próprio

O app foi inicialmente construído sobre Firebase, mas o LeuName Softwares já
opera tudo na Cloudflare — então o Firestore/Firebase Auth/Storage foram
substituídos por esta API (Workers) + D1 + R2, mantendo as mesmas telas do
app (só a camada que fala com o banco mudou).

## Status

✅ Banco D1 `leuplace-db` criado, com todas as tabelas e as 12 categorias
já cadastradas.
✅ Bucket R2 `leuplace-files` criado.
⬜ Segredo do JWT ainda não configurado.
⬜ Primeiro deploy do Worker ainda não feito.

## O que falta (uma vez só, manual)

```bash
cd cloudflare
npm install

# Define o segredo do JWT (autenticação) — gere um valor aleatório longo,
# ex.: openssl rand -base64 48
npx wrangler secret put JWT_SECRET

# Primeiro deploy manual (depois disso, a esteira assume)
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
