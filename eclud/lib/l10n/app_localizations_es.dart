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

  @override
  String get merchantPanel => 'Panel del comercio';

  @override
  String get merchantPanelHint =>
      'Gestiona tu establecimiento y tus descuentos.';

  @override
  String get statusActive => 'Activo';

  @override
  String get statusPaused => 'Pausado';

  @override
  String get tabSummary => 'Resumen';

  @override
  String get tabCoupons => 'Cupones';

  @override
  String get tabSettings => 'Ajustes';

  @override
  String get thisMonth => 'Este mes';

  @override
  String get validatedCoupons => 'Cupones validados';

  @override
  String get discountGranted => 'Descuento concedido';

  @override
  String get newCustomers => 'Clientes nuevos';

  @override
  String get dailyReport => 'Validaciones · últimos 30 días';

  @override
  String dailyReportA11y(int total) {
    return 'Gráfico de validaciones por día. Total: $total.';
  }

  @override
  String dayValue(String date, int count) {
    return '$date: $count cupones';
  }

  @override
  String get recentCoupons => 'Últimos cupones validados';

  @override
  String get noCoupons => 'Todavía no hay cupones validados.';

  @override
  String get visibleInApp => 'Visible en la app';

  @override
  String get visibleInAppHint =>
      'Desactívalo para pausar tus descuentos temporalmente.';

  @override
  String get discountPercentLabel => 'Porcentaje de descuento';

  @override
  String get discountRuleLabel => 'Condiciones del descuento';

  @override
  String get menuUrlLabel => 'Enlace de la carta (opcional)';

  @override
  String get newPinLabel => 'Nuevo PIN (4 dígitos)';

  @override
  String get newPinHint => 'Déjalo vacío para mantener el actual';

  @override
  String get pinInvalid => 'El PIN debe tener 4 dígitos.';

  @override
  String get urlInvalid => 'Introduce un enlace que empiece por https://';

  @override
  String get percentInvalid => 'Elige un descuento entre 5% y 50%.';

  @override
  String get settingsSaved => 'Cambios guardados.';

  @override
  String get saveChanges => 'Guardar cambios';

  @override
  String get createAccount => 'Crear cuenta';

  @override
  String get registerTitle => 'Crea tu cuenta';

  @override
  String get loginTitle => 'Inicia sesión';

  @override
  String get nameLabel => 'Nombre';

  @override
  String get emailLabel => 'Correo electrónico';

  @override
  String get passwordLabel => 'Contraseña';

  @override
  String get passwordHint => 'Mínimo 8 caracteres';

  @override
  String get showPassword => 'Mostrar contraseña';

  @override
  String get hidePassword => 'Ocultar contraseña';

  @override
  String get acceptTerms =>
      'Acepto los Términos de uso y la Política de privacidad.';

  @override
  String get termsOfUse => 'Términos de uso';

  @override
  String get privacyPolicy => 'Política de privacidad';

  @override
  String get noAccount => '¿No tienes cuenta?';

  @override
  String get exploreWithoutAccount => 'Ver descuentos sin registrarme';

  @override
  String get nameInvalid => 'Introduce tu nombre.';

  @override
  String get emailInvalid => 'Introduce un correo válido.';

  @override
  String get passwordTooShort =>
      'La contraseña debe tener al menos 8 caracteres.';

  @override
  String get mustAcceptTerms => 'Debes aceptar los términos para continuar.';

  @override
  String get errorEmailTaken => 'Ya existe una cuenta con este correo.';

  @override
  String get errorInvalidCredentials => 'Correo o contraseña incorrectos.';

  @override
  String get errorNetwork =>
      'Sin conexión. Revisa tu internet e inténtalo de nuevo.';

  @override
  String get errorGeneric => 'Algo salió mal. Inténtalo de nuevo.';

  @override
  String get signInToSeeSavings =>
      'Inicia sesión para ver cuánto ahorras con Eclud.';

  @override
  String get signInToSeeProfile =>
      'Crea tu cuenta o inicia sesión para gestionar tu suscripción.';

  @override
  String subscriptionActiveUntil(String date) {
    return 'Suscripción activa hasta el $date';
  }

  @override
  String get subscriptionInactive => 'Sin suscripción activa';

  @override
  String get subscriptionRequired =>
      'Necesitas una suscripción activa para usar descuentos.';

  @override
  String get logout => 'Cerrar sesión';

  @override
  String get deleteAccount => 'Eliminar cuenta';

  @override
  String get deleteAccountTitle => '¿Eliminar tu cuenta?';

  @override
  String get deleteAccountBody =>
      'Se borrarán tus datos personales de forma permanente. Esta acción no se puede deshacer.';

  @override
  String get confirmDelete => 'Eliminar';

  @override
  String get adminPanel => 'Administración';

  @override
  String get adminPanelHint => 'Da de alta y aprueba establecimientos.';

  @override
  String get addMerchant => 'Añadir establecimiento';

  @override
  String get statusPending => 'Pendiente';

  @override
  String get statusApproved => 'Aprobado';

  @override
  String get statusRejected => 'Rechazado';

  @override
  String get approve => 'Aprobar';

  @override
  String get reject => 'Rechazar';

  @override
  String get noMerchants => 'Todavía no hay establecimientos.';

  @override
  String get ownerEmailLabel => 'Correo de la cuenta del comercio';

  @override
  String get ownerEmailHint => 'El comercio debe registrarse antes en la app';

  @override
  String get categoryLabel => 'Categoría';

  @override
  String get priceLevelLabel => 'Precio';

  @override
  String get addressLabel => 'Dirección';

  @override
  String get cityLabel => 'Ciudad';

  @override
  String get countryLabel => 'País';

  @override
  String get pinLabel => 'PIN del comercio (4 dígitos)';

  @override
  String get imageUrlLabel => 'Enlace de la foto (opcional)';

  @override
  String get locationLabel => 'Ubicación';

  @override
  String get locationHint => 'Toca el mapa para marcar el establecimiento.';

  @override
  String get locationRequired => 'Marca la ubicación en el mapa.';

  @override
  String get fieldRequired => 'Campo obligatorio.';

  @override
  String get merchantCreated => 'Establecimiento añadido.';

  @override
  String get errorOwnerNotFound => 'No existe ninguna cuenta con ese correo.';

  @override
  String get errorOwnerHasMerchant => 'Esa cuenta ya tiene un establecimiento.';

  @override
  String get favorites => 'Mis favoritos';

  @override
  String get noFavorites =>
      'Aún no tienes favoritos. Toca el corazón en un establecimiento para guardarlo aquí.';

  @override
  String get sortBy => 'Ordenar';

  @override
  String get sortDiscount => 'Mayor descuento';

  @override
  String get share => 'Compartir';

  @override
  String shareText(String percent, String name, String link) {
    return '$percent de descuento en $name con Eclud 👉 $link';
  }

  @override
  String get securePaymentPlay => 'Pago seguro con Google Play';

  @override
  String get forgotPassword => '¿Olvidaste tu contraseña?';

  @override
  String get forgotTitle => 'Recupera tu cuenta';

  @override
  String get forgotIntro => 'Te enviaremos un código de 6 dígitos a tu correo.';

  @override
  String get sendCode => 'Enviar código';

  @override
  String codeSent(String email) {
    return 'Si existe una cuenta con $email, recibirás un código en unos minutos. Revisa también la carpeta de spam.';
  }

  @override
  String get codeLabel => 'Código de 6 dígitos';

  @override
  String get codeInvalidFormat => 'El código tiene 6 dígitos.';

  @override
  String get newPasswordLabel => 'Nueva contraseña';

  @override
  String get savePassword => 'Guardar y entrar';

  @override
  String get resendCode => 'Volver a enviar';

  @override
  String get errorInvalidCode =>
      'Código incorrecto o caducado. Pide uno nuevo.';

  @override
  String get errorReviewNotAllowed =>
      'Solo puedes valorar los sitios donde has usado un descuento.';

  @override
  String get errorPurchaseInUse =>
      'Esta compra ya está vinculada a otra cuenta.';

  @override
  String get errorPurchase =>
      'No pudimos confirmar la compra. Inténtalo de nuevo en unos minutos.';

  @override
  String get subscribeTitle => 'Hazte miembro de Eclud';

  @override
  String get subscribeBenefit1 =>
      'Descuentos en restaurantes, cafeterías, belleza y ocio';

  @override
  String get subscribeBenefit2 => 'Úsalos tantas veces como quieras';

  @override
  String get subscribeBenefit3 => 'Ve cuánto ahorras cada mes';

  @override
  String subscribeCta(String price) {
    return 'Suscribirme por $price/mes';
  }

  @override
  String get subscribeLegal =>
      'Se renueva cada mes. Cancela cuando quieras en Google Play.';

  @override
  String get restorePurchases => 'Restaurar compra';

  @override
  String get notNow => 'Ahora no';

  @override
  String get subscribeOnAndroid =>
      'La suscripción se contrata desde la app Eclud para Android.';

  @override
  String get openGooglePlay => 'Abrir Google Play';

  @override
  String get subscribed => '¡Ya eres miembro de Eclud!';

  @override
  String get manageSubscription => 'Gestionar suscripción';

  @override
  String get subscribe => 'Suscribirme';

  @override
  String freeTrial(int days) {
    return '$days días gratis';
  }

  @override
  String get storeUnavailable =>
      'Google Play no está disponible en este dispositivo.';

  @override
  String get openNow => 'Abierto';

  @override
  String get closedNow => 'Cerrado';

  @override
  String opensAt(String time) {
    return 'Abre a las $time';
  }

  @override
  String get hours => 'Horario';

  @override
  String get closedAllDay => 'Cerrado';

  @override
  String get reviewsTitle => 'Opiniones';

  @override
  String get noReviews => 'Aún no hay opiniones.';

  @override
  String get rate => 'Valorar';

  @override
  String get yourRating => 'Tu valoración';

  @override
  String get commentLabel => 'Comentario (opcional)';

  @override
  String get send => 'Enviar';

  @override
  String get thanksReview => '¡Gracias por tu opinión!';

  @override
  String starsA11y(int count) {
    return '$count de 5 estrellas';
  }

  @override
  String get photoLabel => 'Foto del establecimiento';

  @override
  String get changePhoto => 'Cambiar foto';

  @override
  String get photoUpdated => 'Foto actualizada.';

  @override
  String get photoTooLarge => 'La foto es demasiado grande (máximo 2 MB).';

  @override
  String get openingHoursLabel => 'Horario de apertura';

  @override
  String get addShift => 'Añadir turno';

  @override
  String get removeShift => 'Quitar turno';
}
