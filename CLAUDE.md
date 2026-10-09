# LeuName Softwares — apps

- Loja própria: **LeuApps** (www.leunamesoftware.com.br), na pasta `leuapps/`. Não usamos a Play Store.
- Servidor de vendas e contas (Mercado Pago, e-mail + senha) e o app Quanto Cobrar: pasta `calculadora/`.
- **Comece por `PROXIMO-CLAUDE.md`** (estado atual, pendências, como criar app novo) e `COMO-FUNCIONA-A-VENDA.md`.
- **Para criar ou publicar um app novo na loja, siga `leuapps/COMO-PUBLICAR-APP.md`.**
- Respostas curtas, em português, direto ao ponto.

## Receitas do Quanto Cobrar (o dono manda foto + texto)
1. Foto: rodar `python3 scripts/foto_receita.py <foto> <id>` em `calculadora/` (gera a foto leve em WebP e a miniatura do sumário).
   O script também põe a versão da foto no JSON (`"foto": "/img/receitas/<id>.webp?v=<código>"`). Sem isso o celular
   continua mostrando a foto antiga que guardou. Só para atualizar as versões: `python3 scripts/foto_receita.py` (o teste confere).
2. Acrescentar no fim de `calculadora/src/receitas.json`, no mesmo formato das outras:
   - quantidades em g/ml/un, com a medida caseira em `caseira`;
   - `emb` com o preço de referência da embalagem;
   - `rendimento` (unidades, peso da unidade e faixa);
   - `gas` (minutos e chama);
   - `dicas` (lista de dicas de preparo, aparece depois do modo de preparo) e `dicaVenda`.
3. Ingrediente opcional fica fora do custo; cite no modo de preparo.
4. Rodar `node --test test/*.mjs` em `calculadora/`, fazer commit e push no branch `ccr-f58cd13b-ml0bzs`
   e disparar o workflow `calculadora-publicar.yml` no repositório leunamesoftware/Leunamesite.
5. Responder ao dono com o link único de divulgação (o mesmo para todas as receitas):
   `www.leunamesoftware.com.br/quantocobrar` (abre a página de venda dentro da loja).
6. Esquema fixo de cada lote de receitas (o dono copia tudo pronto):
   - prompts das imagens num bloco só (formato da regra 7);
   - quando as imagens chegarem: foto no app (passo 1) e, para o canal, as imagens numeradas em JPG (1-coxinha.jpg…)
     + os textos numerados com o mesmo número, cada um num bloco para copiar, SEM quantidades e SEM rendimento,
     terminando com o link https://www.leunamesoftware.com.br/quantocobrar (sempre com https://).
   Quando o dono pedir para o Claude criar as receitas: escrever tudo no JSON, usar foto provisória ("Foto em breve")
   e entregar em `calculadora/canal/<grupo>.md` o prompt de cada imagem e o texto do canal do WhatsApp
   (sem quantidades e sem rendimento: isso fica só no app). Publicar só depois que as fotos chegarem.
7. Prompts de imagem: um único bloco para copiar de uma vez, neste formato: primeiro a frase "Gere N imagens separadas,
   uma por vez, na ordem abaixo. Todas no mesmo estilo: ..." e depois uma linha por foto: "IMAGEM 1 – NOME: descrição. Ao fundo, ...".
   Não repetir receita que já existe no app.
8. A cada 10 receitas no canal vai uma "💡 DICA" de propaganda (lista em `calculadora/canal/dicas.md`).
   Quando fechar um lote de 10, entregar também a dica seguinte, pronta para copiar.
9. Receitas agendadas: lote novo entra escondido ("liberarEm": "aguardando-foto", "fotoProvisoria": true). Quando a foto chega:
   foto_receita.py, tirar "fotoProvisoria" e rodar `python3 scripts/agendar.py` (libera 2 por dia, 8h e 19h de Brasília, sozinho no servidor).
   O dono (DONO_EMAIL no wrangler.toml) vê as escondidas marcadas no sumário. Numeração dos prompts pula o 13.
10. Página de postagens (só o dono; abas WhatsApp e TikTok — no TikTok vai a foto em pé 1080×1920 montada na hora e a legenda
   com "link na bio", marcação separada com id "tt:..."): https://www.leunamesoftware.com.br/quantocobrar/canal — postagens prontas (receitas liberadas
   com foto real + uma dica de `calculadora/src/dicas.json` a cada 10), botão Enviar para o WhatsApp, marca enviada com data
   (D1 canal_envios) e pede reenvio depois de 30 dias. Texto do canal de cada receita: campo "canal" (emoji, ingredientes,
   preparo) SEM quantidades; o teste test/canal.test.mjs confere. Receita nova sempre com "canal". Acabando as dicas, escreva mais.
11. Área do Dono: https://dono.leunamesoftware.com.br (endereço próprio para instalar como app separado; www…/dono/ redireciona). Login PRÓPRIO, separado das contas dos apps:
   e-mail do dono + senha só da Área do Dono (criada pelo dono no primeiro acesso; tabelas dono_acesso/dono_sessoes; calculadora/src/dono.js).
   Ferramentas separadas por cor em leuapps/public/dono/index.html: verde = WhatsApp/canais, laranja = apps da loja,
   azul = lojas de celular, roxo = administração. Ferramenta nova do dono entra lá, na cor certa.
12. Conta do dono (DONO_EMAIL = leunamesoftware@gmail.com, nos wrangler.toml da calculadora e do leuapps): tudo liberado e
    ilimitado em todos os apps, sempre (plano "dono" no Quanto Cobrar; licença vitalícia de dono criada sozinha para cada app
    com licença, como Gestacell e Radar). App novo na loja: o dono também tem que entrar liberado.
13. Padrão para os outros apps (o dono aprovou no Quanto Cobrar): página de canal do WhatsApp com postagens prontas
    (enviar, riscar com data, reenviar depois de 30 dias) e barra de pesquisa no conteúdo. Repetir nos próximos apps.
14. Canal do WhatsApp "Quanto Devo Cobrar?": https://whatsapp.com/channel/0029Vb8MlEi2phHVVGNFfB1Y
    — é o link da bio do TikTok (as fotos e vídeos dizem "veja na bio": a conta ainda não tem o campo Site). Atalho na Área do Dono.
15. Play Store: a conta foi bloqueada/cancelada. Esquecer a Play Store; tudo sai só pela LeuApps.
16. Gestacell (`leuapps/public/gestacell/`): o dono entra com o e-mail dele e a senha da Área do Dono
    (ou a conta da loja). Dono da loja que esqueceu a senha local: "Sou o dono da loja e esqueci a senha"
    (prova com a conta da compra e cria senha nova). Calculadoras: conserto, parcelas, venda e taxas da maquininha;
    contas testadas em `leuapps/test/calculadoras.test.mjs` (`node --test test/*.test.mjs` em `leuapps/`).
17. Vídeos curtos (TikTok/Status, 1080×1920, sem música — a música entra no TikTok):
    receita: `python3 calculadora/scripts/video_receita.py <id>`; demonstração do app gravando a tela de verdade:
    `calculadora/scripts/demo/` (passo a passo no topo de `qc-montar.py`). Repetir o mesmo para os outros apps.
18. Brindes (presente, sem compra): o dono libera só o e-mail na Área do Dono → "Brindes". A pessoa toca em Entrar,
    põe esse e-mail e cria a senha que quiser; já entra com o Pro. Nunca pedir nem guardar a senha de ninguém para o dono.
    Tabela `brindes` (migração 0008), regra em `calculadora/src/brindes.js`. Padrão a repetir nos outros apps.
19. LeuApps para Android (loja de verdade, fora da Play): código em `leuapps/android` (Kotlin, WebView da loja +
    ponte LeuNativo: instalar com PackageInstaller, abrir, desinstalar). APK gerado pelo workflow
    `leuapps-android.yml` (repositório Leunamesite, branch padrão) → www.leunamesoftware.com.br/baixar/leuapps.apk;
    o mesmo workflow gera o Gestacell da loja (/baixar/gestacell.apk). Cada app no apps.json tem `android`
    {pacote, apk, versao}: subir `versao` faz aparecer "Atualizar" na loja.
20. LeuBurger PDV (`leuburger/`, React + Hono no Worker `leuburger`, D1 `leuburger`): caixa de lanchonete em
    https://leuburger.leunamesoftware.com.br. Dono da lanchonete entra com a conta LeuApps; funcionários com login próprio
    (Configurações → Usuários). Testes: `npm test` em `leuburger/`. Publicar: workflow `leuburger-publicar.yml` (Leunamesite).
    Preço: R$ 29,90/mês ou R$ 149,90 vitalício (planos.js), 7 dias grátis. Acompanhar pedidos (/acompanhar): link do cliente
    /p/<token_cliente> (só vê) e do entregador /m/<token_entregador> (marca saí/entreguei), sem login.
    App dos clientes Pedêê (marca do dono; constante NOME_APP em src/web/pedir/main.tsx e src/api/online.ts):
    https://leuburger.leunamesoftware.com.br/pedir/ (link de cada loja: /pedir/<slug>). Pedido do app cai em Acompanhar
    para aceitar/recusar; aceitar vira venda. Só plano mensal (vitalício fora de venda: foraDeVenda em planos.js).
