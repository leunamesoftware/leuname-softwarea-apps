# LeuPlace

Marketplace local de compra e venda por localização, organizado por
Estado → Cidade → Região/Bairro → Categoria → Produto.

Stack: **Flutter** (app) + **Firebase** (Auth, Firestore, Storage, Cloud
Functions) + **Riverpod** (estado) + **go_router** (navegação).

## Status do projeto

Em desenvolvimento por fases (ver mapa completo no planejamento do produto).
Fase atual: **Fase 1 — Fundação** (estrutura, autenticação, permissões e
navegação principal).

## Configuração inicial (obrigatória antes de rodar o app)

O projeto ainda **não está conectado a um projeto Firebase real** —
`lib/firebase_options.dart` contém apenas placeholders, de propósito, para
não conectar acidentalmente a um projeto inexistente.

1. Crie um projeto em https://console.firebase.google.com (ou use um já
   existente do cliente).
2. Ative no console: **Authentication** (métodos E-mail/Senha, Google e
   Telefone), **Firestore Database** e **Storage**.
3. Instale a FlutterFire CLI:
   ```bash
   dart pub global activate flutterfire_cli
   ```
4. Na raiz do projeto, rode:
   ```bash
   flutterfire configure
   ```
   Isso substitui `lib/firebase_options.dart` pelos valores reais e gera os
   arquivos nativos (`google-services.json` / `GoogleService-Info.plist`),
   além de ajustar o Gradle do Android automaticamente.
5. Publique as regras de segurança do Firestore (`firestore.rules`, já
   incluídas neste repositório):
   ```bash
   firebase deploy --only firestore:rules
   ```
6. Rode o app:
   ```bash
   flutter pub get
   flutter run
   ```

### Login com Google

Depois do `flutterfire configure`, registre o SHA-1/SHA-256 de debug e de
release do app Android no console do Firebase (Configurações do projeto →
seu app Android → Adicionar impressão digital), senão o login com Google
falha silenciosamente.

### Login com Facebook

Ainda não configurado (precisa de um App ID do Meta for Developers). O botão
existe na tela de cadastro, mas está desativado até essa integração ser
feita.

## Estrutura de pastas

```
lib/
  core/       theme, constants, utils, errors, services (Firebase)
  data/       models, datasources (Firebase bruto), repositories (regras)
  features/   auth, home, search, products, chat, profile, splash
  widgets/    componentes reutilizáveis (logo, botões, shell de navegação)
  routes/     go_router
```

## Comandos úteis

```bash
flutter analyze     # lint/typecheck
flutter test        # testes
flutter pub get     # instalar dependências
```
