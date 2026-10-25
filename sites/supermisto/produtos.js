/* Catálogo Super Misto: linhas de produto conforme as atividades do CNPJ 13.580.397/0001-80
   (temperos, molhos e condimentos; conservas de legumes e de frutas; amidos e féculas; outros alimentos; envase).
   emb: pouch (sachê) | pote | garrafa | saco. cor: cor do produto na janela da embalagem. */
const LINHAS = [
  { id: 'puros', nome: 'Temperos puros', emoji: '🌶️', cor: '#D8401E', desc: 'Especiarias moídas e em grão, puras e cheirosas.' },
  { id: 'misturas', nome: 'Misturas e blends', emoji: '🥘', cor: '#C99A3B', desc: 'Receitas exclusivas que já dão sabor à comida.' },
  { id: 'churrasco', nome: 'Linha churrasco', emoji: '🔥', cor: '#B5512F', desc: 'Para carne na brasa ficar inesquecível.' },
  { id: 'ervas', nome: 'Ervas desidratadas', emoji: '🌿', cor: '#6E8B3D', desc: 'Folhas e ervas secas com aroma de horta.' },
  { id: 'sais', nome: 'Sais temperados', emoji: '🧂', cor: '#B9A27A', desc: 'Sal com alho, ervas e especiarias.' },
  { id: 'molhos', nome: 'Molhos e condimentos', emoji: '🫙', cor: '#9E1B14', desc: 'Molhos de pimenta, alho e condimentos prontos.' },
  { id: 'conservas', nome: 'Conservas', emoji: '🥒', cor: '#7E9A3A', desc: 'Picles, pimentas e ovos de codorna em conserva.' },
  { id: 'doces', nome: 'Doces e compotas', emoji: '🍑', cor: '#E08A2E', desc: 'Frutas em calda, geleias e doces caseiros.' },
  { id: 'amidos', nome: 'Amidos e farofas', emoji: '🌾', cor: '#E9DFC7', desc: 'Polvilhos, féculas e farofas temperadas.' },
];

const P = (nome, linha, cor, desc, usos, tam, emb = 'pouch', tag = '') => ({ nome, linha, cor, desc, usos, tam, emb, tag });
const T = ['50 g', '100 g', '500 g', '1 kg'];
const PRODUTOS = [
  // puros
  P('Colorau', 'puros', '#D8401E', 'Fubá de milho e urucum: cor vermelha viva e sabor suave.', 'Arroz, feijão, frango, moquecas e ensopados.', ['10 g'], 'pouch', ''),
  P('Pimenta-do-reino moída', 'puros', '#3A3330', 'Moída na nossa fábrica, com aroma forte e picância na medida.', 'Carnes, aves, peixes, saladas, sopas e molhos.', ['10 g'], 'pouch', ''),
  P('Cominho moído', 'puros', '#A9762E', 'Sabor marcante da cozinha nordestina.', 'Feijão, carne moída, quibe e carnes.', T),
  P('Páprica doce', 'puros', '#E2572B', 'Sabor suave e cor intensa.', 'Frango, batatas, molhos e ovos.', T),
  P('Páprica defumada', 'puros', '#A8341C', 'Aroma de defumado sem precisar de churrasqueira.', 'Carnes, feijão tropeiro, hambúrgueres e caldos.', T),
  P('Páprica picante', 'puros', '#C2311A', 'Para quem gosta de um toque ardido.', 'Carnes, linguiças, molhos e petiscos.', T),
  P('Açafrão-da-terra (cúrcuma)', 'puros', '#E8A317', 'Cor dourada e sabor terroso.', 'Arroz, frango, ovos e caldos.', T),
  P('Alho em pó', 'puros', '#E7D6A8', 'Todo o sabor do alho, sem precisar descascar.', 'Refogados, carnes, molhos e pães de alho.', T),
  P('Cebola em pó', 'puros', '#E5CF9C', 'Sabor de cebola refogada em segundos.', 'Molhos, sopas, carnes e patês.', T),
  P('Noz-moscada moída', 'puros', '#8C5A2B', 'Aroma quente e adocicado.', 'Molho branco, purês, doces e bebidas.', ['50 g', '100 g', '500 g']),
  P('Canela em pó', 'puros', '#9C5B2E', 'Doce e perfumada.', 'Doces, bolos, mingau, frutas e bebidas.', T),
  P('Cravo-da-índia', 'puros', '#4E2A1E', 'Botões inteiros, de aroma intenso.', 'Doces em calda, quentão, carnes e conservas.', ['50 g', '100 g', '500 g']),
  P('Pimenta calabresa', 'puros', '#B32A17', 'Flocos de pimenta vermelha seca.', 'Pizzas, massas, molhos e carnes.', T),
  P('Gengibre em pó', 'puros', '#D9B26A', 'Picante e refrescante.', 'Carnes, peixes, chás e doces.', T),
  P('Mostarda em grão', 'puros', '#C8A33F', 'Grãos amarelos para conservas e molhos.', 'Picles, molhos e marinadas.', T),
  // misturas
  P('Tempero completo', 'misturas', '#C99A3B', 'Sal, alho, cebola, salsa, colorau, pimentão e ervas: mais sabor em uma colher.', 'Carnes, aves, peixes, saladas, legumes e sopas.', ['10 g'], 'pouch', ''),
  P('Tempero baiano', 'misturas', '#D96A1E', 'Mistura de especiarias com cor e sabor da Bahia.', 'Carnes, frango, peixes e feijão.', T),
  P('Lemon pepper', 'misturas', '#E3C34A', 'Limão e pimenta-do-reino na medida certa.', 'Peixes, frango, saladas e legumes.', T),
  P('Ervas finas', 'misturas', '#7C9A48', 'Salsa, cebolinha, manjericão, orégano e alecrim.', 'Massas, molhos, pães e carnes brancas.', T),
  P('Tempero para frango', 'misturas', '#D99A3A', 'Receita própria para frango suculento e dourado.', 'Frango assado, frito e grelhado.', T),
  P('Tempero para peixe', 'misturas', '#D7C26A', 'Ervas e limão para realçar o peixe.', 'Peixes e frutos do mar.', T),
  P('Tempero para feijão', 'misturas', '#8B5E34', 'Louro, cominho, alho e cebola: feijão com gosto de casa.', 'Feijão, tropeiro e caldos.', T),
  P('Tempero para arroz', 'misturas', '#E5C77A', 'Alho, cebola e ervas para arroz soltinho e cheiroso.', 'Arroz branco, risotos e legumes.', T),
  P('Curry', 'misturas', '#D4A019', 'Mistura indiana de cúrcuma, coentro e especiarias.', 'Frango, legumes, arroz e molhos.', T),
  P('Tempero para saladas', 'misturas', '#6E8B3D', 'Ervas secas, alho e um toque de limão.', 'Saladas, legumes e molhos de azeite.', T),
  P('Tempero para pizza', 'misturas', '#8FA34D', 'Orégano, manjericão e alho.', 'Pizzas, molhos de tomate e bruschettas.', T),
  P('Tempero para carne moída', 'misturas', '#A65A2E', 'Equilíbrio de cominho, páprica e alho.', 'Carne moída, recheios e hambúrgueres.', T),
  // churrasco
  P('Chimichurri', 'churrasco', '#6E8B3D', 'Ervas, alho e pimenta: o clássico da parrilla.', 'Carnes na brasa, pães e legumes grelhados.', T, 'pouch', ''),
  P('Tempero para churrasco', 'churrasco', '#B5512F', 'Sal, alho, pimenta e especiarias para carne vermelha.', 'Picanha, maminha, costela e linguiça.', T),
  P('Sal de parrilla', 'churrasco', '#D9CFC0', 'Sal grosso moído no ponto certo para a grelha.', 'Carnes vermelhas e cortes nobres.', ['500 g', '1 kg']),
  P('Dry rub defumado', 'churrasco', '#7A2E1A', 'Mistura de páprica defumada, açúcar mascavo e especiarias.', 'Costela, porco e frango no estilo americano.', T),
  P('Tempero para costela', 'churrasco', '#8C3B22', 'Receita para costela macia e saborosa.', 'Costela bovina e suína.', T),
  // ervas
  P('Orégano', 'ervas', '#6F7F3A', 'Folhas selecionadas com perfume marcante.', 'Pizzas, molhos, saladas e carnes.', T, 'pouch', ''),
  P('Salsa desidratada', 'ervas', '#4F7A2A', 'Cor verde viva e sabor fresco.', 'Arroz, sopas, molhos e peixes.', T),
  P('Cebolinha desidratada', 'ervas', '#5B8A33', 'Sabor suave de cebola verde.', 'Omeletes, sopas, patês e arroz.', T),
  P('Manjericão', 'ervas', '#3F6E2B', 'Aroma doce e fresco.', 'Molho de tomate, massas e pizzas.', T),
  P('Alecrim', 'ervas', '#5E7348', 'Folhas aromáticas e resinosas.', 'Batatas, carnes assadas e pães.', T),
  P('Louro em folha', 'ervas', '#7C8A4A', 'Folhas inteiras e perfumadas.', 'Feijão, molhos, carnes e conservas.', ['50 g', '100 g', '500 g']),
  P('Tomilho', 'ervas', '#6E7A45', 'Sabor delicado e herbal.', 'Carnes, aves, molhos e legumes.', T),
  P('Coentro em grão', 'ervas', '#B9A25E', 'Sementes de aroma cítrico.', 'Conservas, curry, carnes e linguiças.', T),
  // sais
  P('Sal com alho', 'sais', '#E8DDC2', 'Sal e alho na medida certa.', 'Carnes, legumes, arroz e feijão.', ['500 g', '1 kg']),
  P('Sal de ervas', 'sais', '#C9CFA4', 'Sal com ervas finas, com menos sódio no prato.', 'Saladas, carnes, ovos e legumes.', ['100 g', '500 g', '1 kg']),
  P('Sal grosso temperado', 'sais', '#D7C9AE', 'Sal grosso com alho e pimenta.', 'Churrasco e carnes assadas.', ['500 g', '1 kg']),
  // molhos
  P('Molho de pimenta vermelha', 'molhos', '#B3170F', 'Pimenta vermelha com vinagre e sal, ardência equilibrada.', 'Pastéis, feijão, carnes e petiscos.', ['150 ml'], 'garrafa', 'Novidade'),
  P('Molho shoyu', 'molhos', '#3B1A10', 'Molho de soja escuro, salgadinho na medida.', 'Yakisoba, arroz, carnes, legumes e marinadas.', ['150 ml'], 'garrafa', 'Novidade'),
  P('Molho de pimenta malagueta', 'molhos', '#C9341A', 'Malagueta curtida no estilo tradicional.', 'Feijoada, peixes e moquecas.', ['150 ml', '500 ml', '1 L'], 'garrafa'),
  P('Molho de alho', 'molhos', '#E9E2CC', 'Cremoso e com muito sabor de alho.', 'Churrasco, lanches e batatas.', ['150 ml'], 'garrafa', 'Novidade'),
  P('Tempero pastoso de alho e sal', 'molhos', '#E6DDBE', 'Alho e sal batidos, prontos para o refogado.', 'Arroz, feijão, carnes e legumes.', ['300 g', '1 kg'], 'pote'),
  P('Tempero verde pastoso', 'molhos', '#5C8A2E', 'Salsa, cebolinha, alho e cebola batidos.', 'Carnes, peixes, ovos e refogados.', ['300 g', '1 kg'], 'pote'),
  P('Molho barbecue', 'molhos', '#5A1E10', 'Agridoce e defumado.', 'Costelinha, hambúrgueres e frango.', ['300 ml', '1 L'], 'garrafa'),
  // conservas
  P('Pimenta biquinho em conserva', 'conservas', '#D63A1C', 'Pimenta doce e crocante, quase sem ardor.', 'Petiscos, saladas e tábuas de frios.', ['200 g', '500 g'], 'pote', ''),
  P('Pimenta dedo-de-moça em conserva', 'conservas', '#B5160E', 'Pimentas inteiras curtidas no vinagre.', 'Feijão, carnes e molhos.', ['200 g', '500 g'], 'pote'),
  P('Ovos de codorna em conserva', 'conservas', '#E8DCC0', 'Ovos de codorna cozidos e temperados.', 'Petiscos, saladas e espetinhos.', ['300 g', '1 kg'], 'pote'),
  P('Picles de pepino', 'conservas', '#8BA34A', 'Pepinos crocantes em conserva agridoce.', 'Lanches, saladas e petiscos.', ['300 g', '1 kg'], 'pote'),
  P('Picles misto', 'conservas', '#A7B04C', 'Cenoura, couve-flor, pepino e cebola em conserva.', 'Saladas, tábuas e acompanhamentos.', ['300 g', '1 kg'], 'pote'),
  P('Cebolinha em conserva', 'conservas', '#EEE5CF', 'Cebolinhas pequenas curtidas no vinagre.', 'Petiscos, carnes e saladas.', ['300 g', '1 kg'], 'pote'),
  P('Azeitona temperada', 'conservas', '#55602A', 'Azeitonas com ervas e alho.', 'Pizzas, saladas, petiscos e tábuas.', ['300 g', '1 kg'], 'pote'),
  // doces
  P('Goiabada cascão', 'doces', '#8C1C1C', 'Doce de goiaba com pedaços, do jeito tradicional.', 'Com queijo, em bolos e sobremesas.', ['300 g', '1 kg'], 'pote'),
  P('Doce de leite', 'doces', '#B87533', 'Cremoso, feito no tacho.', 'Recheios, pães, bolos e sobremesas.', ['300 g', '1 kg'], 'pote'),
  P('Pêssego em calda', 'doces', '#F0A44A', 'Metades de pêssego em calda leve.', 'Sobremesas, tortas e pavês.', ['500 g'], 'pote'),
  P('Figo em calda', 'doces', '#5E2B33', 'Figos inteiros cozidos em calda.', 'Sobremesas e tábuas de queijos.', ['500 g'], 'pote'),
  P('Geleia de pimenta', 'doces', '#C42A20', 'Doce e picante ao mesmo tempo.', 'Queijos, carnes e torradas.', ['200 g'], 'pote', 'Novidade'),
  P('Geleia de morango', 'doces', '#B5172B', 'Morangos cozidos com pedaços.', 'Pães, torradas, bolos e iogurtes.', ['200 g'], 'pote'),
  P('Doce de abóbora com coco', 'doces', '#E58A1F', 'Doce caseiro de abóbora com coco ralado.', 'Sobremesa e café da tarde.', ['300 g', '1 kg'], 'pote'),
  // amidos
  P('Polvilho doce', 'amidos', '#F3EFE6', 'Fécula de mandioca fina e branca.', 'Biscoitos, sequilhos e pão de queijo.', ['500 g', '1 kg'], 'saco'),
  P('Polvilho azedo', 'amidos', '#EFEAE0', 'Fermentado naturalmente, ideal para pão de queijo crocante.', 'Pão de queijo e biscoito de polvilho.', ['500 g', '1 kg'], 'saco'),
  P('Fécula de mandioca', 'amidos', '#F5F1E8', 'Amido puro de mandioca.', 'Engrossar caldos, molhos, tapiocas e bolos.', ['500 g', '1 kg'], 'saco'),
  P('Farinha de mandioca temperada', 'amidos', '#E2C27E', 'Farinha torrada com alho e cebola.', 'Farofas, carnes e feijoada.', ['500 g', '1 kg'], 'saco'),
  P('Farofa pronta tradicional', 'amidos', '#D9A64E', 'Farofa crocante com bacon e temperos.', 'Churrasco, frango e feijoada.', ['250 g', '500 g'], 'saco', ''),
  P('Farofa de alho', 'amidos', '#E3C98A', 'Farofa dourada com alho frito.', 'Churrasco, carnes e arroz.', ['250 g', '500 g'], 'saco'),
];

/* Desenho da embalagem em SVG, com a marca e o nome do produto (assim todos os produtos têm "foto" no mesmo padrão). */
function quebra(txt, max = 13) {
  const linhas = []; let atual = '';
  for (const p of txt.split(' ')) {
    if ((atual + ' ' + p).trim().length > max && atual) { linhas.push(atual); atual = p; } else atual = (atual + ' ' + p).trim();
  }
  return [...linhas, atual].slice(0, 3);
}
function escapar(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
let _id = 0;
function embalagem(p, peso) {
  const id = 'e' + (++_id);
  const nomes = quebra(p.nome, p.emb === 'garrafa' ? 11 : 13);
  const fs = nomes.length > 2 ? 11 : 13;
  // cada linha cabe na largura do rótulo: diminui a letra se a palavra for comprida
  const largura = p.emb === 'garrafa' ? 54 : p.emb === 'pote' ? 96 : 72;
  const tamLinha = (l) => Math.min(fs, largura / (l.length * 0.6));
  const textoNome = (cx, y0) => nomes.map((l, i) => `<text x="${cx}" y="${y0 + i * (fs + 2)}" text-anchor="middle" font-size="${tamLinha(l).toFixed(1)}" font-weight="800" fill="#005A24">${escapar(l)}</text>`).join('');
  const marca = (cx, y) => `<rect x="${cx - 32}" y="${y - 5}" width="64" height="19" rx="8" fill="#fff" transform="rotate(-4 ${cx} ${y + 5})"/><text x="${cx}" y="${y + 9}" text-anchor="middle" font-size="12" font-weight="800" fill="#017130" textLength="54" lengthAdjust="spacingAndGlyphs" transform="rotate(-4 ${cx} ${y + 5})">Supermisto</text>`;
  const grao = `<pattern id="${id}g" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#000" opacity=".18"/><circle cx="5.5" cy="5" r=".9" fill="#fff" opacity=".18"/></pattern>`;
  const defs = `<defs>${grao}<linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset=".25" stop-color="#fff" stop-opacity=".12"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient></defs>`;
  let corpo;
  if (p.emb === 'pote') {
    corpo = `<rect x="34" y="14" width="92" height="26" rx="6" fill="#005A24"/><rect x="34" y="34" width="92" height="6" fill="#004A1E"/>
      <path d="M30 44 h100 a8 8 0 0 1 8 8 v118 a14 14 0 0 1 -14 14 h-88 a14 14 0 0 1 -14 -14 v-118 a8 8 0 0 1 8 -8z" fill="${p.cor}"/>
      <path d="M30 44 h100 a8 8 0 0 1 8 8 v118 a14 14 0 0 1 -14 14 h-88 a14 14 0 0 1 -14 -14 v-118 a8 8 0 0 1 8 -8z" fill="url(#${id}g)"/>
      <rect x="30" y="72" width="108" height="86" rx="6" fill="#fff"/><rect x="30" y="72" width="108" height="30" rx="6" fill="#017130"/>
      ${marca(84, 85)}${textoNome(84, 118)}<text x="84" y="152" text-anchor="middle" font-size="10" font-weight="700" fill="#F57C00">${escapar(peso)}</text>
      <path d="M30 44 h100 a8 8 0 0 1 8 8 v118 a14 14 0 0 1 -14 14 h-88 a14 14 0 0 1 -14 -14 v-118 a8 8 0 0 1 8 -8z" fill="url(#${id}b)"/>`;
  } else if (p.emb === 'garrafa') {
    corpo = `<rect x="70" y="8" width="20" height="16" rx="3" fill="#005A24"/><path d="M72 24 h16 v18 c0 10 22 16 22 34 v94 a12 12 0 0 1 -12 12 h-36 a12 12 0 0 1 -12 -12 v-94 c0 -18 22 -24 22 -34z" fill="${p.cor}"/>
      <rect x="50" y="86" width="60" height="78" rx="6" fill="#fff"/><rect x="50" y="86" width="60" height="28" rx="6" fill="#017130"/>
      ${marca(80, 98)}${textoNome(80, 128)}<text x="80" y="158" text-anchor="middle" font-size="9" font-weight="700" fill="#F57C00">${escapar(peso)}</text>
      <path d="M72 24 h16 v18 c0 10 22 16 22 34 v94 a12 12 0 0 1 -12 12 h-36 a12 12 0 0 1 -12 -12 v-94 c0 -18 22 -24 22 -34z" fill="url(#${id}b)"/>`;
  } else if (p.emb === 'saco') {
    corpo = `<path d="M30 20 l10 -8 h80 l10 8 v150 a8 8 0 0 1 -8 8 h-84 a8 8 0 0 1 -8 -8z" fill="#fff"/><path d="M30 20 l10 -8 h80 l10 8 v10 h-100z" fill="#017130"/>
      <rect x="30" y="30" width="100" height="44" fill="#017130"/>${marca(80, 47)}
      <rect x="44" y="118" width="72" height="44" rx="8" fill="${p.cor}"/><rect x="44" y="118" width="72" height="44" rx="8" fill="url(#${id}g)"/>
      ${textoNome(80, 90)}<text x="80" y="174" text-anchor="middle" font-size="9" font-weight="700" fill="#F57C00">${escapar(peso)}</text>
      <path d="M30 20 l10 -8 h80 l10 8 v150 a8 8 0 0 1 -8 8 h-84 a8 8 0 0 1 -8 -8z" fill="url(#${id}b)"/>`;
  } else {
    // sachê stand-up: lacre serrilhado em cima, laterais abrindo e fundo arredondado
    const forma = 'M40 14 h80 l3 12 c5 40 9 90 9 142 a10 10 0 0 1 -10 10 h-84 a10 10 0 0 1 -10 -10 c0 -52 4 -102 9 -142 z';
    corpo = `<path d="${forma}" fill="#017130"/><path d="M40 14 h80 l3 12 h-86z" fill="#005A24"/>
      <path d="M43 20 h74" stroke="#FFB547" stroke-width="1.2" stroke-dasharray="3 3" opacity=".7"/>
      ${marca(80, 46)}
      <rect x="44" y="64" width="72" height="46" rx="8" fill="#fff"/>${textoNome(80, 81)}
      <path d="M46 118 h68 c4 18 6 34 6 46 a8 8 0 0 1 -8 8 h-64 a8 8 0 0 1 -8 -8 c0 -12 2 -28 6 -46z" fill="${p.cor}"/>
      <path d="M46 118 h68 c4 18 6 34 6 46 a8 8 0 0 1 -8 8 h-64 a8 8 0 0 1 -8 -8 c0 -12 2 -28 6 -46z" fill="url(#${id}g)"/>
      <text x="80" y="164" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fff" stroke="#005A24" stroke-width="2.5" paint-order="stroke">${escapar(peso)}</text>
      <path d="${forma}" fill="url(#${id}b)"/>`;
  }
  return `<svg viewBox="0 0 160 190" role="img" aria-label="${escapar(p.nome)} Super Misto" font-family="Poppins, Arial, sans-serif">${defs}<ellipse cx="80" cy="184" rx="58" ry="5" fill="#000" opacity=".12"/>${corpo}</svg>`;
}

// Linha Supermisto em sachê/pacote: os mesmos tamanhos em todos os sabores.
const LINHA_PACOTES = ['Colorau', 'Pimenta-do-reino moída', 'Cominho moído', 'Páprica doce', 'Páprica defumada', 'Açafrão-da-terra (cúrcuma)',
  'Alho em pó', 'Cebola em pó', 'Canela em pó', 'Pimenta calabresa', 'Tempero completo', 'Tempero baiano', 'Lemon pepper', 'Chimichurri', 'Orégano'];
PRODUTOS.forEach((p) => { if (LINHA_PACOTES.includes(p.nome)) p.tam = ['10 g', '50 g', '100 g', '1 kg']; });
