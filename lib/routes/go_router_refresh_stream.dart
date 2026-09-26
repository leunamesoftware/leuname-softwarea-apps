import 'dart:async';

import 'package:flutter/foundation.dart';

/// Converte um [Stream] (ex.: mudanças de autenticação) em um [Listenable],
/// para que o `go_router` reavalie o `redirect` sempre que o stream emitir.
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
