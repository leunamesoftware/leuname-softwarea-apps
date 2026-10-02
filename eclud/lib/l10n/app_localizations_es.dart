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

  @override
  String reviews(int count) {
    return '($count reseñas)';
  }

  @override
  String get noReviewsYet => 'Nuevo en Eclud';

  @override
  String get address => 'Dirección';

  @override
  String get howToGetThere => 'Cómo llegar';

  @override
  String get menu => 'Carta';

  @override
  String get seeExternalMenu => 'Ver carta externa';

  @override
  String get seeMenu => 'Ver carta';

  @override
  String get discountRuleTitle => 'Condiciones del descuento';

  @override
  String defaultDiscountRule(String percent) {
    return '$percent de descuento en el total de la cuenta. No acumulable con otras promociones.';
  }

  @override
  String get addFavorite => 'Añadir a favoritos';

  @override
  String get removeFavorite => 'Quitar de favoritos';

  @override
  String get back => 'Volver';

  @override
  String get partnerNotFound => 'Este establecimiento ya no está disponible.';

  @override
  String get linkError => 'No se pudo abrir el enlace.';

  @override
  String get redeemDiscount => 'Canjear descuento';

  @override
  String get redeemInstructions =>
      'Introduce el PIN de 4 dígitos del establecimiento para activar tu descuento.';

  @override
  String get cancel => 'Cancelar';

  @override
  String get delete => 'Borrar';

  @override
  String get checkingPin => 'Comprobando...';

  @override
  String wrongPin(int count) {
    return 'PIN incorrecto. Te quedan $count intentos.';
  }

  @override
  String tooManyAttempts(int minutes) {
    return 'Demasiados intentos. Vuelve a intentarlo en $minutes min.';
  }

  @override
  String get redeemError =>
      'No se pudo validar el PIN. Revisa tu conexión e inténtalo de nuevo.';

  @override
  String get showToStaff => 'Muestra esta pantalla al personal\n¡y disfruta!';

  @override
  String get redemptionCode => 'Código';

  @override
  String get couponActive => '¡CUPÓN ACTIVO!';

  @override
  String applyDiscount(String percent) {
    return 'Aplica $percent de descuento\nen el total de la cuenta';
  }

  @override
  String activatedAt(String time) {
    return 'Activado a las $time';
  }

  @override
  String get backToHome => 'Volver al inicio';

  @override
  String get savingsTitle => 'Mi ahorro';

  @override
  String get netSavedThisMonth => 'ahorrados\neste mes';

  @override
  String get totalSaved => 'Total ahorrado';

  @override
  String get monthlySubscription => 'Suscripción mensual';

  @override
  String get yourBenefit => 'Tu beneficio';

  @override
  String get savingsHistory => 'Historial de ahorros';

  @override
  String get noSavingsYet => 'Aún no has usado ningún descuento este mes.';

  @override
  String get addAmount => 'Añadir importe';

  @override
  String get amountPaidTitle => '¿Cuánto pagaste?';

  @override
  String get amountPaidHint => 'Importe pagado con descuento';

  @override
  String get amountInvalid => 'Introduce un importe válido.';

  @override
  String get save => 'Guardar';

  @override
  String get savingsPendingNote =>
      'Añade el importe pagado para calcular tu ahorro.';
}
