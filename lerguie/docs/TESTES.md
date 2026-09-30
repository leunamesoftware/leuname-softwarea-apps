# Checklist de testes — Lerguie V1

Automáticos (rodam no CI a cada push): `./gradlew testDebugUnitTest` (comandos de voz,
composição honesta da visão, alertas, enquadramento, cores, planos essenciais sempre livres,
divisão de fala) e `npm test` no backend (tokens, planos, rotas protegidas).

Testes manuais em aparelho real — marque cada item. Faça ao menos uma rodada com **TalkBack
ligado** e outra com **fonte do sistema no máximo**.

## Ver
- [ ] Permissão de câmera: explicação aparece antes; negar → tela com "Permitir"; negar de vez → botão abre configurações.
- [ ] Tirar foto de objeto comum → resultado com "Identificado", leitura automática por voz.
- [ ] Objeto duvidoso/escuro → fala "Não tenho certeza…" ou "Não consegui identificar com segurança".
- [ ] Escada, faca, veículo próximo → "Atenção." primeiro + vibração de alerta.
- [ ] Modo Pessoa: descreve roupa/ação, **nunca** nome ou identidade.
- [ ] Sem internet → aviso "descrição simplificada feita no aparelho".
- [ ] Descrição automática: fala só quando muda; desligar para de falar; bateria sem aquecimento anormal em 5 min.
- [ ] Galeria e lanterna funcionam. Salvar / Compartilhar / Ouvir novamente / Tirar outra foto.

## Ler
- [ ] Orientação por voz: "mova para a esquerda/direita", "aproxime", "texto enquadrado".
- [ ] Documento A4, página de livro, embalagem, letra pequena, tela de computador.
- [ ] Trechos ruins aparecem como "[trecho pouco legível]" (nada inventado) + aviso.
- [ ] Leitura destaca o bloco atual; Pausar/Continuar retoma do bloco; velocidade; texto maior/menor.
- [ ] Código de barras de produto (EAN) → número + nome do produto (com internet). QR code com link.
- [ ] Copiar, Compartilhar, Salvar.

## Ouvir
- [ ] Permissão de microfone com explicação.
- [ ] Texto parcial aparece enquanto a pessoa fala; frases se acumulam; cronômetro.
- [ ] Sem internet: funciona se o aparelho tiver voz offline pt-BR; caso contrário, mensagem clara.
- [ ] Copiar, Compartilhar, Salvar, Limpar.

## Comunicar
- [ ] Frase pronta → falada em voz alta e registrada na conversa.
- [ ] Digitar texto → "Falar para a outra pessoa"; "Tela cheia" mostra texto gigante.
- [ ] Microfone → resposta da outra pessoa em texto grande (+ voz se "Voz automática").
- [ ] "Mais lento" e "Ouvir novamente".
- [ ] Aba Libras informa honestamente que o reconhecimento ainda não está disponível.
- [ ] Salvar / Compartilhar / Limpar conversa.

## Comandos de voz (botão de microfone na tela inicial)
- [ ] "Lerguie, ler" / "o que estou vendo" / "ouvir" / "comunicar" / "histórico" / "ajustes".
- [ ] Em um resultado: "repetir" e "salvar". Comando desconhecido → mensagem de ajuda.

## Acessibilidade
- [ ] TalkBack lê nome e função de todos os botões (ex.: "Ver. Descreve o que você está vendo.").
- [ ] Ordem de foco lógica; títulos marcados como cabeçalho.
- [ ] Tamanho do texto 80–200% e fonte do sistema grande: nada cortado (telas rolam).
- [ ] Alto contraste, tema claro/escuro/automático.
- [ ] Vibração: padrões distintos; desligar em Ajustes silencia tudo.
- [ ] Voz pt-BR ausente → aviso e botão "Instalar voz".

## Histórico e privacidade
- [ ] Com "Salvar histórico" desligado nada é registrado automaticamente; "Salvar" registra como favorito.
- [ ] Ligado: descrições, leituras, fala e códigos entram no histórico.
- [ ] Filtros, busca, reproduzir, favoritar, compartilhar, excluir 1, excluir vários, apagar tudo (com confirmação).
- [ ] Desinstalar/reinstalar: nada restaurado de backup.

## Segurança / backend
- [ ] APK não contém chaves (`unzip -p app.apk classes*.dex | strings | grep -i "sk-ant"` vazio).
- [ ] `/v1/describe` sem token → 401; token adulterado → 401; imagem inválida → 400.
- [ ] Exceder limite por minuto → app cai para análise no aparelho sem travar.
- [ ] Cota diária (com KV) → aviso "limite diário… a função continua disponível".
- [ ] `/v1/plans` responde; `monetizationEnabled=false` → nenhuma oferta em Ajustes → Plano.

## Aparelhos
- [ ] Um aparelho modesto (2–3 GB RAM, Android 8–10) e um recente (Android 14–15).
- [ ] Tela pequena (5") e grande (6,7"+).
