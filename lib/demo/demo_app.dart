import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme/app_theme.dart';
import '../routes/demo_router.dart';

class LeuPlaceDemoApp extends ConsumerWidget {
  const LeuPlaceDemoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(demoRouterProvider);

    return MaterialApp.router(
      title: 'LeuPlace (prévia)',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
      builder: (context, child) => Banner(
        message: 'PRÉVIA',
        location: BannerLocation.topEnd,
        color: Colors.black87,
        child: child,
      ),
    );
  }
}
