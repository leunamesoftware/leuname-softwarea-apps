import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/app_config.dart';
import '../../data/api/api_merchant_repository.dart';
import '../../data/models/merchant_dashboard.dart';
import '../../data/repositories/merchant_repository.dart';
import '../../demo/demo_merchant_repository.dart';
import '../auth/session_providers.dart';

final merchantRepositoryProvider = Provider<MerchantRepository>(
  (ref) => AppConfig.isDemo
      ? DemoMerchantRepository()
      : ApiMerchantRepository(ref.watch(apiClientProvider)),
);

final merchantDashboardProvider = FutureProvider<MerchantDashboard>(
  (ref) => ref.watch(merchantRepositoryProvider).fetchDashboard(),
);
