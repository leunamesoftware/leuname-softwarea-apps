# Como publicar um app novo na LeuApps

A LeuApps (www.leunamesoftware.com.br) é a loja própria da LeuName Softwares. Não usamos a Play Store.
Todo app novo segue o mesmo caminho abaixo.

> **Leia também `COMO-FUNCIONA-A-VENDA.md`** (na raiz deste repositório): link de instalar, tela Instalar, compra e e-mail automático com o link.

## 1. Onde o app mora
- **App de uma página só (HTML/JS):** coloque em `leuapps/public/<id>/index.html`.
  Ele abre em `www.leunamesoftware.com.br/<id>/`.
- **App com servidor próprio (Worker):** a loja repassa `/<id>/*` para ele por uma ligação interna
  (service binding em `leuapps/wrangler.toml` e uma regra em `leuapps/src/index.js`; o Quanto Cobrar é o exemplo).
- Use sempre caminhos **relativos** dentro do app (ou um prefixo calculado, como o `RAIZ` do Quanto Cobrar).
- **Por quê:** o app precisa ficar no **mesmo endereço da loja (www)**. Assim ele abre limpo, sem barra de
  endereço, e o login da conta vale nele.

## 2. Botão "Voltar à loja"
Cole antes do `</body>` o mesmo script do Quanto Cobrar (`calculadora/public/app/index.html`).
Ele mostra o ícone da LeuApps com "Voltar à loja" quando o app foi aberto pela loja (`?leuapps=1`).

## 3. Cadastro na vitrine: `leuapps/public/apps.json`
Campos de cada app:
- `id`, `nome`, `categoria`, `resumo`, `icone`, `url`, `preco`;
- `planos`: o que aparece em "Comprar";
- `descricao` e `recursos`: no máximo 4 itens, texto curto, sem poluir;
- `capturas`: 4 a 6 telas em `/img/telas/<id>-N.webp`, 405 px de largura, WebP qualidade 72 (leve para abrir rápido no 4G);
- `versao`.

Ícone: `leuapps/public/img/<id>-192.webp` (e o `.png` para o manifest).
Nunca use telas com nome ou dados de cliente real.

## 4. Venda (mesmo sistema para todos)
- **Preço:** acrescente o plano em `calculadora/src/planos.js` (`PLANOS`), com `app`, `licenca` (app_id da
  chave), `preco` e `parcelas`.
  - **Plano único vitalício:** atualizações opcionais, pagas à parte só se o cliente quiser.
  - **Assinatura:** atualiza sozinha.
- **Página de compra:** acrescente o app em `PRODUTOS` (`calculadora/public/loja/comprar.html`) e em `APPS`
  (`calculadora/public/loja/compra.html`). O link de compra é `/loja/comprar?app=<id>`.
- **Trava dentro do app:** sem licença, mostrar "Comprar" ou "Entrar com a conta".
  - Para entrar, o app chama `POST /loja-api/conta/entrar` e depois `GET /loja-api/conta/apps`.
  - Se a resposta trouxer `apps.<id>`, o app está liberado. O Gestacell é o exemplo.
- **Sem teste grátis automático**, a não ser que o dono peça.

## 5. Publicar
Os robôs ficam no repositório **leunamesoftware/Leunamesite** e usam o branch `ccr-f58cd13b-ml0bzs`:
1. Faça o commit e o push no branch `ccr-f58cd13b-ml0bzs` deste repositório.
2. Se mexeu em `calculadora/`, rode o workflow `calculadora-publicar.yml` (servidor de vendas e contas).
3. Rode o workflow `leuapps-publicar.yml` (a loja).
4. Confira no celular: o app abre pela loja, sem barra de endereço, e o "Comprar" funciona.

## Regras do dono
- Respostas curtas e diretas.
- Nada de Play Store.
- Nunca colocar token ou senha no código: o token do Mercado Pago só existe como segredo `MP_ACCESS_TOKEN`.
- Pagamento pelo Mercado Pago (Pix ou cartão).
- O recebedor aparece como TRANS ANTUNES enquanto o CNPJ troca de nome (o comunicado fica na página de compra).
