import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/error_messages.dart';
import '../../core/utils/external_links.dart';
import '../../l10n/app_localizations.dart';
import '../../routes/route_paths.dart';
import '../../widgets/eclud_logo.dart';
import '../../widgets/primary_button.dart';
import '../auth/session_providers.dart';
import 'billing_service.dart';
import 'subscription_providers.dart';

/// Tela de assinatura (venda só pela Google Play).
class SubscriptionScreen extends ConsumerStatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  ConsumerState<SubscriptionScreen> createState() => _SubscriptionState();
}

class _SubscriptionState extends ConsumerState<SubscriptionScreen> {
  StreamSubscription<BillingEvent>? _events;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _events = ref.read(billingServiceProvider)?.events.listen(_onEvent);
  }

  @override
  void dispose() {
    _events?.cancel();
    super.dispose();
  }

  Future<void> _onEvent(BillingEvent event) async {
    if (!mounted) return;
    final l10n = AppLocalizations.of(context);
    switch (event) {
      case BillingSuccess():
        await ref.read(sessionProvider.notifier).refresh();
        if (!mounted) return;
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.subscribed)));
        _leave();
      case BillingPending():
        setState(() => _busy = true);
      case BillingCanceled():
        setState(() => _busy = false);
      case BillingFailure(:final error):
        setState(() {
          _busy = false;
          _error = errorMessage(l10n, error);
        });
    }
  }

  void _leave() =>
      context.canPop() ? context.pop() : context.go(RoutePaths.home);

  Future<void> _buy() async {
    final user = ref.read(currentUserProvider);
    if (user == null) {
      context.push(
        Uri(
          path: RoutePaths.register,
          queryParameters: {'next': RoutePaths.subscribe},
        ).toString(),
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    await ref.read(billingServiceProvider)!.buy(user.id);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final billing = ref.watch(billingServiceProvider);
    final offer = ref.watch(storeOfferProvider);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: CloseButton(onPressed: _leave),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                children: [
                  const EcludMark(size: 96),
                  const SizedBox(height: 12),
                  Text(
                    l10n.subscribeTitle,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 20),
                  for (final benefit in [
                    l10n.subscribeBenefit1,
                    l10n.subscribeBenefit2,
                    l10n.subscribeBenefit3,
                  ])
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.check_circle,
                            color: AppColors.green,
                            size: 22,
                          ),
                          const SizedBox(width: 10),
                          Expanded(child: Text(benefit)),
                        ],
                      ),
                    ),
                  const SizedBox(height: 16),
                  if (billing == null)
                    _WebNotice(
                      onOpen: () => ExternalLinks.open(
                        context,
                        AppConfig.storeUrl,
                        errorMessage: l10n.linkError,
                      ),
                    )
                  else
                    offer.when(
                      loading: () => const Padding(
                        padding: EdgeInsets.all(16),
                        child: CircularProgressIndicator(),
                      ),
                      error: (_, _) => Text(l10n.storeUnavailable),
                      data: (o) => o == null
                          ? Text(
                              l10n.storeUnavailable,
                              textAlign: TextAlign.center,
                            )
                          : Column(
                              children: [
                                if (_error != null)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: Text(
                                      _error!,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        color: AppColors.danger,
                                      ),
                                    ),
                                  ),
                                _busy
                                    ? const CircularProgressIndicator()
                                    : PrimaryButton(
                                        label: l10n.subscribeCta(o.price),
                                        onPressed: _buy,
                                      ),
                                const SizedBox(height: 10),
                                Text(
                                  l10n.subscribeLegal,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                                TextButton(
                                  onPressed: _busy ? null : billing.restore,
                                  child: Text(l10n.restorePurchases),
                                ),
                              ],
                            ),
                    ),
                  Wrap(
                    alignment: WrapAlignment.center,
                    children: [
                      TextButton(
                        onPressed: () => ExternalLinks.open(
                          context,
                          AppConfig.termsUrl,
                          errorMessage: l10n.linkError,
                        ),
                        child: Text(l10n.termsOfUse),
                      ),
                      TextButton(
                        onPressed: () => ExternalLinks.open(
                          context,
                          AppConfig.privacyUrl,
                          errorMessage: l10n.linkError,
                        ),
                        child: Text(l10n.privacyPolicy),
                      ),
                    ],
                  ),
                  TextButton(
                    onPressed: _leave,
                    child: Text(
                      l10n.notNow,
                      style: const TextStyle(color: AppColors.textMuted),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _WebNotice extends StatelessWidget {
  const _WebNotice({required this.onOpen});

  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      children: [
        Text(l10n.subscribeOnAndroid, textAlign: TextAlign.center),
        const SizedBox(height: 12),
        PrimaryButton(label: l10n.openGooglePlay, onPressed: onOpen),
      ],
    );
  }
}
