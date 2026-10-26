# Supermisto — guia para fazer sozinho até segunda

App (ERP): **https://precos.supermistotemperos.com.br** (instale pelo Chrome → ⋮ → Instalar app)
Site: **https://www.supermistotemperos.com.br**

---

## 1. Colocar imagens no site (pelo app, sem mim)

**Fotos das linhas (banner e quadradinho)**
App → 🌐 **Meu site** → 🖼️ **Fotos das linhas** → toque em *Quadradinho* ou *Banner* → escolha a foto.
- Foto **sem nada escrito** (o site escreve o nome da linha por cima).
- O app ajusta o tamanho sozinho. Aparece no site em até 1 minuto.

**Foto de um produto**
App → 🌐 **Meu site** → toque no produto → 📷 **Foto principal** (e, se quiser, uma foto para cada tamanho: 50 g, 1 kg…) → **Salvar**.
- Produto com foto deixa de ser "Em breve" e passa a abrir a página dele.
- Ali também dá para mudar nome, descrição, tamanhos, ingredientes, validade, ou **esconder** do site.

**Produto novo**
App → 🌐 **Meu site** → **＋ Produto novo** → nome, linha, tamanhos, foto → **Salvar**.

---

## 2. Cadastrar na Shopee à mão (até a ligação automática)

1. Na Shopee: tirar a loja do **Modo Férias**.
2. Nome do remetente: Central do Vendedor → **Minha conta → Meus endereços** → nome **Supermisto Temperos**.
3. No app: 📋 **Cadastrar na Shopee**. Para cada produto:
   - toque em **Copiar** no Título → cole na Shopee;
   - Categoria (sugestão) → escolha a mais parecida na Shopee;
   - **Copiar** a Descrição → cole;
   - Marca: **Supermisto**;
   - Variações (10 g, 50 g, 100 g, 1 kg): copie o **código** de cada uma para o campo SKU, o **peso de envio** e a **caixa** (comprimento × largura × altura);
   - suba as fotos (a 1ª é a capa);
   - marque **"Já cadastrei na Shopee"** no app.
4. **Preço**: onde estiver "definir", veja antes na aba 💰 **Tabela de preços** / 📦 **Produtos** do app (ele já desconta a taxa da Shopee e mostra o mínimo para não ter prejuízo). Não venda abaixo do mínimo.
5. Comece pelos campeões: colorau, tempero completo, alho em pó, pimenta-do-reino, orégano, chimichurri e os kits.

> Use **o mesmo código (SKU) do app** na Shopee. Quando a ligação automática ficar pronta, o app reconhece cada anúncio pelo código e já liga sozinho (preço, estoque e pedidos).

---

## 3. Ligação automática com a Shopee (quando chegar o e-mail de aprovação)

Você mesmo consegue fazer:
1. Em **open.shopee.com** → Console → **Create App** → tipo **Seller In House System**, nome **Supermisto ERP**, redirect **https://precos.supermistotemperos.com.br**.
2. Quando o app for aprovado, aparecem o **Partner ID** e a **Partner Key**. **Não mande no chat para ninguém.**
3. No GitHub (conta **leunamesoftware**) → repositório **Leunamesite** → **Settings → Secrets and variables → Actions → New repository secret**:
   - Nome `SHOPEE_PARTNER_ID` → valor: o Partner ID
   - Nome `SHOPEE_PARTNER_KEY` → valor: a Partner Key
4. Ainda no Leunamesite → aba **Actions** → **ERP Supermisto (Precificador) — testar e publicar** → **Run workflow** (branch `claude/leuname-github-setup-qwkedw`) → espere ficar verde.
5. No app → 🛒 **Loja Shopee** → **Conectar loja** → entre na sua conta da Shopee e autorize.
6. Pronto: pedidos, aviso de venda, etiquetas, preço e estoque passam a andar sozinhos.

Se algo der errado em algum passo, pare e me mostre o print na segunda.

---

## 4. Prompts das imagens (ChatGPT)

**Dica que evita imagem repetida:** abra **uma conversa nova para cada imagem**.

### 4.1 Banners das linhas que faltam (foto deitada, sem texto)
Cole no começo de cada uma:

> Crie UMA foto horizontal larga (16:9), fotografia publicitária de comida, nítida, cores vivas, SEM nenhum texto, SEM logotipo e SEM embalagem de marca. O assunto fica do centro para a DIREITA; o lado ESQUERDO fica com fundo liso e desfocado (espaço livre para o título). Cena:

E depois a cena da linha:

1. **Linha Super Brasa** — costela e picanha na churrasqueira com brasa acesa, sal grosso caindo, chimichurri numa tigela, fundo escuro noturno.
2. **Ervas da Horta** — ervas frescas e secas (orégano, manjericão, alecrim, salsa) em tigelas de madeira e vasinhos, luz de janela, fundo verde desfocado.
3. **Molhos e condimentos** — garrafinhas de vidro de molho de pimenta, shoyu e alho, pimentas frescas e pastéis, bancada de mármore claro.
4. **Conservas** — potes de vidro de pepino, pimenta biquinho, cenoura e cebolinha em conserva numa prateleira de despensa, luz da tarde.
5. **Doces e compotas** — potes de goiabada, figo em calda, doce de abóbora e geleia, queijo minas fatiado, mesa de café colonial.
6. **Amidos e farofas** — farofa dourada numa frigideira de ferro, polvilho e mandioca, pão de queijo saindo do forno.
7. **Sabores do Brasil** — mesa com feijoada, moqueca na panela de barro e baião de dois, tecido de chita colorido.
8. **Sem sal adicionado** — tigelas de ervas e especiarias coloridas, legumes frescos e uma salada, clima leve e claro, fundo branco desfocado.
9. **Kits com receita** — caixa de presente aberta com saquinhos de tempero, um caderno de receitas e colher de madeira, fundo roxo escuro desfocado.
10. **Sopas e caldos** — duas tigelas de sopa de legumes e creme de abóbora fumegantes, legumes frescos, mesa de madeira clara.
11. **Pastas e temperos pastosos** — três potes de vidro abertos com pasta de alho, pasta de pimenta e pasta verde de ervas, alho e gengibre ao lado, mármore cinza.
12. **Grãos e sementes** — tigelinhas com lentilha, grão-de-bico, chia, linhaça, gergelim e feijão-branco, saco de juta.
13. **Desidratados e cogumelos** — cogumelos shiitake e champignon secos, tomate seco, banana e maçã desidratadas sobre tábua de madeira.
14. **Linha Chef Supermisto** — moedores de pimenta e sal de madeira, tábua de corte, colher de pau e avental roxo-escuro numa bancada elegante com detalhes dourados.

Suba cada uma no app (Meu site → Fotos das linhas → **Banner**). O quadradinho pode ser a mesma foto: toque em **Quadradinho** e escolha a mesma imagem.

### 4.2 Pacotes de 1 kg que faltam (13)
Páprica picante · Noz-moscada moída · Cravo-da-índia moído · Ervas finas · Tempero para frango · Tempero para feijão · Tempero para arroz · Curry · Tempero para saladas · Tempero para pizza · Tempero para carne moída · Sal com alho · Sal de ervas.

Prompt (troque o NOME):

> Faça a embalagem de 1 kg do mesmo jeito das que você já fez: saco plástico transparente grande cheio do tempero, etiqueta retangular no meio com foto do ingrediente à esquerda e faixa verde à direita com o nome **NOME** em letra branca grande sobre pincelada dourada, selos "100% NATURAL" e "SEM CONSERVANTE" e o peso **1 kg** num balão branco. Fundo cinza claro liso. SEM logotipo (eu coloco depois).

(Esses eu coloco com a logo quando você mandar.)

### 4.3 Saquinho de produto novo (os "Em breve")
> Faça um saquinho de tempero igual ao padrão: solapa de cima com foto do ingrediente à esquerda e faixa colorida à direita, nome **NOME** em letra branca grande sobre pincelada, selos "100% NATURAL" e "SEM CONSERVANTE" e peso **10 g** num balão branco; embaixo, saquinho transparente cheio do tempero. Fundo branco liso. SEM logotipo.

> Para não ficar tudo igual: peça **cor do tempero** certa (ex.: "recheio marrom-escuro" para feijão, "dourado" para arroz) e **foto do prato** diferente na solapa.

**Correções pendentes nas artes:** "Carne **Moída**" (já corrigi no site) e o Curry escrito só **"Curry"**, sem "Tempero para".

### 4.4 Receitas novas (foto do prato)
> Crie UMA foto quadrada (1:1) de **NOME DO PRATO**, fotografia de comida caseira brasileira, luz natural, mesa de madeira, cores vivas, sem texto e sem marca.

Mande a foto com o nome da receita que eu escrevo a receita e coloco no site.

---

## 5. Antes de vender (burocracia)
- **Licença sanitária** da fábrica (Vigilância de Duque de Caxias) em dia.
- **Rótulo** com ingredientes, peso, lote, validade, CNPJ, endereço, "Indústria Brasileira" e tabela nutricional.
- **Chás, Linha Chef (revenda) e sopas**: confirmar com o contador se o CNPJ cobre.
- **Ovos de codorna e doce de leite**: só com inspeção (SIM/SIE/SIF).
- **Domínio**: ligar a renovação automática no registro.br.
- **Marca**: pedir registro no INPI.

---

## 6. O que eu faço quando voltar
- Colocar a logo nas embalagens novas (saquinhos e 1 kg) que você mandar.
- Ligar o botão "Publicar na Shopee" automático (se a Shopee tiver aprovado).
- Receitas novas e o que mais você pedir.
