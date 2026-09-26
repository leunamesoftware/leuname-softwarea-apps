import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme/app_theme.dart';
import 'routes/app_router.dart';

class LeuPlaceApp extends ConsumerWidget {
  const LeuPlaceApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'LeuPlace',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
    );
  }
}
