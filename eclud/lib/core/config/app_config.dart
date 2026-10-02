import 'package:latlong2/latlong.dart';

/// Configuração do app. Valores sensíveis ou que mudam por ambiente vêm de
/// `--dart-define`, nunca escritos no código.
abstract final class AppConfig {
  /// Preço mensal da assinatura, em euros.
  static const double monthlyPrice = 1.99;

  /// Desconto máximo divulgado no banner da tela inicial.
  static const int maxDiscountPercent = 20;

  /// Centro usado enquanto a localização do usuário não está disponível.
  static const LatLng defaultCenter = LatLng(40.4168, -3.7038); // Madrid

  /// Servidor de mapas. O padrão (CARTO) serve para desenvolvimento; em
  /// produção, use um provedor com plano comercial (ex.: MapTiler) via
  /// `--dart-define=MAP_TILE_URL=...`.
  static const String mapTileUrl = String.fromEnvironment(
    'MAP_TILE_URL',
    defaultValue:
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  );

  static const String mapAttribution = String.fromEnvironment(
    'MAP_ATTRIBUTION',
    defaultValue: 'OpenStreetMap · CARTO',
  );
}
