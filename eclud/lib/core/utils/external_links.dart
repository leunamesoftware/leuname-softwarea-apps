import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

/// Abre links fora do app e avisa o usuário se não conseguir.
abstract final class ExternalLinks {
  static Future<void> open(
    BuildContext context,
    String url, {
    required String errorMessage,
  }) async {
    final uri = Uri.tryParse(url);
    // Só abre http/https: evita esquemas inesperados vindos de dados externos.
    final isWeb =
        uri != null && (uri.scheme == 'https' || uri.scheme == 'http');
    final opened =
        isWeb && await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessage)));
    }
  }

  /// Rota até o local no app de mapas do celular.
  static String directions(LatLng point) =>
      'https://www.google.com/maps/dir/?api=1'
      '&destination=${point.latitude},${point.longitude}';
}
