import 'package:latlong2/latlong.dart';

/// Configuração do app. Valores sensíveis ou que mudam por ambiente vêm de
/// `--dart-define`, nunca escritos no código.
abstract final class AppConfig {
  /// Endereço da API (ex.: https://api.eclud.app). Vazio = modo
  /// demonstração, com dados locais e sem servidor.
  static const String apiUrl = String.fromEnvironment('API_URL');

  static bool get isDemo => apiUrl.isEmpty;

  /// Página do app na Play Store (único canal de venda), usada nos
  /// links compartilhados.
  static const String storeUrl =
      'https://play.google.com/store/apps/details?id=com.leunamesoftwares.eclud';

  /// Páginas legais exibidas no cadastro e no perfil (publicadas junto
  /// com o site, em web/legal/).
  static const String termsUrl = String.fromEnvironment(
    'TERMS_URL',
    defaultValue: 'https://eclud.pages.dev/legal/terminos.html',
  );
  static const String privacyUrl = String.fromEnvironment(
    'PRIVACY_URL',
    defaultValue: 'https://eclud.pages.dev/legal/privacidad.html',
  );

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
