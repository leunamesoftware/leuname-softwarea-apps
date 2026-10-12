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
  nome: "Burger&Brasa",                       // use & para pintar a 2ª parte de outra cor
  complemento: "Hamburgueria",                // linha pequena embaixo do nome
  logo: "imagens/logo.webp",                  // deixe "" para mostrar só o nome escrito

  /* ---------- CONTATO ---------- */
  whatsapp: "5511999999999",                  // WhatsApp dos PEDIDOS: DDI 55 + DDD + número, só números
  whatsappAtendimento: "",                    // WhatsApp para dúvidas e "Fale com a gente" (deixe "" para usar o mesmo dos pedidos)
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
    frase: "Hambúrgueres artesanais",
    titulo: "Sabor em<br><b>cada mordida!</b>", // o que estiver entre <b> e </b> fica amarelo
    texto: "Pão macio, carne suculenta e o seu lanche do seu jeito. Tudo feito na hora, com ingredientes de qualidade, para você e sua família."
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
       retirar: ingredientes que o cliente pode tirar (grátis).
       adicionais: extras pagos que o cliente pode pôr no lanche.
     produtos: quantos quiser. "destaque: true" faz o item aparecer na aba Destaques.
       Um produto pode ter o seu próprio "retirar" e "adicionais" (vale mais que o da categoria). */
  categorias: [
    { id: "hamburgueres", nome: "Hambúrgueres", icone: "hamburguer",
      retirar: ["Cebola", "Tomate", "Alface", "Picles", "Molho da casa"],
      adicionais: [
        { nome: "Bacon extra",      preco: 5.00 },
        { nome: "Cheddar extra",    preco: 4.00 },
        { nome: "Carne extra",      preco: 9.00 },
        { nome: "Ovo",              preco: 3.00 },
        { nome: "Maionese extra",   preco: 2.00 },
        { nome: "Cebola caramelizada", preco: 3.00 }
      ] },
    { id: "porcoes",      nome: "Porções",      icone: "porcao",
      adicionais: [ { nome: "Cheddar extra", preco: 4.00 }, { nome: "Bacon extra", preco: 5.00 }, { nome: "Maionese da casa", preco: 2.00 } ] },
    { id: "bebidas",      nome: "Bebidas",      icone: "bebida" },
    { id: "sobremesas",   nome: "Sobremesas",   icone: "sobremesa" }
  ],
  produtos: [
    { categoria: "hamburgueres", nome: "Cheddar Bacon",      descricao: "Pão brioche, carne artesanal 160 g, cheddar e bacon crocante.",   preco: 32.90, imagem: "imagens/hamburguer.webp", destaque: true },
    { categoria: "hamburgueres", nome: "Clássico da Casa",   descricao: "Carne artesanal, queijo, alface, tomate e molho da casa.",        preco: 27.90, imagem: "imagens/galeria-1.jpg", destaque: true },
    { categoria: "hamburgueres", nome: "Burger Duplo",       descricao: "Duas carnes, cheddar derretido, cebola roxa e picles.",          preco: 36.90, imagem: "imagens/banner-celular.jpg" },
    { categoria: "porcoes",      nome: "Batata Especial",    descricao: "Batata frita com cheddar e bacon.",                               preco: 29.90, imagem: "imagens/porcao.webp", destaque: true },
    { categoria: "porcoes",      nome: "Batata com Carne",   descricao: "Batata frita, carne moída temperada e molho de queijo.",          preco: 34.90, imagem: "imagens/galeria-3.jpg" },
    { categoria: "bebidas",      nome: "Refrigerante",       descricao: "Lata 350 ml. Diversos sabores.",                                  preco: 6.90,  imagem: "imagens/refrigerante.webp", destaque: true },
    { categoria: "bebidas",      nome: "Refri com Gelo",     descricao: "Copo de 500 ml com bastante gelo.",                               preco: 8.90,  imagem: "imagens/galeria-4.jpg" },
    { categoria: "sobremesas",   nome: "Brownie com Calda",  descricao: "Brownie de chocolate com calda quente.",                          preco: 16.90, imagem: "imagens/sobremesa.jpg" }
  ],

  /* ---------- PROMOÇÕES / COMBOS ---------- */
  promocao: {
    imagem: "imagens/combos.jpg",
    frase: "Promoções especiais",
    titulo: "Combos <b>incríveis</b>",
    texto: "Mais sabor por um preço especial."
  },
  combos: [
    { nome: "Combo Individual", descricao: "Cheddar Bacon + Batata Especial + refrigerante.",          preco: 59.90,  de: 69.70,  imagem: "imagens/hamburguer.webp" },
    { nome: "Combo Casal",      descricao: "2 Cheddar Bacon + Batata Especial + 2 refrigerantes.",     preco: 79.90,  de: 109.50, imagem: "imagens/porcao.webp" },
    { nome: "Combo Família",    descricao: "4 hambúrgueres + 2 Batatas Especiais + 4 refrigerantes.",  preco: 159.90, de: 206.80, imagem: "imagens/galeria-1.jpg" }
  ],

  /* ---------- SOBRE NÓS ---------- */
  sobre: {
    imagem: "imagens/sobre.jpg",
    titulo: "Mais que hambúrgueres,<br><b>uma experiência de sabor.</b>",
    texto: "Somos apaixonados por comida e acreditamos que um bom hambúrguer aproxima as pessoas. Trabalhamos com ingredientes selecionados e muito carinho em cada pedido."
  },

  /* ---------- GALERIA (quantas fotos quiser) ---------- */
  galeria: ["imagens/galeria-1.jpg", "imagens/banner-celular.jpg", "imagens/galeria-3.jpg", "imagens/galeria-4.jpg", "imagens/galeria-5.jpg"],

  /* ---------- DEPOIMENTOS ---------- */
  depoimentos: [
    { nome: "Carlos Mendes", cidade: "São Paulo - SP",      foto: "imagens/cliente-1.jpg", texto: "Comida maravilhosa e entrega super rápida! Já pedi várias vezes e sempre chega tudo quentinho e delicioso." },
    { nome: "Ana Souza",     cidade: "Rio de Janeiro - RJ", foto: "imagens/cliente-2.jpg", texto: "Melhor hambúrguer da região! O pão é macio, a carne suculenta e dá para montar do meu jeito. Recomendo demais!" },
    { nome: "Ricardo Lima",  cidade: "Belo Horizonte - MG", foto: "imagens/cliente-3.jpg", texto: "Qualidade e sabor incríveis! O atendimento é excelente e a entrega sempre no prazo. Já virou meu lugar favorito!" }
  ],

  /* ---------- PEDIDO PELO WHATSAPP ---------- */
  entrega: {
    taxa: 5.00,               // taxa de entrega (0 = grátis)
    pedidoMinimo: 20.00,      // valor mínimo do pedido para entrega (0 = sem mínimo)
    retirada: true            // true = mostra a opção "Retirar no local"
  },
  pagamentos: ["Pix", "Cartão na entrega", "Dinheiro"],
  // Itens que o cliente marca para mandar junto. Com "preco", soma no total.
  extrasPedido: [
    { nome: "Guardanapos" },
    { nome: "Sachês de ketchup e maionese" },
    { nome: "Talheres descartáveis" },
    { nome: "Pote de maionese da casa", preco: 3.00 }
  ],

  /* ---------- NÃO MEXA DAQUI PARA BAIXO ---------- */
  avisoDemonstracao: true,
  // Licença deste site (vem preenchida no ZIP da sua compra). Vale para 1 empresa e 1 domínio.
  // O crédito "Desenvolvido por LeuName Softwares" no rodapé faz parte da licença.
  licenca: ""
};
