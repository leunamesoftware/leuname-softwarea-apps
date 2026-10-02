import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../data/models/partner.dart';
import '../data/models/partner_category.dart';
import 'category_style.dart';

/// Foto do parceiro; enquanto não houver foto, mostra o ícone da categoria.
class PartnerImage extends StatelessWidget {
  const PartnerImage({
    super.key,
    required this.category,
    this.imageUrl,
    this.size = 76,
  });

  PartnerImage.of(Partner partner, {Key? key, double size = 76})
    : this(
        key: key,
        category: partner.category,
        imageUrl: partner.imageUrl,
        size: size,
      );

  final PartnerCategory category;
  final String? imageUrl;
  final double size;

  @override
  Widget build(BuildContext context) {
    final placeholder = Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.surfaceHigh, Color(0xFF1C3A2C)],
        ),
      ),
      child: Icon(category.icon, color: AppColors.green, size: size * 0.4),
    );

    final url = imageUrl;
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox.square(
        dimension: size,
        child: url == null
            ? placeholder
            : Image.network(
                url,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => placeholder,
              ),
      ),
    );
  }
}
