/* =====================================================================
   CONFIGURAÇÃO DO SEU SITE — este é o ÚNICO arquivo que você edita.
   ---------------------------------------------------------------------
   Como editar: abra este arquivo no Bloco de Notas (Windows), TextEdit
   (Mac) ou no VS Code. Troque só o que está ENTRE ASPAS "assim" e os
   números dos preços. Não apague vírgulas, aspas, chaves { } nem
   colchetes [ ]. Salve e abra o index.html no navegador para ver.

   Preços: use ponto no lugar da vírgula. Ex.: 32.90 (= R$ 32,90).
   Fotos: troque os arquivos da pasta "imagens" por fotos suas, com o
   MESMO NOME (ex.: banner.jpg). Tamanhos ideais estão no LEIA-ME.
   ===================================================================== */

window.SITE = {

  /* ---------- SUA LANCHONETE ---------- */
  nome: "Burger&Pizza",                       // use & para pintar a 2ª parte de outra cor
  complemento: "Hamburgueria",                // linha pequena embaixo do nome
  logo: "imagens/logo.webp",                  // deixe "" para mostrar só o nome escrito

  /* ---------- CONTATO ---------- */
  whatsapp: "5511999999999",                  // DDI 55 + DDD + número, só números
  mensagemWhatsapp: "Olá! Vi o site e quero fazer um pedido.",
  telefone: "(11) 99999-9999",
  endereco: "Rua das Flores, 123 — Centro, São Paulo - SP",
  instagram: "https://instagram.com/",        // deixe "" para esconder
  facebook: "https://facebook.com/",

  /* ---------- HORÁRIO (mostra "Aberto agora" ou "Fechado agora") ---------- */
  horarioTexto: "Todos os dias, das 18h às 23h30",
  horario: { dias: [0, 1, 2, 3, 4, 5, 6], abre: "18:00", fecha: "23:30" },   // 0 = domingo … 6 = sábado

  /* ---------- CORES ---------- */
  corPrincipal: "#ffc21a",                    // amarelo dos botões e destaques
  corDestaque: "#e11d2e",                     // vermelho dos ícones e detalhes

  /* ---------- BANNER PRINCIPAL ---------- */
  banner: {
    imagem: "imagens/banner.jpg",             // computador (1920 × 720)
    imagemCelular: "imagens/banner-celular.jpg", // celular (800 × 860)
    frase: "Hambúrgueres e pizzas",
    titulo: "Sabor em<br><b>cada mordida!</b>", // o que estiver entre <b> e </b> fica amarelo
    texto: "Hambúrgueres artesanais, pizzas deliciosas e muito mais. Tudo feito com ingredientes de qualidade para você e sua família."
  },

  /* ---------- FAIXA DE VANTAGENS (ícones: hamburguer, entrega, seguro, estrela, relogio, pix) ---------- */
  vantagens: [
    { icone: "hamburguer", titulo: "Ingredientes selecionados", texto: "Qualidade em cada prato." },
    { icone: "entrega",    titulo: "Entrega rápida",            texto: "Seu pedido no conforto da sua casa." },
    { icone: "seguro",     titulo: "Pagamento seguro",          texto: "Pix, cartão ou dinheiro." },
    { icone: "estrela",    titulo: "Clientes satisfeitos",      texto: "Mais de 10 mil pedidos entregues." }
  ],

  /* ---------- CARDÁPIO ----------
     categorias: as abas do cardápio (ícones: hamburguer, pizza, porcao, bebida, sobremesa, combo).
     produtos: quantos quiser. "destaque: true" faz o item aparecer na aba Destaques. */
  categorias: [
    { id: "hamburgueres", nome: "Hambúrgueres", icone: "hamburguer" },
    { id: "pizzas",       nome: "Pizzas",       icone: "pizza" },
    { id: "porcoes",      nome: "Porções",      icone: "porcao" },
    { id: "bebidas",      nome: "Bebidas",      icone: "bebida" },
    { id: "sobremesas",   nome: "Sobremesas",   icone: "sobremesa" }
  ],
  produtos: [
    { categoria: "hamburgueres", nome: "Cheddar Bacon",        descricao: "Pão brioche, carne artesanal, cheddar e bacon crocante.",   preco: 32.90, imagem: "imagens/hamburguer.webp", destaque: true },
    { categoria: "hamburgueres", nome: "Clássico da Casa",     descricao: "Carne artesanal, queijo, alface, tomate e molho da casa.",  preco: 27.90, imagem: "imagens/galeria-1.jpg" },
    { categoria: "hamburgueres", nome: "Burger Duplo",         descricao: "Duas carnes, cheddar derretido, cebola roxa e picles.",    preco: 36.90, imagem: "imagens/banner-celular.jpg" },
    { categoria: "pizzas",       nome: "Calabresa Especial",   descricao: "Molho especial, calabresa, cebola e queijo.",               preco: 54.90, imagem: "imagens/pizza.webp", destaque: true },
    { categoria: "pizzas",       nome: "Pepperoni com Queijo", descricao: "Pepperoni, muçarela puxa-puxa e orégano.",                  preco: 59.90, imagem: "imagens/galeria-2.jpg" },
    { categoria: "porcoes",      nome: "Batata Especial",      descricao: "Batata frita com cheddar e bacon.",                         preco: 29.90, imagem: "imagens/porcao.webp", destaque: true },
    { categoria: "porcoes",      nome: "Batata com Carne",     descricao: "Batata frita, carne moída temperada e molho de queijo.",    preco: 34.90, imagem: "imagens/galeria-3.jpg" },
    { categoria: "bebidas",      nome: "Refrigerante",         descricao: "Lata 350 ml. Diversos sabores.",                            preco: 6.90,  imagem: "imagens/refrigerante.webp", destaque: true },
    { categoria: "bebidas",      nome: "Refri com Gelo",       descricao: "Copo de 500 ml com bastante gelo.",                         preco: 8.90,  imagem: "imagens/galeria-4.jpg" },
    { categoria: "sobremesas",   nome: "Brownie com Calda",    descricao: "Brownie de chocolate com calda quente.",                    preco: 16.90, imagem: "imagens/sobremesa.jpg" }
  ],

  /* ---------- PROMOÇÕES / COMBOS ---------- */
  promocao: {
    imagem: "imagens/combos.jpg",
    frase: "Promoções especiais",
    titulo: "Combos <b>incríveis</b>",
    texto: "Mais sabor por um preço especial."
  },
  combos: [
    { nome: "Combo Casal",   descricao: "2 Cheddar Bacon + Batata Especial + 2 refrigerantes.", preco: 79.90, de: 98.40, imagem: "imagens/hamburguer.webp" },
    { nome: "Combo Pizza",   descricao: "Pizza Calabresa Especial + 2 refrigerantes.",           preco: 62.90, de: 68.70, imagem: "imagens/pizza.webp" },
    { nome: "Combo Família", descricao: "Pizza + 2 hambúrgueres + Batata Especial + 4 refris.",  preco: 139.90, de: 171.20, imagem: "imagens/porcao.webp" }
  ],

  /* ---------- SOBRE NÓS ---------- */
  sobre: {
    imagem: "imagens/sobre.jpg",
    titulo: "Mais que hambúrgueres e pizzas,<br><b>uma experiência de sabor.</b>",
    texto: "Somos apaixonados por comida e acreditamos que um bom hambúrguer e uma pizza de qualidade aproximam as pessoas. Trabalhamos com ingredientes selecionados e muito carinho em cada pedido."
  },

  /* ---------- GALERIA (quantas fotos quiser) ---------- */
  galeria: ["imagens/galeria-1.jpg", "imagens/galeria-2.jpg", "imagens/galeria-3.jpg", "imagens/galeria-4.jpg", "imagens/galeria-5.jpg"],

  /* ---------- DEPOIMENTOS ---------- */
  depoimentos: [
    { nome: "Carlos Mendes", cidade: "São Paulo - SP",      foto: "imagens/cliente-1.jpg", texto: "Comida maravilhosa e entrega super rápida! Já pedi várias vezes e sempre chega tudo quentinho e delicioso." },
    { nome: "Ana Souza",     cidade: "Rio de Janeiro - RJ", foto: "imagens/cliente-2.jpg", texto: "Melhor pizza da região! A massa é perfeita e os ingredientes são de ótima qualidade. Recomendo demais!" },
    { nome: "Ricardo Lima",  cidade: "Belo Horizonte - MG", foto: "imagens/cliente-3.jpg", texto: "Qualidade e sabor incríveis! O atendimento é excelente e a entrega sempre no prazo. Já virou meu lugar favorito!" }
  ],

  /* ---------- PEDIDO PELO WHATSAPP ---------- */
  entrega: {
    taxa: 5.00,               // taxa de entrega (0 = grátis)
    pedidoMinimo: 20.00,      // valor mínimo do pedido para entrega (0 = sem mínimo)
    retirada: true            // true = mostra a opção "Retirar no local"
  },
  pagamentos: ["Pix", "Cartão na entrega", "Dinheiro"],

  /* ---------- NÃO MEXA DAQUI PARA BAIXO ---------- */
  avisoDemonstracao: true,
  // Licença deste site (vem preenchida no ZIP da sua compra). Vale para 1 empresa e 1 domínio.
  licenca: ""
};
