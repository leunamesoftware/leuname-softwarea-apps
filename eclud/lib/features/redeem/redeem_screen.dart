import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/error_messages.dart';
import '../../data/models/partner.dart';
import '../../data/models/redemption.dart';
import '../../l10n/app_localizations.dart';
import '../partners/partner_providers.dart';
import '../savings/savings_providers.dart';
import 'widgets/coupon_active_view.dart';
import 'widgets/pin_pad.dart';

/// Tela 5 — o funcionário digita o PIN da loja para ativar o desconto.
class RedeemScreen extends ConsumerStatefulWidget {
  const RedeemScreen({super.key, required this.partnerId});

  static const pinLength = 4;

  final String partnerId;

  @override
  ConsumerState<RedeemScreen> createState() => _RedeemScreenState();
}

class _RedeemScreenState extends ConsumerState<RedeemScreen> {
  String _pin = '';
  bool _checking = false;
  String? _error;
  Redemption? _redemption;

  void _onDigit(String digit) {
    if (_checking || _pin.length >= RedeemScreen.pinLength) return;
    setState(() {
      _pin += digit;
      _error = null;
    });
    if (_pin.length == RedeemScreen.pinLength) _submit();
  }

  void _onDelete() {
    if (_checking || _pin.isEmpty) return;
    setState(() => _pin = _pin.substring(0, _pin.length - 1));
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    setState(() => _checking = true);
    try {
      final result = await ref
          .read(redemptionRepositoryProvider)
          .redeem(partnerId: widget.partnerId, pin: _pin);
      if (!mounted) return;
      setState(() {
        switch (result) {
          case RedemptionSuccess(:final redemption):
            _redemption = redemption;
            ref.invalidate(savingsHistoryProvider);
            HapticFeedback.mediumImpact();
          case RedemptionWrongPin(:final remainingAttempts):
            _error = l10n.wrongPin(remainingAttempts);
          case RedemptionLocked(:final retryAfter):
            _error = l10n.tooManyAttempts((retryAfter.inSeconds / 60).ceil());
          case RedemptionSubscriptionRequired():
            _error = l10n.subscriptionRequired;
        }
      });
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(l10n, e));
    } finally {
      if (mounted) {
        setState(() {
          _checking = false;
          if (_redemption == null) _pin = '';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final redemption = _redemption;
    final partner = ref
        .watch(partnerByIdProvider(widget.partnerId))
        .value
        ?.partner;

    if (redemption != null && partner != null) {
      return CouponActiveView(redemption: redemption, partner: partner);
    }
    return _PinEntry(
      pin: _pin,
      checking: _checking,
      error: _error,
      partner: partner,
      onDigit: _onDigit,
      onDelete: _onDelete,
    );
  }
}

class _PinEntry extends StatelessWidget {
  const _PinEntry({
    required this.pin,
    required this.checking,
    required this.error,
    required this.partner,
    required this.onDigit,
    required this.onDelete,
  });

  final String pin;
  final bool checking;
  final String? error;
  final Partner? partner;
  final ValueChanged<String> onDigit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final error = this.error;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: Text(
          l10n.redeemDiscount,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
                child: Column(
                  children: [
                    if (partner != null)
                      Text(
                        partner!.name,
                        style: const TextStyle(
                          color: AppColors.green,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    const SizedBox(height: 6),
                    Text(
                      l10n.redeemInstructions,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 16, height: 1.4),
                    ),
                    const SizedBox(height: 24),
                    PinDots(
                      length: RedeemScreen.pinLength,
                      filled: pin.length,
                      hasError: error != null,
                    ),
                    SizedBox(
                      height: 48,
                      child: Center(
                        child: checking
                            ? Text(
                                l10n.checkingPin,
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                ),
                              )
                            : error == null
                            ? null
                            : Text(
                                error,
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: AppColors.danger),
                                semanticsLabel: error,
                              ),
                      ),
                    ),
                    PinPad(
                      enabled: !checking,
                      onDigit: onDigit,
                      onDelete: onDelete,
                      deleteLabel: l10n.delete,
                    ),
                    const SizedBox(height: 16),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: OutlinedButton(
                        onPressed: () => context.pop(),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.text,
                          side: const BorderSide(color: AppColors.border),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 22,
                            vertical: 14,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Text(l10n.cancel),
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
