/** Culinárias do Pedêê (tipo da loja): [código, nome, emoji]. A mesma lista vale no servidor (TIPOS_LOJA em src/api/online.ts). */
export const CULINARIAS: [string, string, string][] = [
  ['acai', 'Açaí', '🍨'], ['arabe', 'Árabe', '🥙'], ['bebidas', 'Bebidas', '🥤'], ['brasileira', 'Brasileira', '🍛'], ['cafeteria', 'Cafeterias', '☕'],
  ['carnes', 'Carnes', '🥩'], ['sucos', 'Casa de Sucos', '🧃'], ['chinesa', 'Chinesa', '🥡'], ['congelados', 'Congelados', '🧊'], ['cozinha_rapida', 'Cozinha Rápida', '🍳'],
  ['doces', 'Doces & Bolos', '🍰'], ['espetinhos', 'Espetinhos', '🍢'], ['frangos', 'Frangos', '🍗'], ['frutos_mar', 'Frutos do Mar', '🦐'], ['hamburgueria', 'Hambúrguer', '🍔'],
  ['hotdog', 'Hot Dog', '🌭'], ['internacional', 'Internacional', '🌎'], ['italiana', 'Italiana', '🍝'], ['japonesa', 'Japonesa', '🍣'], ['lanches', 'Lanches', '🥪'],
  ['marmitaria', 'Marmita', '🍱'], ['mexicana', 'Mexicana', '🌮'], ['padaria', 'Padarias', '🥐'], ['pastelaria', 'Pastel', '🥟'], ['peixes', 'Peixes', '🐟'], ['pizzaria', 'Pizza', '🍕'],
  ['poke', 'Poke', '🍚'], ['regional', 'Regional', '🫓'], ['restaurante', 'Restaurante', '🍽️'], ['salgados', 'Salgados', '🧆'], ['saudavel', 'Saudável', '🥗'],
  ['sopas', 'Sopas & Caldos', '🍲'], ['sorvetes', 'Sorvetes', '🍦'], ['tapioca', 'Tapioca', '🌯'], ['variada', 'Variada', '🍱'],
];
/** As que aparecem primeiro na tela inicial (as mais pedidas). */
export const DESTAQUE = ['pizzaria', 'hamburgueria', 'japonesa', 'acai', 'lanches', 'marmitaria', 'brasileira', 'salgados', 'doces', 'saudavel', 'pastelaria', 'sorvetes'];

/** Atalhos grandes do topo da tela inicial (como “Restaurantes, Mercados…” no iFood, mas só de comida). */
export const SEGMENTOS: { id: string; nome: string; emoji: string; tipos: string[] }[] = [
  { id: 'restaurantes', nome: 'Restaurantes', emoji: '🍽️', tipos: ['restaurante', 'brasileira', 'marmitaria', 'regional', 'carnes', 'italiana', 'sopas', 'frutos_mar', 'peixes', 'internacional', 'mexicana', 'arabe', 'chinesa', 'variada'] },
  { id: 'lanchonetes', nome: 'Lanchonetes', emoji: '🥪', tipos: ['lanches', 'salgados', 'hotdog', 'cozinha_rapida', 'espetinhos', 'frangos'] },
  { id: 'hamburguerias', nome: 'Hamburguerias', emoji: '🍔', tipos: ['hamburgueria'] },
  { id: 'pizzarias', nome: 'Pizzarias', emoji: '🍕', tipos: ['pizzaria'] },
  { id: 'acaiterias', nome: 'Açaiterias', emoji: '🍨', tipos: ['acai'] },
  { id: 'sorveterias', nome: 'Sorveterias', emoji: '🍦', tipos: ['sorvetes'] },
  { id: 'pastelarias', nome: 'Pastelarias', emoji: '🥟', tipos: ['pastelaria'] },
  { id: 'docerias', nome: 'Docerias', emoji: '🍰', tipos: ['doces', 'cafeteria', 'padaria'] },
  { id: 'japonesa', nome: 'Japonesa', emoji: '🍣', tipos: ['japonesa', 'poke'] },
];
