import 'package:flutter/material.dart';

/// Converte a chave de ícone salva em [CategoryModel.icon] no ícone Material
/// correspondente. Mantém o modelo de dados livre de detalhes de UI.
IconData categoryIconFor(String key) {
  switch (key) {
    case 'moveis':
      return Icons.chair_outlined;
    case 'eletronicos':
      return Icons.devices_other_outlined;
    case 'moda':
      return Icons.checkroom_outlined;
    case 'games':
      return Icons.sports_esports_outlined;
    case 'casa':
      return Icons.home_outlined;
    case 'esportes':
      return Icons.sports_soccer_outlined;
    case 'veiculos':
      return Icons.directions_car_outlined;
    case 'pets':
      return Icons.pets_outlined;
    case 'beleza':
      return Icons.face_retouching_natural_outlined;
    case 'ferramentas':
      return Icons.handyman_outlined;
    case 'brinquedos':
      return Icons.toys_outlined;
    default:
      return Icons.category_outlined;
  }
}
