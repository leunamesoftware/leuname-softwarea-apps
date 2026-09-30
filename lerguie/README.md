# LERGUIE — O mundo com você.

Aplicativo Android de acessibilidade para pessoas cegas ou com baixa visão, surdas,
não falantes e com dificuldade de leitura. Quatro funções principais, sempre gratuitas:

| Função | O que faz | Onde roda |
|---|---|---|
| **Ver** | Descreve objetos, pessoas, ambiente, cores e alerta perigos | IA na nuvem (quando permitido) ou no aparelho (offline) |
| **Ler** | OCR de textos, livros, documentos, embalagens e códigos de barras, com leitura em voz | No aparelho (offline) |
| **Ouvir** | Fala → texto em tempo real | Reconhecedor de voz do Android |
| **Comunicar** | Frases prontas/texto → voz; resposta falada → texto grande; modo conversa | No aparelho |

Referências visuais oficiais: `design/referencias/` (10 imagens).

---

## 1. Estrutura

```
lerguie/
├── android/                  App Android (Kotlin + Jetpack Compose)
│   └── app/src/main/java/com/leuname/lerguie/
│       ├── AppContainer.kt   Injeção de dependências (manual, sem framework)
│       ├── ai/               Módulos de IA independentes (trocáveis)
│       │   ├── vision/       Ver: nuvem, aparelho (ML Kit) e híbrido
│       │   ├── ocr/          Ler: OCR + orientação de enquadramento
│       │   ├── barcode/      Código de barras + consulta Open Food Facts
│       │   └── libras/       Contrato do módulo de Libras (ver seção 8)
│       ├── core/
│       │   ├── speech/       Texto→voz (TTS) e voz→texto (STT)
│       │   ├── voice/        Comandos de voz ("Lerguie, ler")
│       │   ├── haptics/      Padrões de vibração por evento
│       │   ├── network/      Cliente do backend (token de sessão)
│       │   ├── settings/     Preferências (DataStore)
│       │   ├── plans/        Planos, recursos e limites (monetização futura)
│       │   └── billing/      Google Play Billing (atrás de interface)
│       ├── data/             Banco local (Room): histórico e favoritos
│       ├── i18n/             Pacotes de idioma do conteúdo gerado
│       └── ui/               Telas, componentes, tema e navegação
├── backend/                  API (Cloudflare Worker, TypeScript)
│   └── src/                  sessão, descrição por IA, planos, validação Google Play
└── design/referencias/       Imagens de referência das 10 telas
```

**Decisões de arquitetura (e por quê):**
- **Local-first, sem conta obrigatória.** Histórico, favoritos e preferências ficam no
  aparelho (Room + DataStore), fora de backups. Menos custo, menos risco de vazamento,
  funciona offline. Sincronização em nuvem fica preparada como recurso futuro (`CLOUD_SYNC`).
- **Backend mínimo e sem estado** (Cloudflare Worker, mesmo padrão do LeuPlace): só existe
  para guardar a chave da IA e validar assinaturas. Não armazena imagens, áudio nem texto.
  Plano gratuito da Cloudflare atende o início; fácil de migrar (é TypeScript padrão).
- **Sem Firebase.** Não é necessário para a V1; evitaria custo e dependência de plataforma.
- **Autenticação anônima por instalação**: o app pede um token curto (7 dias, HS256) ao
  backend; o backend aplica limite por minuto e cota diária por plano.

---

## 2. Requisitos

- Android Studio (Ladybug ou mais novo) com JDK 17, **ou** só o GitHub Actions (seção 5).
- Aparelho Android 8.0+ (API 26). Recomendado: voz "Português (Brasil)" instalada em
  *Configurações → Acessibilidade → Saída de texto para voz* (o app oferece o atalho).
- Backend (opcional para a descrição avançada): conta Cloudflare + chave da API da Anthropic.

Sem backend o app **funciona**: Ver usa a análise do aparelho (mais simples), e Ler, Ouvir e
Comunicar não dependem de servidor.

---

## 3. Executar o app

```bash
cd lerguie/android
./gradlew assembleDebug          # APK em app/build/outputs/apk/debug/
./gradlew testDebugUnitTest      # testes unitários
```
Ou abra `lerguie/android` no Android Studio e clique em Run.

### Apontar o app para o backend
A URL do backend é pública (não é segredo). Defina **uma** das opções:
- `lerguie/android/local.properties`: `lerguie.apiUrl=https://lerguie-api.SEU-USUARIO.workers.dev`
- variável de ambiente `LERGUIE_API_URL` (usada pelo CI)
- `gradle.properties`: `lerguie.apiUrl=...`

Vazio = descrição avançada desligada (tudo mais funciona).

---

## 4. Backend (descrição por IA + planos)

```bash
cd lerguie/backend
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY     # chave em console.anthropic.com
npx wrangler secret put SESSION_SECRET        # texto aleatório longo (ex.: openssl rand -hex 48)
npm run deploy                                # publica e mostra a URL
```
Teste local: copie `.dev.vars.example` para `.dev.vars`, preencha e rode `npm run dev`.
Checagens: `npm run typecheck && npm test`.

**Configurações sem nova versão do app** (`wrangler.toml` / segredos):

| Item | Onde | Padrão |
|---|---|---|
| Modelo de IA | `CLAUDE_MODEL` | `claude-opus-5-5` (pode trocar por um modelo mais barato, ex. `claude-haiku-4-5`, avaliando a qualidade das descrições) |
| Limite por minuto | `[[ratelimits]]` | 10 sessões/IP, 12 descrições/usuário |
| Cota diária por plano | KV `USAGE` + `PLANS_JSON` | 30/dia no gratuito (ative o KV — instruções no `wrangler.toml`) |
| Planos, recursos e limites | segredo `PLANS_JSON` | `src/plans.ts` |

**Privacidade na nuvem:** a foto é reduzida (máx. 1024 px) e enviada só quando o usuário
tira a foto com "Descrição avançada" ligada; o backend não grava a imagem e os logs não
contêm conteúdo do usuário. Pessoas nunca são identificadas por nome.

---

## 5. Gerar APK e AAB

### Pelo GitHub (sem instalar nada)
O workflow `.github/workflows/lerguie.yml` roda a cada push em `lerguie/`: testes, APK de
teste e AAB de release. Baixe em **Actions → execução → Artifacts** (`lerguie-apk-debug`,
`lerguie-aab-release`).

Para AAB **assinado** (Play Store), cadastre em *Settings → Secrets and variables → Actions*:
`LERGUIE_KEYSTORE_BASE64` (`base64 -w0 lerguie.jks`), `LERGUIE_KEYSTORE_PASSWORD`,
`LERGUIE_KEY_ALIAS`, `LERGUIE_KEY_PASSWORD`; e a variável `LERGUIE_API_URL`.

### Localmente
1. Crie a chave (uma vez; **guarde-a com backup** — sem ela não há atualização na loja):
   ```bash
   keytool -genkeypair -v -keystore lerguie.jks -alias lerguie -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Crie `lerguie/android/keystore.properties` (fora do Git):
   ```properties
   storeFile=/caminho/para/lerguie.jks
   storePassword=...
   keyAlias=lerguie
   keyPassword=...
   ```
3. Gere:
   ```bash
   ./gradlew assembleRelease   # APK assinado: app/build/outputs/apk/release/
   ./gradlew bundleRelease     # AAB para a Play Store: app/build/outputs/bundle/release/
   ```

---

## 6. Idiomas (internacionalização)

- Textos da interface: `app/src/main/res/values/strings.xml` (pt-BR, padrão). Nenhum texto
  de tela fica no código.
- Conteúdo gerado (frases faladas da visão, rótulos, cores, comandos de voz): `i18n/`.
  O backend responde no idioma do aparelho (`locale` enviado pelo app).

**Adicionar um idioma (ex.: inglês):**
1. `res/values-en/strings.xml` com as mesmas chaves traduzidas.
2. `i18n/EnLanguagePack.kt` implementando `LanguagePack` (copie `PtBrLanguagePack`) e
   registrar em `LanguagePacks`.
3. Incluir `en` em `res/xml/locales_config.xml` e em `resourceConfigurations`
   (`app/build.gradle.kts`).

O usuário troca o idioma do app em *Ajustes → Idioma* (Android 13+) sem mudar o do aparelho.

---

## 7. Planos e assinaturas (monetização futura)

**Regra fixa no código:** Ver, Ler, Ouvir, Comunicar, voz, comandos de voz, alertas de
perigo, histórico local e ajustes de acessibilidade são `Feature.essential` e **nunca**
são bloqueados (`Entitlements.canUse`, com teste unitário). Limites só afetam extras: por
exemplo, ao atingir a cota de descrição avançada, o Ver continua funcionando com a análise
do aparelho e avisa o usuário. Sem anúncios.

**Como está preparado:**
- Catálogo de planos vem do backend (`GET /v1/plans`) com cache no app → nomes, recursos e
  limites mudam sem nova versão. `monetizationEnabled: false` por padrão (nenhuma oferta aparece).
- Preços **nunca** ficam no código: vêm da Play Store (moeda e impostos locais).
- Compra: Google Play Billing (`PlayBillingGateway`) → o backend valida a compra com a API
  do Google (`/v1/billing/verify`) e devolve um token com o plano. O app não decide sozinho.

**Para ativar no futuro:**
1. Play Console → *Monetizar → Assinaturas*: criar `lerguie_plus` com planos base (ex. `mensal`, `anual`).
2. Google Cloud: conta de serviço com acesso à *Google Play Android Developer API*; no Play
   Console, dar a ela permissão de "Ver dados financeiros / gerenciar pedidos".
3. `npx wrangler secret put GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (conteúdo do JSON).
4. `npx wrangler secret put PLANS_JSON` com `"monetizationEnabled": true` e os planos desejados
   (formato de `src/plans.ts`). Pronto: ofertas aparecem em *Ajustes → Plano*.

Sugerido depois: notificações em tempo real do Play (RTDN) para cancelamentos imediatos
(hoje o token expira junto com a assinatura, no máximo em 7 dias).

---

## 8. Libras — situação real

- **Reconhecimento de Libras pela câmera** e **resposta em avatar de Libras**: **não
  implementados na V1**, de propósito. Não existe hoje um modelo aberto com confiabilidade
  comprovada para Libras em frases; o app **não finge** reconhecer sinais e informa isso
  na tela. A comunicação da V1 usa frases prontas, texto e voz.
- A arquitetura está pronta: `ai/libras/SignLanguage.kt` define `SignLanguageRecognizer`
  (quadros de vídeo → texto + confiança, com "repita o sinal" em baixa confiança) e
  `SignLanguagePresenter` (texto → representação). Para a V2: implementar (ex.: MediaPipe
  Hand/Holistic Landmarker + classificador treinado com dataset de Libras; avatar via
  VLibras ou vídeos de sinais) e trocar a implementação no `AppContainer`.

---

## 9. Segurança e privacidade (resumo)

- Nenhuma chave/segredo no app ou no repositório (segredos só no Cloudflare / GitHub Secrets).
- HTTPS obrigatório (`usesCleartextTraffic=false`); backup do app desativado.
- Câmera e microfone pedidos só ao abrir a função, com explicação; nada roda escondido.
- Histórico automático **desligado por padrão**; "Salvar" é sempre ação explícita; apagar
  item, vários ou tudo.
- Backend: token assinado, limite por minuto, cota diária, validação de tamanho/formato,
  logs sem conteúdo do usuário.

---

## 10. Roteiro

- **V1.1** — mais rótulos traduzidos no modo offline, ajustes finos de voz e contraste.
- **V1.2** — melhorias no Comunicar (frases personalizadas, conversa salva por tópico).
- **V2** — reconhecimento de Libras (módulo `ai/libras`).
- **V3** — conversa Libras ↔ voz mais natural (avatar).
- **Futuro** — inglês/espanhol (seção 6), iOS (os módulos `core`/`ai` já são isolados por interface).

Checklist de testes: [`docs/TESTES.md`](docs/TESTES.md).
