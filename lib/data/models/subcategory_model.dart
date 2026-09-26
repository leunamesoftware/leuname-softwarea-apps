/// Subcategoria vinculada a uma categoria, coleção `subcategories`.
class SubcategoryModel {
  final String id;
  final String categoryId;
  final String name;
  final bool active;

  const SubcategoryModel({
    required this.id,
    required this.categoryId,
    required this.name,
    this.active = true,
  });

  factory SubcategoryModel.fromMap(String id, Map<String, dynamic> map) {
    return SubcategoryModel(
      id: id,
      categoryId: map['categoryId'] as String? ?? '',
      name: map['name'] as String? ?? '',
      active: map['active'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toMap() {
    return {'categoryId': categoryId, 'name': name, 'active': active};
  }
}
