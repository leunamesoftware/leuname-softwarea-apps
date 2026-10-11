# Para o próximo Claude: estado da LeuName Softwares e o que fazer

Leia primeiro, nesta ordem:
1. **Este arquivo**: o que existe, o que falta e as regras do dono.
2. **`COMO-FUNCIONA-A-VENDA.md`**: o caminho completo, do app novo ao e-mail do cliente, com os comandos de publicar.
3. **`CLAUDE.md`**: as regras de receitas do Quanto Cobrar.

Situação de 8 de outubro de 2026, escrita pelo Claude que montou a venda sem a Play Store.

---

## 1. Como o negócio funciona hoje (tudo no ar e testado)
- **A conta da Play Store foi banida.** A loja é a **LeuApps** (www.leunamesoftware.com.br). Não use a Play Store
  e não use APK.
- **Instalação:** os apps são sites instaláveis (PWA) em endereços próprios.
  - O link de instalar é o endereço do app + `?instalar=1`: abre uma tela com **um botão só, Instalar**.
  - Celular ou computador: um toque e o ícone vai para a tela.
  - O dono testou no celular dele e funcionou.
- **Venda:**
  1. O cliente toca em **Comprar**.
  2. Paga no Mercado Pago (Pix ou cartão).
  3. O robô manda **sozinho** o e-mail "Seu <App> está liberado", com **um botão Instalar**, pelo Gmail da empresa.
  4. Se o e-mail falhar, a venda aparece na **Área do Dono** para ele mandar com um toque.
- **Conta do cliente:** e-mail + senha, a mesma para a loja e todos os apps.
  - Trava de **1 celular + 1 computador**: entrar num aparelho novo desconecta o anterior e manda e-mail de aviso.
  - **Esqueci a senha** manda um link por e-mail.
- **Venda direta (Pix pessoal):** Área do Dono → "Venda direta". O dono coloca o e-mail e escolhe app e plano.
  - O servidor (`liberarVendaDireta` em `calculadora/src/pagamento.js`) grava um pedido pago, libera o plano e manda o e-mail com Instalar.
  - Se o e-mail ainda não tem conta, a compra entra quando o cliente tocar em "Criar conta" com esse e-mail.
  - App novo: acrescente os planos dele no `<select id="vd-plano">` de `leuapps/public/dono/index.html`.
- **Teste grátis:** 7 dias (Gestacell, Radar, ConstruGestão). Depois, o app mostra os planos.
- **Atalhos:** segurar o dedo no ícone da LeuApps mostra 3 apps para arrastar para a tela do celular
  (`shortcuts` no `leuapps/public/manifest.webmanifest`; o Android mostra só 3).

## 2. Apps na loja
| App | Endereço | Código | Situação |
|---|---|---|---|
| Quanto Cobrar | quantocobrar.leunamesoftware.com.br/app/ | `calculadora/public/app/` | completo |
| Gestacell | gestacell.leunamesoftware.com.br | `leuapps/public/gestacell/` | completo |
| Radar Preventivo | radar.leunamesoftware.com.br | Leunamesite `RADAR-PREVENTIVO/` (React + Worker) | completo; falta a trava de aparelhos (seção 5) |
| ConstruGestão | construgestao.leunamesoftware.com.br | Leunamesite `CONSTRUGESTAO/frontend/index.html` | funciona, mas tem partes escondidas que faltam fazer (seção 5) |
| MercaGestão | mercagestao.leunamesoftware.com.br | `leuapps/public/mercagestao/` (app.js + nucleo.js testado em `leuapps/test/mercagestao.test.mjs`) | completo; NFC-e pelo emissor Focus NFe ainda sem teste com conta real (seção 5) |
| LeuBurger PDV | leuburger.leunamesoftware.com.br | `leuburger/` (React + Hono + D1 próprio; 31 testes em `leuburger/test/`) | completo; sem nota fiscal nem integração com maquininha/delivery (v1) |

Cursos: `leuapps/public/cursos.json`, com 4 cursos. Campos: `id`, `nome`, `nomeCurto`, `resumo`, `icone`, `destaque`,
`categorias`, `preco`, `nivel`, `app`, `aulas[{parte,titulo,minutos,texto}]`, `unidade`, `certificado`.

## 3. Criar um app novo (receita mastigada)
1. **Peça ao dono:** nome, para quem é, cor da marca, ícone e preço.
   - Sugira: assinatura mensal **ou** vitalício; o dono não quer plano anual.
   - Sugira também 7 dias grátis.
2. **Faça o app** como site instalável num endereço próprio `<app>.leunamesoftware.com.br`. Use o ConstruGestão como
   modelo, porque é o mais completo:
   - `manifest.webmanifest` com `"id": "/"`, ícones PNG 192 e 512 e `display: standalone`;
   - um `sw.js` de verdade, que guarda as páginas (um fetch vazio não deixa instalar);
   - `<script src="/instalar.js" data-nome="<Nome>" data-icone="/icon-192.png" data-cor="<cor>">`, copiado da cópia mais nova;
   - `worker.js` com o proxy `/loja-api/*` para o servidor de contas (binding `CONTAS` → `calculadora-receitas`);
   - workflow de deploy no Leunamesite, igual ao `deploy-construgestao-cloudflare.yml`.
3. **Entrada do app pela conta da loja.** Copie do ConstruGestão as funções `chaveDaConta`,
   `acessoDaContaValendo`, `renderLicenseGate`, `entrarNaConta`, `criarConta` e `comecarTesteGratis`. Elas fazem:
   - login e criar conta;
   - 7 dias grátis;
   - "Escolha um plano";
   - trava de aparelhos (`<app>_da_conta`);
   - o link "Esqueci a senha" → `https://www.leunamesoftware.com.br/loja/esqueci`.
4. **Venda:**
   - `calculadora/src/planos.js`: em `PLANOS`, o plano mensal (`assinatura: true`, `dias: 33`) e o vitalício; em `TESTE_DIAS`, os dias grátis;
   - `calculadora/public/loja/comprar.html`: entrada em `PRODUTOS`;
   - `calculadora/public/loja/compra.html`: entrada em `APPS`, com o link de instalar;
   - `calculadora/src/email.js`: em `LINKS`, o **mesmo** link de instalar e a **cor** do app;
   - teste parecido com `test/testes-apps.test.mjs`, depois `npm test`.
5. **Vitrine:** em `leuapps/public/apps.json` (copie a entrada do ConstruGestão), coloque:
   - `instalar` e `abrirFrame` (o link do app);
   - `planos`, `opcoes`, `teste`, `exigeCompra`;
   - `capturas`: telas no estilo Play, 9:16, título grande;
   - `descricao`, `recursos` e `secoes` (as categorias).
6. **Publique** (ver `COMO-FUNCIONA-A-VENDA.md`). Suba a `VERSAO` do `leuapps/public/sw.js`.
7. **Teste** no simulador de celular e faça uma **compra de teste** na Área do Dono para o e-mail do dono.
   Só diga que está pronto depois de testar.

**Padrão do dono, sempre:** curto e objetivo. A tela de instalar e o e-mail têm **um botão só**, Instalar,
na cor do app. **Nada que clica e não funciona.** Se uma parte não ficou pronta, esconda até ficar.

## 4. Produtos que não são app (templates de site, logomarcas, pastas): ainda não existe, falta fazer
O dono quer vender também **arquivos**: um template, que é uma pasta para o cliente montar o site, ou uma logomarca.
A ideia combinada é usar o mesmo caminho: comprar na loja → e-mail.
Plano sugerido:
1. Na vitrine, `apps.json` ganha `"tipo": "arquivo"`, com a página de detalhe igual e o botão **Comprar**, sem Instalar.
2. O arquivo (.zip) fica num bucket R2 privado (ex.: `leuapps-arquivos`). Nunca num link público fixo.
3. Depois do pagamento, o e-mail traz **um botão só: Baixar**.
   - O link aponta para `/loja-api/conta/baixar?item=<id>`.
   - O servidor confere se a conta comprou e entrega o arquivo do R2.
   - Pode exigir login: o cliente toca e, se não estiver logado, entra com o e-mail e a senha.
4. Em **Minha conta**, o item aparece com o botão **Baixar**, para baixar de novo.
5. Planos: pagamento único (`PLANOS.<id>: { app: '<id>', preco, licenca: '<id>' }`).

## 5. Buracos conhecidos (pendências, em ordem de importância)
1. **ConstruGestão: partes escondidas.** São 63 botões sem função e a aba **Financeiro**, escondidos pelo
   `<style id="cg-escondidos">` no `<head>`. A lista de ids está ali.
   - Inclui: Aplicar e Limpar filtros de todas as telas, os botões de Relatório, quase toda a tela de Permissões,
     Notificações (configurar), Relatórios (período e personalizados), Dados da empresa e Selecionar arquivo,
     as abas extras de WhatsApp, Usuário e Configurações, além do Financeiro.
   - **Fazer cada um de verdade e tirar o id da lista.** Os botões que já funcionam são ligados com `rewire('<id>', ...)`.
   - O aviso "será implementado" foi desligado em `showToast`.
   - O dono também reclamou de **muitas etapas para liberar**: onboarding (criar administrador e loja) depois da
     conta da loja. Simplificar: usar o nome e o e-mail da conta da loja para criar o administrador sozinho.
2. **Radar:** a trava de 1 celular + 1 computador não vale lá dentro. O Radar tem sessão própria depois de entrar
   pela conta da loja. Fazer o backend do Radar conferir a conta da loja (`CONTAS /api/conta`) ao abrir e
   derrubar a sessão própria se vier `motivo: 'outro_aparelho'`.
3. **Mercado Pago com CNPJ.** O Access Token fica no **segredo do GitHub `MP_ACCESS_TOKEN`**, no repositório
   leunamesoftware/Leunamesite. O workflow `calculadora-publicar.yml` grava esse token no servidor a cada publicação.
   - **Para trocar para a conta do CNPJ, troque o segredo do GitHub, não o da Cloudflare**; senão a próxima
     publicação volta o antigo.
   - Na página de compra, o recebedor aparece como TRANS ANTUNES enquanto o CNPJ troca de nome.
4. **Produtos de arquivo** (seção 4).
5. **Microsoft Store** (computador com Windows; a conta Google Play foi banida). Conta Partner Center PF do dono, já verificada.
   - **Gestacell enviado para certificação em 10/10/2026** (Store ID 9NQ9BWWVLGHM, pacote `Leunamesoftware.Gestacell`,
     publisher `CN=83C078D6-4CCB-43A0-BC05-DD91FD6BD64C`). Grátis na Store; venda pelo nosso Mercado Pago (declarado).
   - Pacote: workflow `microsoft-store.yml` (Leunamesite, PWABuilder) → /baixar/microsoft/<app>.msixbundle. Imagens 1920×1080
     em `leuapps/public/microsoft/`. Justificativa do runFullTrust e notas de teste: em inglês (PWA do PWABuilder, sem login).
   - 1ª vez de cada app é manual no celular do dono (nome, classificação IARC "outros tipos", Não em tudo exceto compras = Sim;
     Propriedades: Negócios/Produtividade, privacidade www.leunamesoftware.com.br/privacidade.html, sem Mixed Reality;
     Pacotes: marcar só Windows 10/11 Desktop). Passo a passo curto, UM passo por mensagem. Atualizações: automatizar depois
     (app no Entra + msstore CLI, códigos só em segredos do GitHub) quando o dono tiver PC.
   - Próximos: MercaGestão, ConstruGestão, Radar, PDV (nome novo).
6. **LeuApps no celular é SITE (decisão do dono, 10/10/2026).** Não oferecer mais "instalar a LeuApps": app instalado abre links
   numa janelinha onde o Android não deixa instalar outro app. No Chrome, o Instalar de cada app vai para `/instalar/<id>`
   (tela do app com botão Instalar, testado e aprovado pelo dono). Quem ainda tem a LeuApps instalada vê o aviso "agora é site".
   Links para divulgar/QR Code: `www.leunamesoftware.com.br/instalar/<id>`.
7. **Página inicial do www = site antigo (11/10/2026, pedido do dono: "do jeito que era").** `/` vai para o worker leuname-site-br
   (SITE_ANTIGO; código em Leunamesite/SITE-LEUNAMESOFTWARE-BR). A loja de apps fica em `/apps`. O dono vai dizer, por ordem,
   o que mudar no site. **NUNCA pôr routes/custom_domain no wrangler.toml do SITE-LEUNAMESOFTWARE-BR**: cada publicação dele
   tomava o www do leuapps e derrubava /img, /apps, /instalar e /loja (aconteceu em 11/10/2026; corrigido). Diagnóstico ao vivo:
   workflow diagnostico-site.yml (Leunamesite). Rumo combinado: sair da LeuApps; o cliente baixa/instala cada app direto do site (celular e PC),
   entra com o e-mail, testa 3 dias (qualquer app) e depois paga o plano no Mercado Pago da empresa.
   Produtos do site = `js/catalogo.js`, gerado por `SITE-LEUNAMESOFTWARE-BR/ferramentas/gerar_catalogo.py <leuapps/public>`
   (categorias e "Em breve" no script e em js/products.js). App mudou no apps.json → rodar o script e dar push (publica sozinho).
8. **Teste grátis = 3 dias em todos os apps (11/10/2026).** TESTE_DIAS e DIAS_TESTE em calculadora/src/planos.js; Pedêê DIAS_GRATIS.
   **Trava contra trocar de e-mail:** o teste de cada app fica preso ao aparelho (cookie ln_aparelho) e à rede (IP em hash):
   mesmo aparelho não testa o mesmo app de novo; mesma rede, no máximo 3 testes do app por mês (4G compartilha IP, por isso
   não é bloqueio por IP puro). Migração 0016; teste em calculadora/test/testes-apps.test.mjs. Cada conta: 1 celular + 1 computador.
7. **Pedêê (pausado pelo dono; ele vai mandar a lista completa do que falta).** Já pendente:
   - **Prazos com Score do entregador:** os prazos já aparecem (`src/regras/prazos.ts`: coleta 15 min, trajeto 5 min + 3 min/km,
     preparo da loja em Ajustes). Falta o Score 0–100 por atraso, sem multa e sem bloqueio automático; score baixo vai para o fim
     da lista da loja; o 1º imprevisto avisado no mês não conta. O dono ainda não aprovou os tempos.
   - **Admin:** pedidos ao vivo (atrasos em vermelho), aprovar loja e entregador novos antes de entrarem, ficha completa
     (pedidos, reclamações, nota), financeiro das mensalidades, mapa ao vivo dos entregadores, configurações da plataforma
     (prazos, cidades, banners). O pulo ao trocar de aba foi resolvido (abas carregadas de uma vez + `scrollbar-gutter`).
   - **Avisos com o app fechado (Web Push, `src/api/push.ts` + `public/sw.js`):** o dono ainda não testou no celular de verdade.
   - **Entregador de moto:** cadastro da moto + CNH (hoje quem é de bicicleta não pode trocar para moto).
   - **Mapa pago** (o dono quer contratar uma API de mapa depois; hoje é OpenStreetMap + botões do Waze e Google Maps).
   - **Pagamento pelo app** (Mercado Pago, com a taxa por distância e o repasse ao entregador); hoje paga na entrega.
   - **Instalação:** os 3 apps vão pelo navegador (PWA). O APK do entregador (`leuburger/android-entregador`) é opcional e
     não aparece na loja: o Google Play Protect assusta quem instala.
8. **MercaGestão: NFC-e.** O app monta a nota e manda pela ponte `/fiscal/nfce` (worker da loja, `fiscal()` em
   `leuapps/src/index.js`) para o Focus NFe, com o token da própria loja (Configurações → Nota fiscal). Falta testar
   em homologação com uma conta real do Focus (o cliente contrata, sobe o certificado A1 e o CSC lá).
   - Identidade própria: azul/azul-marinho/laranja, ícone do dono (`img/mercagestao-*.png`). Não copiar dos outros apps.
   - Dados no aparelho (IndexedDB `mercagestao`); cópia de segurança em Configurações.
   - Leitor: de mão (USB = teclado + Enter), câmera (`BarcodeDetector` ou `lib/zxing.min.js`), etiqueta da balança (EAN 2…).
   - Impressão: cupom 80/58 mm pela janela de impressão ou Bluetooth ESC/POS (Chrome).

## 6. Segredos e onde ficam (nunca no código)
| Segredo | Onde | Para quê |
|---|---|---|
| `GMAIL_SENHA_APP` | Cloudflare → Worker `calculadora-receitas` → Variáveis e segredos (tipo Segredo) | robô de e-mail (Gmail leunamesoftware@gmail.com) |
| `MP_ACCESS_TOKEN` | GitHub (Leunamesite) → Secrets | Mercado Pago |
| `CF_API_TOKEN` | GitHub (Leunamesite) → Secrets | publicar na Cloudflare |

O `calculadora/wrangler.toml` tem `keep_vars = true`. **Não tire essa linha:** sem ela, a publicação apaga o que o dono colocou no painel.

## 7. Regras do dono (Emanuel)
- **Respostas:**
  - Português, **curto e simples**, passo a passo numerado quando ele tiver que fazer algo no celular.
  - Ele manda print; leia o print antes de responder.
- **Não inventar:**
  - Não prometer o que não testou.
  - Se algo depende de regra do Android, da Apple ou da Google, dizer isso claramente, uma vez, sem enrolar.
- **Segurança:** nunca senha ou chave no código; nunca pedir para ele colar senha no chat.
- **Textos:** evitar o número 13 em textos e exemplos.
- **PR:** só criar quando ele pedir.
- **Commits:** com as linhas `Co-Authored-By` e `Claude-Session` que a sessão indicar.
- **Todo app abre bonito no computador (pedido do dono).** Tela deitada a partir de 900 px = modo computador
  (menu na lateral, conteúdo largo); celular em pé = modo celular, mesmo com "Versão para computador" ligada no Chrome.
  Regra usada: `@media (min-width: 900px) and (orientation: landscape)` (Quanto Cobrar, loja, Radar). App novo já nasce assim.
- **Sem licença/chave para o cliente:** ele compra, recebe o e-mail, instala e entra com e-mail e senha. App novo:
  o servidor cadastra o app sozinho na tabela `apps` do banco de licenças (registro interno das compras).
- **MercaGestão (visual e recursos):** ícones próprios (`icones.js`, sem emoji), Painel do dono (vendas, lucro, 7 dias,
  alertas), promoção com datas e preço de atacado (`precoVigente`), etiquetas de gôndola A4 com código de barras
  (`barrasEAN`), troca/devolução na venda e lucro real nos relatórios (`lucroDoPeriodo`). Cadastro pelo código de barras
  busca nome/foto/categoria/NCM (`/produto/<ean>` no worker da loja; Cosmos se o segredo `COSMOS_TOKEN` existir).
