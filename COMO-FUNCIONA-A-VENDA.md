# Como funciona a venda dos apps (do app novo ao e-mail do cliente)

Guia para o próximo Claude (e para o dono). Leia antes de mexer em app, loja, compra ou e-mail.

## Resumo em 6 passos
1. **O app** é um site instalável (PWA) num endereço próprio, ex.: `construgestao.leunamesoftware.com.br`.
2. **A loja LeuApps** (`www.leunamesoftware.com.br`) mostra o app. O cliente pode instalar e usar lá dentro.
3. **O link de instalar** é o endereço do app + `?instalar=1`. Ele abre uma tela com o botão **Instalar**
   (celular e computador). Um toque, e o ícone vai para a tela. Sem Play Store e sem APK.
4. **A compra** é pelo Mercado Pago, no servidor `calculadora/`.
5. **Pagou → e-mail automático** com o link de instalar e o passo a passo, pelo Gmail da empresa.
6. **Se o e-mail não sair**, a venda aparece na **Área do Dono** (`www.leunamesoftware.com.br/dono/`)
   com o botão "Enviar pelo meu e-mail".

Não usamos a Play Store: a conta foi banida. Também não usamos APK, por causa dos avisos do Android e da regra
de verificação da Google. O caminho é sempre o app pelo navegador.

## Onde fica cada coisa
| O quê | Onde |
|---|---|
| Loja (vitrine) | `leuapps/public/index.html` + `leuapps/public/apps.json` |
| Área do Dono | `leuapps/public/dono/index.html` |
| Servidor de vendas e contas | `calculadora/src/` (Worker `calculadora-receitas`, banco D1 `calculadora-receitas`) |
| Planos e preços | `calculadora/src/planos.js` (`PLANOS`, `TESTE_DIAS`) |
| Página de compra / compra aprovada | `calculadora/public/loja/comprar.html` e `compra.html` |
| E-mail da compra | `calculadora/src/email.js` (texto + `LINKS`) e `calculadora/src/smtp.js` (Gmail) |
| Tela "Instalar" | `instalar.js`: **o mesmo arquivo** nos 4 apps (veja abaixo) |
| ConstruGestão e Radar | repositório `leunamesoftware/Leunamesite` (`CONSTRUGESTAO/frontend`, `RADAR-PREVENTIVO/frontend`) |

## App novo: o que fazer (checklist)
1. **Endereço próprio.** O app tem `manifest.webmanifest` (com `"id": "/"`, ícones 192 e 512 PNG) e um `sw.js`
   de verdade, que guarda as páginas. Um fetch vazio não serve: o Chrome não oferece instalar.
2. **Tela Instalar.** Copie o `instalar.js` (a cópia mais nova é `CONSTRUGESTAO/frontend/instalar.js` no Leunamesite)
   e coloque no `<head>`:
   `<script src="/instalar.js" data-nome="Nome do App" data-icone="/icon-192.png" data-cor="#ea580c"></script>`.
   - **Ao mudar o instalar.js, copie para os 4 apps:** `leuapps/public/gestacell/`, `calculadora/public/`,
     `CONSTRUGESTAO/frontend/` e `RADAR-PREVENTIVO/frontend/public/`.
   - Como funciona: no celular (navegador) ou com `?instalar=1`, aparece a tela com **Instalar**.
     Se o Chrome ainda não liberou a instalação (na 1ª visita ele espera alguns segundos), a tela mostra
     "Preparando a instalação…" e abre a confirmação sozinha quando liberar. **Não mostra passos de três pontinhos**
     (só se em 1 minuto não liberar, por exemplo quando o app já está instalado). No iPhone é sempre pelo Compartilhar (regra da Apple).
3. **Vitrine.** Coloque o app em `leuapps/public/apps.json`:
   - `instalar` = link do app;
   - `abrirFrame` = link do app (é o que abre dentro da loja);
   - `exigeCompra`, `teste` (dias grátis), `planos`, `capturas`, `descricao`.
   - Para o atalho do ícone (segurar o dedo na LeuApps → arrastar), coloque também em `shortcuts` no
     `leuapps/public/manifest.webmanifest`. O Android mostra só **3 apps** ali.
4. **Preço.** Acrescente em `calculadora/src/planos.js` e em `PRODUTOS` do `comprar.html`.
5. **E-mail e compra aprovada.** Acrescente o link de instalar em `LINKS` (`calculadora/src/email.js`) e em
   `APPS` (`calculadora/public/loja/compra.html`). **Os dois links precisam ser iguais.**
6. **Testes.** `npm test` dentro de `calculadora/`.
7. **Publicar** (ver abaixo) e mandar uma **compra de teste** pela Área do Dono para o e-mail do dono.

## Robô de e-mail (Gmail da empresa)
- Conta: `leunamesoftware@gmail.com` (variável `DONO_EMAIL` no `calculadora/wrangler.toml`).
- O Worker entra no `smtp.gmail.com:465` com uma **senha de app** guardada no segredo `GMAIL_SENHA_APP`.
  **Nunca coloque a senha no código nem no GitHub.**
- Limite do Gmail: uns **500 e-mails por dia**. O que falhar (limite, senha errada, Gmail fora do ar) fica em
  `pedidos.email_enviado = NULL` e aparece na Área do Dono.
- `pedidos.email_enviado`: `auto:<data>` (o robô mandou), `manual:<data>` (o dono marcou "Já enviei"),
  `antes` (compras de antes do robô existir).
- Alternativa pronta, se um dia trocar: Resend (`RESEND_API_KEY` + `EMAIL_FROM`). O Gmail tem preferência.
- **Compra de teste:** na Área do Dono → "Compra de teste: mandar o e-mail". Manda o mesmo e-mail do cliente,
  com "TESTE ·" no assunto, sem pagamento e sem pedido (rota `POST /api/dono/emails/teste`, só o dono).

### Ligar o robô (o dono faz uma vez)
1. No Gmail da empresa: **Conta do Google → Segurança → Verificação em duas etapas → Ativar**.
2. Ainda em Segurança, procure **"Senhas de app"** (ou abra `myaccount.google.com/apppasswords`).
   Crie uma com o nome `LeuApps`. O Google mostra 16 letras. Copie.
3. Na Cloudflare: **Workers e Pages → calculadora-receitas → Configurações → Variáveis e segredos →
   Adicionar → tipo Segredo**. Nome `GMAIL_SENHA_APP`, valor: as 16 letras. Salvar.
4. Na Área do Dono deve aparecer "✅ Robô de e-mail ligado". Faça a compra de teste para o seu e-mail.

Marque como **Segredo**. O `calculadora/wrangler.toml` tem `keep_vars = true`, para a publicação não apagar o que o dono colocou no painel. **Nunca tire essa linha:** sem ela, uma variável de texto some a cada publicação (já aconteceu).

## Padrão do dono: curto e objetivo (vale para todo app novo)
- **E-mail da compra:** "LeuName Softwares", "Seu <App> está liberado", **um botão só: Instalar**, na cor do
  app, e uma linha: "Entre com o mesmo e-mail e senha da compra." Nada de passo a passo.
  - A cor fica em `LINKS` (`calculadora/src/email.js`).
- **Tela do link de instalar:** ícone, nome e **um botão só: Instalar**, na cor do app (`data-cor` no `<script src="/instalar.js">`).
  - Sem "Usar sem instalar", sem três pontinhos, sem texto extra.
  - Dentro do app já instalado, a tela não aparece.
- O cliente não pode perder tempo: **clicou no link → botão Instalar → instalado.**

## Conta do cliente: trava de aparelhos e senha
- **1 celular + 1 computador por conta.** Cada sessão guarda o tipo de aparelho (pelo navegador) e um
  identificador (cookie `ln_aparelho`). Entrar num aparelho novo do mesmo tipo desconecta o anterior
  (`sessoes.substituida_em`) e manda um e-mail de aviso. O mesmo aparelho entrando de novo não manda e-mail.
  A conta do dono (`DONO_EMAIL`) não tem limite. Código: `abrirSessao` em `calculadora/src/contas.js`.
- **Aparelho desconectado:** `/api/conta` e `/api/conta/apps` respondem `motivo: 'outro_aparelho'`.
  - ConstruGestão, Gestacell e Quanto Cobrar conferem a conta ao abrir (com internet) e ao voltar para o app.
    Se o aparelho foi desconectado, mostram o login com a mensagem.
  - Sem internet, o app continua até conectar.
  - **App novo precisa fazer o mesmo:** guardar `<app>_da_conta = '1'` quando o acesso vem da conta e
    conferir `/loja-api/conta/apps` ao abrir.
- **Radar:** tem login próprio depois de entrar pela conta da loja. A trava ainda **não** vale dentro dele.
- **Esqueci a senha:** `/loja/esqueci` manda por e-mail um link `/loja/nova-senha?t=...`, que vale 1 hora e
  é usado uma vez só. Ao trocar a senha, os outros aparelhos caem. Rotas: `POST /api/conta/esqueci` e
  `POST /api/conta/nova-senha`.
- **Minha conta (loja):** lista os apps da conta com **Instalar** (o link do app) e ✉️ (manda o link de novo
  para o e-mail, `POST /api/conta/reenviar`).
- **Cliente perdeu o e-mail:** na Área do Dono, "Clientes · trocar o e-mail da conta". Depois ele usa
  "Esqueci a senha" com o e-mail novo.

## Publicar
- **Apps (loja, servidor, Gestacell, Quanto Cobrar):** commit e push neste repositório, no branch
  `ccr-f58cd13b-ml0bzs`. Depois rode, no repositório `leunamesoftware/Leunamesite`:
  - `leuapps-publicar.yml`: a loja;
  - `calculadora-publicar.yml`: o servidor, que também aplica as migrações do banco;
  - os dois com `ref=ccr-f58cd13b-ml0bzs`.
- **ConstruGestão e Radar:** push no repositório Leunamesite. O deploy é automático pelos workflows
  `deploy-construgestao-cloudflare.yml` e `deploy-radar-preventivo-cloudflare.yml`.
- **Depois de mudar arquivos da loja:** suba a `VERSAO` em `leuapps/public/sw.js`, senão o celular continua
  com a versão guardada. O mesmo vale para o `CACHE` do `sw.js` de cada app.

## Regras do dono
- Respostas curtas e simples, em português.
- Nada de Play Store.
- Nunca senha ou chave no código.
- Evitar o número 13 em textos e exemplos.
- Não inventar números nem promessas.
- Testar antes de dizer que funciona.
