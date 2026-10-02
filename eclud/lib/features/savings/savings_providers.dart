import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/app_config.dart';
import '../../data/api/api_savings_repository.dart';
import '../../data/repositories/savings_repository.dart';
import '../../demo/demo_savings_repository.dart';
import '../auth/session_providers.dart';
import 'savings_entry.dart';

/// Instância única no modo demonstração, compartilhada com o resgate.
final demoSavingsRepositoryProvider = Provider<DemoSavingsRepository>(
  (ref) => DemoSavingsRepository(),
);

final savingsRepositoryProvider = Provider<SavingsRepository>(
  (ref) => AppConfig.isDemo
      ? ref.watch(demoSavingsRepositoryProvider)
      : ApiSavingsRepository(ref.watch(apiClientProvider)),
);

/// Descontos usados no mês atual. Recarrega ao trocar de usuário.
class SavingsHistory extends AsyncNotifier<List<SavingsEntry>> {
  @override
  Future<List<SavingsEntry>> build() async {
    final user = ref.watch(currentUserProvider);
    if (user == null) return const [];
    return ref.read(savingsRepositoryProvider).fetchCurrentMonth();
  }

  Future<void> setAmountPaid(String code, double amount) async {
    await ref.read(savingsRepositoryProvider).setAmountPaid(code, amount);
    final current = state.value ?? const [];
    state = AsyncData([
      for (final e in current)
        e.redemption.code == code ? e.withAmountPaid(amount) : e,
    ]);
  }
}

final savingsHistoryProvider =
    AsyncNotifierProvider<SavingsHistory, List<SavingsEntry>>(
      SavingsHistory.new,
    );

/// Resumo do mês atual.
class MonthlySavings {
  const MonthlySavings(this.entries);

  final List<SavingsEntry> entries;

  double get totalSaved => SavingsEntry.roundCents(
    entries.fold(0, (sum, e) => sum + (e.saved ?? 0)),
  );

  double get subscription => AppConfig.monthlyPrice;

  double get netBenefit => SavingsEntry.roundCents(totalSaved - subscription);
}

final monthlySavingsProvider = Provider<AsyncValue<MonthlySavings>>(
  (ref) => ref.watch(savingsHistoryProvider).whenData(MonthlySavings.new),
);
