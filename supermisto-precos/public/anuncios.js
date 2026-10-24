// Monta o anúncio pronto para a Shopee: título, descrição, texto da foto, prompt da imagem e dados do frete.
// Sem IA: texto fixo e testado, para funcionar sempre igual.

const IDEAL = {
  colorau: 'arroz, feijão, frango, carnes, peixes e ensopados',
  'tempero-completo': 'arroz, feijão, carnes, frango, legumes e o dia a dia',
  'pimenta-do-reino': 'carnes, aves, peixes, saladas, sopas e molhos',
  cominho: 'feijão, carnes moídas, linguiças e comida mexicana',
  chimichurri: 'churrasco, carnes grelhadas, pães e legumes assados',
  oregano: 'pizzas, molhos de tomate, saladas e carnes',
  'paprica-doce': 'frango, batatas, molhos e ovos',
  'paprica-defumada': 'carnes, frango, batatas e feijoada',
  curcuma: 'arroz, frango, legumes, sopas e golden milk',
  'alho-em-po': 'carnes, arroz, feijão, molhos e marinadas',
  'cebola-em-po': 'carnes, molhos, sopas, patês e caldos',
  'lemon-pepper': 'frango, peixes, saladas e legumes',
  'pimenta-calabresa': 'pizzas, molhos, linguiças e carnes',
  canela: 'doces, bolos, mingau, café e frutas',
  'tempero-baiano': 'moquecas, frango, peixes, feijão e arroz',
  sortido: 'carnes, frango, peixes, arroz, feijão, legumes e molhos',
};

const pesoTxt = (g) => (g >= 1000 ? `${String(+(g / 1000).toFixed(2)).replace('.', ',')} kg` : `${g} g`);

/** Peso do pacote para o frete (tempero + saquinhos + caixa/envelope) e medidas da caixa. */
export function frete(un, g) {
  const total = un * g, kg = Math.ceil((total + un * 3 + 40) / 10) / 100;
  const caixa = total <= 150 ? [16, 12, 3] : total <= 400 ? [20, 15, 5] : total <= 1100 ? [25, 20, 8] : [30, 25, 12];
  return { kg, caixa };
}

/**
 * Anúncio completo.
 * @param {{ produto: {id:string, nome:string}, un:number, g:number, preco:number, brinde?:boolean }} d
 */
export function gerarAnuncio({ produto, un, g, preco, brinde }) {
  const total = un * g, sortido = produto.id === 'sortido';
  const nome = sortido ? 'Kit Temperos Naturais Sortidos' : `${produto.nome} Supermisto`;
  const kitTxt = un > 1 ? `${un} Sachês de ${g}g = ${pesoTxt(total)}` : `Pacote ${pesoTxt(g)}`;
  let titulo = `${nome} ${kitTxt}${un > 1 && total >= 950 ? ' Completo' : ''} 100% Natural Sem Conservantes`;
  if (!sortido) titulo = titulo.replace(' Supermisto', '') + ' Supermisto';
  if (brinde) titulo += ' + Brinde';
  titulo = titulo.slice(0, 120);
  const porCem = (preco / total) * 100;
  const descricao = [
    `🌿 ${sortido ? 'Kit de temperos naturais Supermisto' : produto.nome + ' Supermisto'}: sabor de verdade para a sua cozinha.`,
    '',
    un > 1 ? `✅ ${un} sachês de ${g} g = ${pesoTxt(total)} de tempero${total >= 950 ? ' (o quilo completo)' : ''}` : `✅ Pacote de ${pesoTxt(g)}`,
    '✅ 100% natural, sem conservantes',
    '✅ Moído e embalado na hora: cheiro e cor de verdade',
    un > 1 ? '✅ Sachês práticos: abre só o que vai usar e o resto fica fresquinho' : '✅ Embalagem bem fechada, mantém o aroma',
    `✅ Sai a R$ ${porCem.toFixed(2).replace('.', ',')} a cada 100 g`,
    '',
    `📦 O que vem: ${un > 1 ? `${un} sachês de ${g} g` : `1 pacote de ${pesoTxt(g)}`}${sortido ? ' em sabores variados (a seleção pode variar conforme o estoque)' : ''}.`,
    ...(brinde ? ['🎁 Brinde: 1 sachê extra de tempero em todo pedido.'] : []),
    `🍽️ Ideal para: ${IDEAL[produto.id] || IDEAL.sortido}.`,
    '',
    '🧾 Conservação: manter em local seco, fresco e ao abrigo da luz. Após aberto, manter bem fechado.',
    '📮 Enviamos rápido e bem embalado.',
    '',
    'Produzido por SUPER MISTO TEMPEROS LTDA · CNPJ 13.580.397/0001-80 · Indústria Brasileira.',
  ].join('\n');
  const foto = [un > 1 ? `${un} SACHÊS = ${pesoTxt(total).toUpperCase()}${total >= 950 ? ' COMPLETO' : ''}` : pesoTxt(g).toUpperCase(), '100% NATURAL · SEM CONSERVANTES', ...(brinde ? ['+ BRINDE'] : [])];
  const prompt = `Foto profissional de produto para anúncio de marketplace, quadrada (1:1), alta definição. ${un > 1
    ? `${un} saquinhos transparentes pequenos de tempero, cada um com uma etiqueta verde, arrumados lado a lado em fileiras, mostrando ${sortido ? 'temperos de cores variadas (vermelho, amarelo, verde, laranja, marrom)' : produto.nome.toLowerCase()}`
    : `um pacote transparente de ${produto.nome.toLowerCase()} com etiqueta verde`} sobre bancada de madeira clara, com algumas folhas e especiarias em volta. Luz natural e suave, fundo limpo. Deixe a faixa de cima livre para eu colocar texto. NÃO escreva nenhuma palavra, letra, número ou logotipo.`;
  const f = frete(un, g);
  return { titulo, descricao, foto, prompt, preco, frete: f, categoria: 'Alimentos e Bebidas › Temperos e Especiarias' };
}
