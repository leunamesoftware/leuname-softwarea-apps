import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/error_messages.dart';
import '../../../data/models/review.dart';
import '../../../l10n/app_localizations.dart';
import '../../../routes/route_paths.dart';
import '../../../widgets/primary_button.dart';
import '../../auth/session_providers.dart';
import '../../partners/partner_providers.dart';

final reviewsProvider = FutureProvider.family<List<Review>, String>(
  (ref, partnerId) =>
      ref.watch(partnerRepositoryProvider).fetchReviews(partnerId),
);

/// Opiniões recentes e botão para avaliar.
class ReviewsSection extends ConsumerWidget {
  const ReviewsSection({super.key, required this.partnerId});

  final String partnerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final reviews = ref.watch(reviewsProvider(partnerId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                l10n.reviewsTitle,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            TextButton.icon(
              onPressed: () => ref.read(currentUserProvider) == null
                  ? context.push(RoutePaths.login)
                  : _openForm(context, ref),
              icon: const Icon(Icons.star_border_rounded),
              label: Text(l10n.rate),
              style: TextButton.styleFrom(foregroundColor: AppColors.gold),
            ),
          ],
        ),
        reviews.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(12),
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (_, _) => Text(
            l10n.loadError,
            style: const TextStyle(color: AppColors.textMuted),
          ),
          data: (items) => items.isEmpty
              ? Text(
                  l10n.noReviews,
                  style: const TextStyle(color: AppColors.textMuted),
                )
              : Column(
                  children: [for (final r in items) _ReviewTile(review: r)],
                ),
        ),
      ],
    );
  }

  Future<void> _openForm(BuildContext context, WidgetRef ref) async {
    final sent = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _ReviewForm(partnerId: partnerId),
    );
    if (sent == true && context.mounted) {
      ref.invalidate(reviewsProvider(partnerId));
      ref.invalidate(nearbyPartnersProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context).thanksReview)),
      );
    }
  }
}

class Stars extends StatelessWidget {
  const Stars({super.key, required this.value, this.size = 16, this.onTap});

  final int value;
  final double size;
  final ValueChanged<int>? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Semantics(
      label: l10n.starsA11y(value),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 1; i <= 5; i++)
            onTap == null
                ? Icon(
                    i <= value ? Icons.star_rounded : Icons.star_border_rounded,
                    size: size,
                    color: AppColors.gold,
                  )
                : IconButton(
                    tooltip: l10n.starsA11y(i),
                    onPressed: () => onTap!(i),
                    icon: Icon(
                      i <= value
                          ? Icons.star_rounded
                          : Icons.star_border_rounded,
                      size: size,
                      color: AppColors.gold,
                    ),
                  ),
        ],
      ),
    );
  }
}

class _ReviewTile extends StatelessWidget {
  const _ReviewTile({required this.review});

  final Review review;

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context).toLanguageTag();
    final comment = review.comment;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Stars(value: review.rating),
              const SizedBox(width: 8),
              Text(
                '${review.author} · '
                '${DateFormat.yMMMd(locale).format(review.createdAt)}',
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 12.5,
                ),
              ),
            ],
          ),
          if (comment != null && comment.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(comment, style: const TextStyle(height: 1.4)),
          ],
        ],
      ),
    );
  }
}

class _ReviewForm extends ConsumerStatefulWidget {
  const _ReviewForm({required this.partnerId});

  final String partnerId;

  @override
  ConsumerState<_ReviewForm> createState() => _ReviewFormState();
}

class _ReviewFormState extends ConsumerState<_ReviewForm> {
  final _comment = TextEditingController();
  int _rating = 0;
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final text = _comment.text.trim();
      await ref
          .read(partnerRepositoryProvider)
          .submitReview(widget.partnerId, _rating, text.isEmpty ? null : text);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(l10n, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            l10n.yourRating,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Stars(
            value: _rating,
            size: 36,
            onTap: (v) => setState(() => _rating = v),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _comment,
            maxLength: 500,
            maxLines: 3,
            decoration: InputDecoration(
              labelText: l10n.commentLabel,
              contentPadding: const EdgeInsets.all(14),
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.danger),
              ),
            ),
          _sending
              ? const CircularProgressIndicator()
              : PrimaryButton(
                  label: l10n.send,
                  onPressed: _rating == 0 ? null : _send,
                ),
        ],
      ),
    );
  }
}
