import 'package:flutter/material.dart';

import '../data/models/partner_category.dart';
import '../l10n/app_localizations.dart';

/// Ícone e rótulo de cada categoria, centralizados para todas as telas.
extension PartnerCategoryStyle on PartnerCategory {
  IconData get icon => switch (this) {
    PartnerCategory.food => Icons.restaurant,
    PartnerCategory.cafe => Icons.coffee_outlined,
    PartnerCategory.beauty => Icons.content_cut,
    PartnerCategory.leisure => Icons.confirmation_number_outlined,
  };

  String label(AppLocalizations l10n) => switch (this) {
    PartnerCategory.food => l10n.categoryFood,
    PartnerCategory.cafe => l10n.categoryCafes,
    PartnerCategory.beauty => l10n.categoryBeauty,
    PartnerCategory.leisure => l10n.categoryLeisure,
  };
}
