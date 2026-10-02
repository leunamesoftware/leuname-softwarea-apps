# Eclud — Euro Club de Descuentos

App de clube de descontos para a Europa: o membro paga uma assinatura mensal
(1,99 €) e ganha descontos em restaurantes, cafeterias, beleza e lazer
parceiros, encontrados por lista ou mapa.

Idioma principal: **espanhol** (pronto para novos idiomas).

Roda no **celular** (Android e iOS) e no **PC** (navegador), com o mesmo
código: no PC o menu vira lateral e o conteúdo fica centralizado.

Stack: **Flutter** + **Riverpod** + **go_router** + **flutter_map** no app;
**Cloudflare Workers + D1** na API (pasta `backend/`).

## Status

Prontos: as 8 telas do projeto, cadastro/login, perfil (com exclusão de
conta), acesso de visitante para explorar, painel do lojista e a API.

Também prontos: páginas de Termos e Privacidade (`web/legal/`, com campos
`[ ]` da empresa a completar) e painel de administração para cadastrar e
aprovar estabelecimentos (localização marcada no mapa).

Falta: pagamento da assinatura.

## Modo demonstração x API real

- Sem `API_URL`: dados de demonstração, sem servidor. Qualquer e-mail
  entra; e-mail que comece com `comercio` entra como lojista e com `admin`,
  como administrador. PIN: `1234`.
- Com `--dart-define=API_URL=https://...`: usa a API de verdade.

## Rodar o projeto

```bash
flutter pub get
flutter run            # celular/emulador
flutter run -d chrome  # navegador
flutter test           # testes
```

## Configuração

Tudo que muda por ambiente é passado com `--dart-define`, nunca escrito no
código:

| Variável | Para que serve |
|---|---|
| `MAP_TILE_URL` | Servidor do mapa. O padrão (CARTO) é só para desenvolvimento; em produção use um provedor com plano comercial, ex.: MapTiler. |
| `MAP_ATTRIBUTION` | Crédito exibido no mapa, conforme o provedor escolhido. |
| `API_URL` | Endereço da API. Vazio = modo demonstração. |
| `TERMS_URL` / `PRIVACY_URL` | Páginas de termos e privacidade. |

Exemplo:

```bash
flutter build apk --dart-define=MAP_TILE_URL="https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=SUA_CHAVE" \
  --dart-define=MAP_ATTRIBUTION="MapTiler · OpenStreetMap"
```

## Estrutura

```
lib/
  core/        configuração, tema e formatação (padrão europeu: "1,99 €", "0,8 km")
  data/        modelos e contratos de repositório
  demo/        dados de demonstração (trocados pela API na fase do backend)
  features/    telas por funcionalidade
  l10n/        textos do app (app_es.arb)
  routes/      rotas
  widgets/     componentes reutilizáveis
```

## Decisões importantes

- **Fonte Montserrat empacotada** (licença OFL em `assets/fonts/OFL.txt`):
  o app não baixa fontes do Google em tempo de execução, o que evita enviar
  o IP do usuário a terceiros (RGPD).
- **Localização**: se o usuário negar a permissão, o app continua
  funcionando com o centro padrão da cidade.
- **Visitantes** exploram parceiros e mapa sem conta (a App Store recusa
  apps que exigem conta para o que não precisa); usar desconto exige login.
- **Sessão** guardada no cofre do sistema (Keychain/Keystore).
- **PIN da loja** só existe como hash no servidor; 5 erros bloqueiam 15 min.
- **Pagamento**: a assinatura é vendida só pela Google Play, que recolhe o IVA
  europeu (a empresa é brasileira, sem registro de IVA na UE). Venda pelo
  site, se um dia fizer sentido, via Paddle/Lemon Squeezy (cuidam do IVA).
- **RGPD**: empresa de fora da UE normalmente precisa de representante na UE
  (art. 27); campo previsto na Política de privacidade.

## Publicação automática

A esteira `.github/workflows/eclud-deploy.yml` testa tudo e publica:

- API → Worker `eclud-api` (banco `eclud-db`, Europa Ocidental)
- Site (versão PC) → Cloudflare Pages `eclud` (`eclud.pages.dev`)

Precisa, uma vez, dos secrets do repositório `CLOUDFLARE_API_TOKEN` (token
com permissão de Workers, D1 e Pages) e `CLOUDFLARE_ACCOUNT_ID`.

Primeiro administrador: crie a conta no app e rode uma vez
`UPDATE users SET role = 'admin' WHERE email = '<seu e-mail>'` no `eclud-db`.
