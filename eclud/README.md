# Eclud — Euro Club de Descuentos

App de clube de descontos para a Europa: o membro paga uma assinatura mensal
(1,99 €) e ganha descontos em restaurantes, cafeterias, beleza e lazer
parceiros, encontrados por lista ou mapa.

Idioma principal: **espanhol** (pronto para novos idiomas).

Stack: **Flutter** (Android, iOS e web) + **Riverpod** (estado) +
**go_router** (navegação) + **flutter_map** (mapa).

## Status

Fase 1 em andamento. Telas prontas, com dados de demonstração (sem backend):

1. Boas-vindas (apresentação, preço e acesso)
2. Início (busca, filtros por categoria e parceiros mais próximos)
3. Mapa (parceiros por pin, filtro e botão "minha localização")

Abas "Mi ahorro" e "Perfil" ainda são provisórias.

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
- **Pagamento**: no Android, a assinatura vendida dentro do app deve usar o
  Google Play Billing (regra da loja). O Stripe fica para o site.
