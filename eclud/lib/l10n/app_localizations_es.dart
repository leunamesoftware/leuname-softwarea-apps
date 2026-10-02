// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get appName => 'Eclud';

  @override
  String get tagline => 'EURO CLUB DE DESCUENTOS';

  @override
  String get onboardingHeadlineHighlight => 'Descuentos';

  @override
  String get onboardingHeadlineRest =>
      ' reales\nen los mejores sitios\nde tu ciudad';

  @override
  String get priceFrom => 'Solo';

  @override
  String get pricePerMonth => '/mes';

  @override
  String get priceDescription =>
      'Accede a descuentos exclusivos\nen establecimientos asociados.';

  @override
  String get startNow => 'Empezar ahora';

  @override
  String get haveAccount => '¿Ya tienes cuenta?';

  @override
  String get signIn => 'Inicia sesión';

  @override
  String get securePayment => 'Pago seguro con Stripe';

  @override
  String get categoryAll => 'Todos';

  @override
  String get categoryFood => 'Comida';

  @override
  String get categoryRestaurants => 'Restaurantes';

  @override
  String get categoryCafes => 'Cafeterías';

  @override
  String get categoryBeauty => 'Belleza';

  @override
  String get categoryLeisure => 'Ocio';

  @override
  String greeting(String name) {
    return '¡Hola, $name!';
  }

  @override
  String get greetingAnonymous => '¡Hola!';

  @override
  String get homeSubtitle => 'Explora las mejores ofertas cerca de ti.';

  @override
  String get searchHint => 'Buscar restaurantes, cafeterías, servicios...';

  @override
  String promoTitle(String percent) {
    return 'DESCUENTOS\nDE HASTA $percent';
  }

  @override
  String get promoSubtitle =>
      'Restaurantes, cafeterías, belleza\n¡y mucho más!';

  @override
  String get nearest => 'Más cercanos';

  @override
  String get seeMap => 'Ver mapa';

  @override
  String get discountLabel => 'de descuento';

  @override
  String get noResults => 'No encontramos establecimientos con esos filtros.';

  @override
  String get loadError => 'No se pudieron cargar los establecimientos.';

  @override
  String get retry => 'Reintentar';

  @override
  String get notifications => 'Notificaciones';

  @override
  String get mapSearchHint => 'Buscar en esta zona...';

  @override
  String get myLocation => 'Mi ubicación';

  @override
  String get navHome => 'Inicio';

  @override
  String get navMap => 'Mapa';

  @override
  String get navSavings => 'Mi ahorro';

  @override
  String get navProfile => 'Perfil';

  @override
  String get comingSoon => 'Próximamente';

  @override
  String get comingSoonDescription => 'Estamos preparando esta sección.';
}
