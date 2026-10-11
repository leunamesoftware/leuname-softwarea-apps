/* =====================================================================
   CONFIGURAÇÃO DO SEU SITE — este é o ÚNICO arquivo que você edita.
   ---------------------------------------------------------------------
   Como editar: abra este arquivo no Bloco de Notas (Windows), TextEdit
   (Mac) ou no VS Code. Troque só o que está ENTRE ASPAS "assim".
   Não apague vírgulas, aspas, chaves { } nem colchetes [ ].
   Salve e abra o index.html no navegador para ver como ficou.

   Fotos: troque os arquivos da pasta "imagens" por fotos suas, com o
   MESMO NOME (ex.: banner.jpg). Tamanhos ideais estão no LEIA-ME.
   ===================================================================== */

window.SITE = {

  /* ---------- SUA EMPRESA ---------- */
  nome: "Viaje Bem",                         // nome que aparece no topo
  complemento: "Agência de Viagens",         // linha pequena embaixo do nome
  logo: "",                                  // deixe "" para usar o ícone ✈, ou "imagens/logo.png"
  cadastur: "00.000000.00-0",                // nº do Cadastur (obrigatório para agências) — deixe "" para esconder

  /* ---------- CONTATO ---------- */
  whatsapp: "5511999999999",                 // DDI 55 + DDD + número, só números
  mensagemWhatsapp: "Olá! Vi o site e quero ajuda para planejar uma viagem.",
  telefone: "(11) 99999-9999",
  email: "contato@viajebem.com.br",
  endereco: "Av. Paulista, 1000 — São Paulo, SP",
  horario: "Seg a Sex: 9h às 18h | Sáb: 9h às 13h",

  /* ---------- REDES SOCIAIS (deixe "" para esconder) ---------- */
  instagram: "https://instagram.com/",
  facebook: "https://facebook.com/",
  youtube: "",
  tiktok: "",

  /* ---------- CORES (códigos de cor; teste em htmlcolorcodes.com) ---------- */
  corPrincipal: "#e2694a",                   // botões e destaques
  corEscura: "#0b3b3c",                      // topo, faixas e rodapé

  /* ---------- BANNER PRINCIPAL ---------- */
  banner: {
    imagem: "imagens/banner.jpg",
    frase: "Viaje. Descubra. Viva.",
    titulo: "O mundo começa<br>onde você decide ir",
    texto: "Montamos viagens sob medida, com atendimento de verdade do começo ao fim. Você só se preocupa em aproveitar."
  },

  /* ---------- NÚMEROS DA EMPRESA ---------- */
  numeros: [
    { valor: "10+",    texto: "Anos de experiência" },
    { valor: "80+",    texto: "Destinos" },
    { valor: "3.000+", texto: "Viajantes atendidos" },
    { valor: "98%",    texto: "Clientes satisfeitos" },
    { valor: "24h",    texto: "Suporte na viagem" }
  ],

  /* ---------- DESTINOS EM DESTAQUE (quantos quiser) ---------- */
  destinos: [
    { nome: "Maragogi, Alagoas",   regiao: "Nordeste", dias: "5 dias / 4 noites",  preco: "1.890", parcelas: 10, nota: "4.9", avaliacoes: 214, imagem: "imagens/destino-1.jpg" },
    { nome: "Paris, França",       regiao: "Europa",   dias: "7 dias / 6 noites",  preco: "7.490", parcelas: 10, nota: "4.8", avaliacoes: 132, imagem: "imagens/destino-2.jpg" },
    { nome: "Roma, Itália",        regiao: "Europa",   dias: "6 dias / 5 noites",  preco: "6.990", parcelas: 10, nota: "4.8", avaliacoes: 97,  imagem: "imagens/destino-3.jpg" },
    { nome: "Bali, Indonésia",     regiao: "Ásia",     dias: "10 dias / 9 noites", preco: "9.890", parcelas: 10, nota: "4.9", avaliacoes: 58,  imagem: "imagens/destino-4.jpg" }
  ],

  /* ---------- 2 CARTÕES AO LADO DOS DESTINOS ---------- */
  destaques: [
    { titulo: "Cruzeiros inesquecíveis", texto: "Costa brasileira, Caribe e Europa a bordo dos melhores navios.", botao: "Ver cruzeiros", imagem: "imagens/destaque-1.jpg" },
    { titulo: "Ofertas da semana",       texto: "Pacotes com preço especial e vagas limitadas.",                 botao: "Ver ofertas",   imagem: "imagens/destaque-2.jpg" }
  ],

  /* ---------- TIPOS DE VIAGEM (botões) ---------- */
  tipos: [
    { icone: "⛱️", nome: "Praia" },
    { icone: "📸", nome: "Fim de semana" },
    { icone: "👨‍👩‍👧", nome: "Família" },
    { icone: "💗", nome: "Lua de mel" },
    { icone: "⛰️", nome: "Aventura" },
    { icone: "💎", nome: "Luxo" },
    { icone: "🛳️", nome: "Cruzeiro" },
    { icone: "🏛️", nome: "Cultural" }
  ],

  /* ---------- PACOTES ---------- */
  pacotes: [
    { etiqueta: "Nordeste", titulo: "Nordeste completo", texto: "Maceió, Maragogi e Porto de Galinhas no mesmo roteiro, com passeios de buggy e piscinas naturais.",
      itens: ["8 dias / 7 noites", "Aéreo + hotel com café", "Traslados inclusos"], preco: "2.990", parcelas: 10, destaque: false },
    { etiqueta: "Mais vendido", titulo: "Lua de mel em Noronha", texto: "Pousada charmosa, mergulho guiado e pôr do sol no Forte. O destino dos sonhos para começar a vida a dois.",
      itens: ["6 dias / 5 noites", "Aéreo + pousada", "Taxa de preservação inclusa"], preco: "6.490", parcelas: 12, destaque: true },
    { etiqueta: "Família", titulo: "Orlando com as crianças", texto: "Parques da Disney e Universal com ingressos, hotel perto dos parques e carro alugado.",
      itens: ["9 dias / 8 noites", "Ingressos dos parques", "Suporte em português"], preco: "8.490", parcelas: 12, destaque: false }
  ],

  /* ---------- DEPOIMENTOS ---------- */
  depoimentos: [
    { texto: "Foi a viagem mais bem organizada da nossa vida. Tudo no horário, sem dor de cabeça. Recomendo demais!", nome: "Mariana Souza", cidade: "Campinas, SP" },
    { texto: "Atendimento rápido pelo WhatsApp e preço justo. Já estamos planejando a próxima!", nome: "Carlos Almeida", cidade: "Belo Horizonte, MG" }
  ],

  /* ---------- PERGUNTAS FREQUENTES ---------- */
  perguntas: [
    { p: "Como faço para reservar?", r: "Fale com a gente pelo WhatsApp ou preencha o formulário. Um consultor monta a proposta e envia em até 24 horas." },
    { p: "Posso parcelar?", r: "Sim. Parcelamos no cartão de crédito e também aceitamos Pix com desconto." },
    { p: "Os pacotes incluem passagem aérea?", r: "Nos pacotes indicados, sim. Em todas as propostas mostramos tudo o que está incluso antes de você fechar." },
    { p: "Vocês oferecem seguro viagem?", r: "Sim. Todas as viagens podem incluir seguro com cobertura médica e de bagagem." },
    { p: "Atendem grupos e empresas?", r: "Sim, montamos roteiros para grupos, excursões, eventos e viagens corporativas." },
    { p: "E se eu tiver um problema durante a viagem?", r: "Você tem suporte direto com a nossa equipe pelo WhatsApp durante toda a viagem." }
  ],

  /* ---------- DICAS (blog) ---------- */
  dicas: [
    { etiqueta: "Planejamento", titulo: "Qual a melhor época para viajar?", texto: "Clima, alta temporada e preço: três pontos para acertar a data." },
    { etiqueta: "Bagagem",      titulo: "O que levar na mala para cada destino", texto: "Uma lista prática para não carregar peso à toa nem esquecer o importante." },
    { etiqueta: "Documentos",   titulo: "Passaporte e visto: o que você precisa", texto: "Documentos mais pedidos e com quanta antecedência providenciar." }
  ],

  /* Faixa amarela de aviso no topo (só para a demonstração). Deixe false. */
  avisoDemonstracao: true,

  /* Sua licença (1 empresa, 1 domínio). NÃO apague nem mude. */
  licenca: ""
};
