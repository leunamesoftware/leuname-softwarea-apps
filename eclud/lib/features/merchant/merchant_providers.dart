import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/merchant_dashboard.dart';
import '../../data/repositories/merchant_repository.dart';
import '../../demo/demo_merchant_repository.dart';

final merchantRepositoryProvider = Provider<MerchantRepository>(
  (ref) => DemoMerchantRepository(),
);

final merchantDashboardProvider = FutureProvider<MerchantDashboard>(
  (ref) => ref.watch(merchantRepositoryProvider).fetchDashboard(),
);
