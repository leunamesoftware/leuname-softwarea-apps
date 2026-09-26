import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/constants/credit_packages.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../data/models/credit_transaction_model.dart';
import '../auth/auth_providers.dart';
import 'credit_providers.dart';

/// Tela de créditos (Fase 6): saldo, pacotes e histórico. A compra real
/// depende de um gateway de pagamento ainda não escolhido — o botão
/// "Comprar" avisa isso em vez de simular uma cobrança que não existe.
class CreditsScreen extends ConsumerWidget {
  const CreditsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(currentUserProfileProvider).value;
    final historyAsync = ref.watch(creditHistoryProvider);
    final credits = profile?.adCredits ?? 0;

    return Scaffold(
      appBar: AppBar(title: const Text('Créditos')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Use seus créditos para criar anúncios na plataforma.',
            style: AppTextStyles.bodyRegular.copyWith(
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.secondary, Color(0xFF4B1FA0)],
              ),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.confirmation_number,
                  color: Colors.white,
                  size: 36,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$credits',
                        style: AppTextStyles.displayBold.copyWith(
                          color: Colors.white,
                        ),
                      ),
                      const Text(
                        'créditos disponíveis',
                        style: TextStyle(color: Colors.white70),
                      ),
                    ],
                  ),
                ),
                const Text(
                  '1 crédito = 1 anúncio\npor 40 dias',
                  textAlign: TextAlign.right,
                  style: TextStyle(color: Colors.white, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text('Comprar créditos', style: AppTextStyles.h2),
          const SizedBox(height: 4),
          Text(
            'Escolha o melhor plano para você.',
            style: AppTextStyles.bodyRegular.copyWith(
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: CreditPackages.all.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.95,
            ),
            itemBuilder: (context, index) =>
                _PackageCard(package: CreditPackages.all[index]),
          ),
          const SizedBox(height: 24),
          Text('Histórico de créditos', style: AppTextStyles.h2),
          const SizedBox(height: 8),
          historyAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('Erro ao carregar histórico: $e'),
            data: (history) {
              if (history.isEmpty) {
                return Text(
                  'Nenhuma movimentação ainda.',
                  style: AppTextStyles.bodyRegular.copyWith(
                    color: Colors.grey.shade600,
                  ),
                );
              }
              return Column(
                children: history
                    .map((t) => _HistoryTile(transaction: t))
                    .toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _PackageCard extends StatelessWidget {
  const _PackageCard({required this.package});

  final CreditPackage package;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: package.popular
            ? AppColors.secondary.withValues(alpha: 0.06)
            : AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(16),
        border: package.popular
            ? Border.all(color: AppColors.secondary, width: 1.5)
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (package.popular)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text(
                'Mais popular',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          const Spacer(),
          Text(
            '${package.credits} créditos',
            style: AppTextStyles.titleSemiBold,
          ),
          Text(
            'R\$ ${package.price.toStringAsFixed(2)}',
            style: AppTextStyles.h2.copyWith(color: AppColors.textDark),
          ),
          Text(
            'R\$ ${package.pricePerCredit.toStringAsFixed(2)} cada',
            style: AppTextStyles.caption,
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => showDialog(
                context: context,
                builder: (_) => AlertDialog(
                  title: const Text('Pagamento ainda não configurado'),
                  content: const Text(
                    'A compra de créditos depende de um gateway de pagamento que ainda '
                    'não foi escolhido/configurado para o LeuPlace. Assim que isso for '
                    'definido, essa compra passa a funcionar de verdade.',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Entendi'),
                    ),
                  ],
                ),
              ),
              child: const Text('Comprar'),
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  const _HistoryTile({required this.transaction});

  final CreditTransactionModel transaction;

  @override
  Widget build(BuildContext context) {
    final isPositive = transaction.amount > 0;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundColor: isPositive ? AppColors.success : AppColors.danger,
        child: Icon(
          isPositive ? Icons.add : Icons.remove,
          color: Colors.white,
          size: 18,
        ),
      ),
      title: Text(transaction.description, style: AppTextStyles.bodyRegular),
      subtitle: Text(
        DateFormat('dd/MM/yyyy HH:mm').format(transaction.createdAt),
      ),
      trailing: Text(
        '${isPositive ? '+' : ''}${transaction.amount}',
        style: AppTextStyles.titleSemiBold.copyWith(
          color: isPositive ? AppColors.success : AppColors.danger,
        ),
      ),
    );
  }
}
