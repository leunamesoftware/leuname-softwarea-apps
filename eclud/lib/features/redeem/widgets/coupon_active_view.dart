import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/partner.dart';
import '../../../data/models/redemption.dart';
import '../../../l10n/app_localizations.dart';
import '../../../routes/route_paths.dart';
import '../../../widgets/category_style.dart';
import '../../../widgets/partner_image.dart';

/// Confirmação do cupom ativo, para mostrar ao funcionário.
///
/// O relógio em tempo real e o código ajudam o funcionário a perceber que
/// não é uma captura de tela antiga.
class CouponActiveView extends StatefulWidget {
  const CouponActiveView({
    super.key,
    required this.redemption,
    required this.partner,
  });

  final Redemption redemption;
  final Partner partner;

  @override
  State<CouponActiveView> createState() => _CouponActiveViewState();
}

class _CouponActiveViewState extends State<CouponActiveView>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..forward();
  late final Timer _clock;
  DateTime _now = DateTime.now();

  @override
  void initState() {
    super.initState();
    _clock = Timer.periodic(
      const Duration(seconds: 1),
      (_) => setState(() => _now = DateTime.now()),
    );
  }

  @override
  void dispose() {
    _clock.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final percent = Formatters.percent(widget.redemption.discountPercent);
    final partner = widget.partner;

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0E5A3A), Color(0xFF0A3F2A), Color(0xFF07291C)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Column(
                  children: [
                    _AnimatedCheck(animation: _controller),
                    const SizedBox(height: 20),
                    Text(
                      l10n.couponActive,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      l10n.applyDiscount(percent),
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 17, height: 1.35),
                    ),
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0x33000000),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.borderStrong),
                      ),
                      child: Row(
                        children: [
                          PartnerImage.of(partner, size: 60),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  partner.name,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${partner.category.label(l10n)} • '
                                  '${partner.priceLabel}',
                                  style: const TextStyle(
                                    color: Color(0xFFCFE6DA),
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            percent,
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      '${l10n.redemptionCode}: ${widget.redemption.code}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 2,
                        color: AppColors.gold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l10n.activatedAt(
                        DateFormat.Hms(locale)
                            .format(widget.redemption.redeemedAt),
                      ),
                      style: const TextStyle(color: Color(0xFFCFE6DA)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      DateFormat.Hms(locale).format(_now),
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        fontFeatures: [FontFeature.tabularFigures()],
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      l10n.showToStaff,
                      textAlign: TextAlign.center,
                      style: const TextStyle(height: 1.45),
                    ),
                    const SizedBox(height: 28),
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: FilledButton(
                        onPressed: () => context.go(RoutePaths.home),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.green,
                          foregroundColor: AppColors.onGreen,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          textStyle: const TextStyle(
                            fontFamily: AppTheme.fontFamily,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        child: Text(l10n.backToHome),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Selo de confirmação com raios que se abrem ao aparecer.
class _AnimatedCheck extends StatelessWidget {
  const _AnimatedCheck({required this.animation});

  final Animation<double> animation;

  @override
  Widget build(BuildContext context) {
    final scale = CurvedAnimation(parent: animation, curve: Curves.elasticOut);
    return SizedBox.square(
      dimension: 150,
      child: AnimatedBuilder(
        animation: animation,
        builder: (_, _) => CustomPaint(
          painter: _RaysPainter(animation.value),
          child: Center(
            child: Transform.scale(
              scale: scale.value,
              child: Container(
                width: 84,
                height: 84,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0x331FD07F),
                  border: Border.all(color: AppColors.green, width: 4),
                ),
                child: const Icon(
                  Icons.check_rounded,
                  size: 54,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _RaysPainter extends CustomPainter {
  _RaysPainter(this.progress);

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.green.withValues(alpha: 0.8 * progress)
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;
    final center = size.center(Offset.zero);
    const rays = 10;
    for (var i = 0; i < rays; i++) {
      final angle = -pi / 2 + i * 2 * pi / rays;
      final dir = Offset(cos(angle), sin(angle));
      final start = 52 + 6 * progress;
      final end = start + 14 * progress;
      canvas.drawLine(center + dir * start, center + dir * end, paint);
    }
  }

  @override
  bool shouldRepaint(_RaysPainter old) => old.progress != progress;
}
