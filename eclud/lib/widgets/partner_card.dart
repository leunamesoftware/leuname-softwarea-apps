import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/utils/formatters.dart';
import '../data/models/partner.dart';
import '../l10n/app_localizations.dart';
import 'category_style.dart';
import 'discount_badge.dart';
import 'open_status.dart';
import 'partner_image.dart';

/// Cartão de parceiro: foto, nome, categoria, distância e desconto.
class PartnerCard extends StatelessWidget {
  const PartnerCard({super.key, required this.item, this.onTap});

  final NearbyPartner item;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final partner = item.partner;

    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              PartnerImage.of(partner),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      partner.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${partner.category.label(l10n)} • ${partner.priceLabel}',
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(
                          Icons.place_outlined,
                          size: 14,
                          color: AppColors.textMuted,
                        ),
                        const SizedBox(width: 3),
                        Text(
                          Formatters.distance(item.distanceMeters, locale),
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: AppColors.textMuted,
                          ),
                        ),
                        if (partner.openingHours case final hours?) ...[
                          const Text(
                            '  ·  ',
                            style: TextStyle(color: AppColors.textMuted),
                          ),
                          Flexible(child: OpenStatus(hours: hours)),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              DiscountBadge(percent: partner.discountPercent),
            ],
          ),
        ),
      ),
    );
  }
}
