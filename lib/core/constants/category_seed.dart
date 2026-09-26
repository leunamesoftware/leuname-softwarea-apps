import '../../data/models/category_model.dart';

/// Categorias iniciais do LeuPlace. Usadas como carga inicial do Firestore
/// (a coleção `categories` é a fonte de verdade; isto é só o valor de
/// bootstrap enquanto o painel administrativo — Fase 11 — não gerencia
/// categorias de verdade).
abstract final class CategorySeed {
  static final List<CategoryModel> initial = [
    const CategoryModel(id: 'moveis', name: 'Móveis', icon: 'moveis', order: 0),
    const CategoryModel(
      id: 'eletronicos',
      name: 'Eletrônicos',
      icon: 'eletronicos',
      order: 1,
    ),
    const CategoryModel(id: 'moda', name: 'Moda', icon: 'moda', order: 2),
    const CategoryModel(id: 'games', name: 'Games', icon: 'games', order: 3),
    const CategoryModel(
      id: 'casa',
      name: 'Casa e Decoração',
      icon: 'casa',
      order: 4,
    ),
    const CategoryModel(
      id: 'esportes',
      name: 'Esportes',
      icon: 'esportes',
      order: 5,
    ),
    const CategoryModel(
      id: 'veiculos',
      name: 'Veículos',
      icon: 'veiculos',
      order: 6,
    ),
    const CategoryModel(id: 'pets', name: 'Pets', icon: 'pets', order: 7),
    const CategoryModel(id: 'beleza', name: 'Beleza', icon: 'beleza', order: 8),
    const CategoryModel(
      id: 'ferramentas',
      name: 'Ferramentas',
      icon: 'ferramentas',
      order: 9,
    ),
    const CategoryModel(
      id: 'brinquedos',
      name: 'Brinquedos',
      icon: 'brinquedos',
      order: 10,
    ),
    const CategoryModel(
      id: 'outros',
      name: 'Outros',
      icon: 'outros',
      order: 11,
    ),
  ];
}
