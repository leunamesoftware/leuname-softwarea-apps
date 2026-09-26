/// Categoria de anúncio, armazenada na coleção `categories`.
/// Estrutura inicial (Fase 1); a tela de gestão é construída na Fase 4.
class CategoryModel {
  final String id;
  final String name;
  final String icon;
  final int order;
  final bool active;

  const CategoryModel({
    required this.id,
    required this.name,
    required this.icon,
    this.order = 0,
    this.active = true,
  });

  factory CategoryModel.fromMap(String id, Map<String, dynamic> map) {
    return CategoryModel(
      id: id,
      name: map['name'] as String? ?? '',
      icon: map['icon'] as String? ?? '',
      order: (map['order'] as num?)?.toInt() ?? 0,
      active: map['active'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toMap() {
    return {'name': name, 'icon': icon, 'order': order, 'active': active};
  }
}
