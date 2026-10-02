import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('es')];

  /// No description provided for @appName.
  ///
  /// In es, this message translates to:
  /// **'Eclud'**
  String get appName;

  /// No description provided for @tagline.
  ///
  /// In es, this message translates to:
  /// **'EURO CLUB DE DESCUENTOS'**
  String get tagline;

  /// No description provided for @onboardingHeadlineHighlight.
  ///
  /// In es, this message translates to:
  /// **'Descuentos'**
  String get onboardingHeadlineHighlight;

  /// No description provided for @onboardingHeadlineRest.
  ///
  /// In es, this message translates to:
  /// **' reales\nen los mejores sitios\nde tu ciudad'**
  String get onboardingHeadlineRest;

  /// No description provided for @priceFrom.
  ///
  /// In es, this message translates to:
  /// **'Solo'**
  String get priceFrom;

  /// No description provided for @pricePerMonth.
  ///
  /// In es, this message translates to:
  /// **'/mes'**
  String get pricePerMonth;

  /// No description provided for @priceDescription.
  ///
  /// In es, this message translates to:
  /// **'Accede a descuentos exclusivos\nen establecimientos asociados.'**
  String get priceDescription;

  /// No description provided for @startNow.
  ///
  /// In es, this message translates to:
  /// **'Empezar ahora'**
  String get startNow;

  /// No description provided for @haveAccount.
  ///
  /// In es, this message translates to:
  /// **'¿Ya tienes cuenta?'**
  String get haveAccount;

  /// No description provided for @signIn.
  ///
  /// In es, this message translates to:
  /// **'Inicia sesión'**
  String get signIn;

  /// No description provided for @categoryAll.
  ///
  /// In es, this message translates to:
  /// **'Todos'**
  String get categoryAll;

  /// No description provided for @categoryFood.
  ///
  /// In es, this message translates to:
  /// **'Comida'**
  String get categoryFood;

  /// No description provided for @categoryRestaurants.
  ///
  /// In es, this message translates to:
  /// **'Restaurantes'**
  String get categoryRestaurants;

  /// No description provided for @categoryCafes.
  ///
  /// In es, this message translates to:
  /// **'Cafeterías'**
  String get categoryCafes;

  /// No description provided for @categoryBeauty.
  ///
  /// In es, this message translates to:
  /// **'Belleza'**
  String get categoryBeauty;

  /// No description provided for @categoryLeisure.
  ///
  /// In es, this message translates to:
  /// **'Ocio'**
  String get categoryLeisure;

  /// No description provided for @greeting.
  ///
  /// In es, this message translates to:
  /// **'¡Hola, {name}!'**
  String greeting(String name);

  /// No description provided for @greetingAnonymous.
  ///
  /// In es, this message translates to:
  /// **'¡Hola!'**
  String get greetingAnonymous;

  /// No description provided for @homeSubtitle.
  ///
  /// In es, this message translates to:
  /// **'Explora las mejores ofertas cerca de ti.'**
  String get homeSubtitle;

  /// No description provided for @searchHint.
  ///
  /// In es, this message translates to:
  /// **'Buscar restaurantes, cafeterías, servicios...'**
  String get searchHint;

  /// No description provided for @promoTitle.
  ///
  /// In es, this message translates to:
  /// **'DESCUENTOS\nDE HASTA {percent}'**
  String promoTitle(String percent);

  /// No description provided for @promoSubtitle.
  ///
  /// In es, this message translates to:
  /// **'Restaurantes, cafeterías, belleza\n¡y mucho más!'**
  String get promoSubtitle;

  /// No description provided for @nearest.
  ///
  /// In es, this message translates to:
  /// **'Más cercanos'**
  String get nearest;

  /// No description provided for @seeMap.
  ///
  /// In es, this message translates to:
  /// **'Ver mapa'**
  String get seeMap;

  /// No description provided for @discountLabel.
  ///
  /// In es, this message translates to:
  /// **'de descuento'**
  String get discountLabel;

  /// No description provided for @noResults.
  ///
  /// In es, this message translates to:
  /// **'No encontramos establecimientos con esos filtros.'**
  String get noResults;

  /// No description provided for @loadError.
  ///
  /// In es, this message translates to:
  /// **'No se pudieron cargar los establecimientos.'**
  String get loadError;

  /// No description provided for @retry.
  ///
  /// In es, this message translates to:
  /// **'Reintentar'**
  String get retry;

  /// No description provided for @mapSearchHint.
  ///
  /// In es, this message translates to:
  /// **'Buscar en esta zona...'**
  String get mapSearchHint;

  /// No description provided for @myLocation.
  ///
  /// In es, this message translates to:
  /// **'Mi ubicación'**
  String get myLocation;

  /// No description provided for @navHome.
  ///
  /// In es, this message translates to:
  /// **'Inicio'**
  String get navHome;

  /// No description provided for @navMap.
  ///
  /// In es, this message translates to:
  /// **'Mapa'**
  String get navMap;

  /// No description provided for @navSavings.
  ///
  /// In es, this message translates to:
  /// **'Mi ahorro'**
  String get navSavings;

  /// No description provided for @navProfile.
  ///
  /// In es, this message translates to:
  /// **'Perfil'**
  String get navProfile;

  /// No description provided for @comingSoon.
  ///
  /// In es, this message translates to:
  /// **'Próximamente'**
  String get comingSoon;

  /// No description provided for @comingSoonDescription.
  ///
  /// In es, this message translates to:
  /// **'Estamos preparando esta sección.'**
  String get comingSoonDescription;

  /// No description provided for @reviews.
  ///
  /// In es, this message translates to:
  /// **'({count} reseñas)'**
  String reviews(int count);

  /// No description provided for @noReviewsYet.
  ///
  /// In es, this message translates to:
  /// **'Nuevo en Eclud'**
  String get noReviewsYet;

  /// No description provided for @address.
  ///
  /// In es, this message translates to:
  /// **'Dirección'**
  String get address;

  /// No description provided for @howToGetThere.
  ///
  /// In es, this message translates to:
  /// **'Cómo llegar'**
  String get howToGetThere;

  /// No description provided for @menu.
  ///
  /// In es, this message translates to:
  /// **'Carta'**
  String get menu;

  /// No description provided for @seeExternalMenu.
  ///
  /// In es, this message translates to:
  /// **'Ver carta externa'**
  String get seeExternalMenu;

  /// No description provided for @seeMenu.
  ///
  /// In es, this message translates to:
  /// **'Ver carta'**
  String get seeMenu;

  /// No description provided for @discountRuleTitle.
  ///
  /// In es, this message translates to:
  /// **'Condiciones del descuento'**
  String get discountRuleTitle;

  /// No description provided for @defaultDiscountRule.
  ///
  /// In es, this message translates to:
  /// **'{percent} de descuento en el total de la cuenta. No acumulable con otras promociones.'**
  String defaultDiscountRule(String percent);

  /// No description provided for @addFavorite.
  ///
  /// In es, this message translates to:
  /// **'Añadir a favoritos'**
  String get addFavorite;

  /// No description provided for @removeFavorite.
  ///
  /// In es, this message translates to:
  /// **'Quitar de favoritos'**
  String get removeFavorite;

  /// No description provided for @back.
  ///
  /// In es, this message translates to:
  /// **'Volver'**
  String get back;

  /// No description provided for @partnerNotFound.
  ///
  /// In es, this message translates to:
  /// **'Este establecimiento ya no está disponible.'**
  String get partnerNotFound;

  /// No description provided for @linkError.
  ///
  /// In es, this message translates to:
  /// **'No se pudo abrir el enlace.'**
  String get linkError;

  /// No description provided for @redeemDiscount.
  ///
  /// In es, this message translates to:
  /// **'Canjear descuento'**
  String get redeemDiscount;

  /// No description provided for @redeemInstructions.
  ///
  /// In es, this message translates to:
  /// **'Introduce el PIN de 4 dígitos del establecimiento para activar tu descuento.'**
  String get redeemInstructions;

  /// No description provided for @cancel.
  ///
  /// In es, this message translates to:
  /// **'Cancelar'**
  String get cancel;

  /// No description provided for @delete.
  ///
  /// In es, this message translates to:
  /// **'Borrar'**
  String get delete;

  /// No description provided for @checkingPin.
  ///
  /// In es, this message translates to:
  /// **'Comprobando...'**
  String get checkingPin;

  /// No description provided for @wrongPin.
  ///
  /// In es, this message translates to:
  /// **'PIN incorrecto. Te quedan {count} intentos.'**
  String wrongPin(int count);

  /// No description provided for @tooManyAttempts.
  ///
  /// In es, this message translates to:
  /// **'Demasiados intentos. Vuelve a intentarlo en {minutes} min.'**
  String tooManyAttempts(int minutes);

  /// No description provided for @showToStaff.
  ///
  /// In es, this message translates to:
  /// **'Muestra esta pantalla al personal\n¡y disfruta!'**
  String get showToStaff;

  /// No description provided for @redemptionCode.
  ///
  /// In es, this message translates to:
  /// **'Código'**
  String get redemptionCode;

  /// No description provided for @couponActive.
  ///
  /// In es, this message translates to:
  /// **'¡CUPÓN ACTIVO!'**
  String get couponActive;

  /// No description provided for @applyDiscount.
  ///
  /// In es, this message translates to:
  /// **'Aplica {percent} de descuento\nen el total de la cuenta'**
  String applyDiscount(String percent);

  /// No description provided for @activatedAt.
  ///
  /// In es, this message translates to:
  /// **'Activado a las {time}'**
  String activatedAt(String time);

  /// No description provided for @backToHome.
  ///
  /// In es, this message translates to:
  /// **'Volver al inicio'**
  String get backToHome;

  /// No description provided for @savingsTitle.
  ///
  /// In es, this message translates to:
  /// **'Mi ahorro'**
  String get savingsTitle;

  /// No description provided for @netSavedThisMonth.
  ///
  /// In es, this message translates to:
  /// **'ahorrados\neste mes'**
  String get netSavedThisMonth;

  /// No description provided for @totalSaved.
  ///
  /// In es, this message translates to:
  /// **'Total ahorrado'**
  String get totalSaved;

  /// No description provided for @monthlySubscription.
  ///
  /// In es, this message translates to:
  /// **'Suscripción mensual'**
  String get monthlySubscription;

  /// No description provided for @yourBenefit.
  ///
  /// In es, this message translates to:
  /// **'Tu beneficio'**
  String get yourBenefit;

  /// No description provided for @savingsHistory.
  ///
  /// In es, this message translates to:
  /// **'Historial de ahorros'**
  String get savingsHistory;

  /// No description provided for @noSavingsYet.
  ///
  /// In es, this message translates to:
  /// **'Aún no has usado ningún descuento este mes.'**
  String get noSavingsYet;

  /// No description provided for @addAmount.
  ///
  /// In es, this message translates to:
  /// **'Añadir importe'**
  String get addAmount;

  /// No description provided for @amountPaidTitle.
  ///
  /// In es, this message translates to:
  /// **'¿Cuánto pagaste?'**
  String get amountPaidTitle;

  /// No description provided for @amountPaidHint.
  ///
  /// In es, this message translates to:
  /// **'Importe pagado con descuento'**
  String get amountPaidHint;

  /// No description provided for @amountInvalid.
  ///
  /// In es, this message translates to:
  /// **'Introduce un importe válido.'**
  String get amountInvalid;

  /// No description provided for @save.
  ///
  /// In es, this message translates to:
  /// **'Guardar'**
  String get save;

  /// No description provided for @savingsPendingNote.
  ///
  /// In es, this message translates to:
  /// **'Añade el importe pagado para calcular tu ahorro.'**
  String get savingsPendingNote;

  /// No description provided for @merchantPanel.
  ///
  /// In es, this message translates to:
  /// **'Panel del comercio'**
  String get merchantPanel;

  /// No description provided for @merchantPanelHint.
  ///
  /// In es, this message translates to:
  /// **'Gestiona tu establecimiento y tus descuentos.'**
  String get merchantPanelHint;

  /// No description provided for @statusActive.
  ///
  /// In es, this message translates to:
  /// **'Activo'**
  String get statusActive;

  /// No description provided for @statusPaused.
  ///
  /// In es, this message translates to:
  /// **'Pausado'**
  String get statusPaused;

  /// No description provided for @tabSummary.
  ///
  /// In es, this message translates to:
  /// **'Resumen'**
  String get tabSummary;

  /// No description provided for @tabCoupons.
  ///
  /// In es, this message translates to:
  /// **'Cupones'**
  String get tabCoupons;

  /// No description provided for @tabSettings.
  ///
  /// In es, this message translates to:
  /// **'Ajustes'**
  String get tabSettings;

  /// No description provided for @thisMonth.
  ///
  /// In es, this message translates to:
  /// **'Este mes'**
  String get thisMonth;

  /// No description provided for @validatedCoupons.
  ///
  /// In es, this message translates to:
  /// **'Cupones validados'**
  String get validatedCoupons;

  /// No description provided for @discountGranted.
  ///
  /// In es, this message translates to:
  /// **'Descuento concedido'**
  String get discountGranted;

  /// No description provided for @newCustomers.
  ///
  /// In es, this message translates to:
  /// **'Clientes nuevos'**
  String get newCustomers;

  /// No description provided for @dailyReport.
  ///
  /// In es, this message translates to:
  /// **'Validaciones · últimos 30 días'**
  String get dailyReport;

  /// No description provided for @dailyReportA11y.
  ///
  /// In es, this message translates to:
  /// **'Gráfico de validaciones por día. Total: {total}.'**
  String dailyReportA11y(int total);

  /// No description provided for @dayValue.
  ///
  /// In es, this message translates to:
  /// **'{date}: {count} cupones'**
  String dayValue(String date, int count);

  /// No description provided for @recentCoupons.
  ///
  /// In es, this message translates to:
  /// **'Últimos cupones validados'**
  String get recentCoupons;

  /// No description provided for @noCoupons.
  ///
  /// In es, this message translates to:
  /// **'Todavía no hay cupones validados.'**
  String get noCoupons;

  /// No description provided for @visibleInApp.
  ///
  /// In es, this message translates to:
  /// **'Visible en la app'**
  String get visibleInApp;

  /// No description provided for @visibleInAppHint.
  ///
  /// In es, this message translates to:
  /// **'Desactívalo para pausar tus descuentos temporalmente.'**
  String get visibleInAppHint;

  /// No description provided for @discountPercentLabel.
  ///
  /// In es, this message translates to:
  /// **'Porcentaje de descuento'**
  String get discountPercentLabel;

  /// No description provided for @discountRuleLabel.
  ///
  /// In es, this message translates to:
  /// **'Condiciones del descuento'**
  String get discountRuleLabel;

  /// No description provided for @menuUrlLabel.
  ///
  /// In es, this message translates to:
  /// **'Enlace de la carta (opcional)'**
  String get menuUrlLabel;

  /// No description provided for @newPinLabel.
  ///
  /// In es, this message translates to:
  /// **'Nuevo PIN (4 dígitos)'**
  String get newPinLabel;

  /// No description provided for @newPinHint.
  ///
  /// In es, this message translates to:
  /// **'Déjalo vacío para mantener el actual'**
  String get newPinHint;

  /// No description provided for @pinInvalid.
  ///
  /// In es, this message translates to:
  /// **'El PIN debe tener 4 dígitos.'**
  String get pinInvalid;

  /// No description provided for @urlInvalid.
  ///
  /// In es, this message translates to:
  /// **'Introduce un enlace que empiece por https://'**
  String get urlInvalid;

  /// No description provided for @percentInvalid.
  ///
  /// In es, this message translates to:
  /// **'Elige un descuento entre 5% y 50%.'**
  String get percentInvalid;

  /// No description provided for @settingsSaved.
  ///
  /// In es, this message translates to:
  /// **'Cambios guardados.'**
  String get settingsSaved;

  /// No description provided for @saveChanges.
  ///
  /// In es, this message translates to:
  /// **'Guardar cambios'**
  String get saveChanges;

  /// No description provided for @createAccount.
  ///
  /// In es, this message translates to:
  /// **'Crear cuenta'**
  String get createAccount;

  /// No description provided for @registerTitle.
  ///
  /// In es, this message translates to:
  /// **'Crea tu cuenta'**
  String get registerTitle;

  /// No description provided for @loginTitle.
  ///
  /// In es, this message translates to:
  /// **'Inicia sesión'**
  String get loginTitle;

  /// No description provided for @nameLabel.
  ///
  /// In es, this message translates to:
  /// **'Nombre'**
  String get nameLabel;

  /// No description provided for @emailLabel.
  ///
  /// In es, this message translates to:
  /// **'Correo electrónico'**
  String get emailLabel;

  /// No description provided for @passwordLabel.
  ///
  /// In es, this message translates to:
  /// **'Contraseña'**
  String get passwordLabel;

  /// No description provided for @passwordHint.
  ///
  /// In es, this message translates to:
  /// **'Mínimo 8 caracteres'**
  String get passwordHint;

  /// No description provided for @showPassword.
  ///
  /// In es, this message translates to:
  /// **'Mostrar contraseña'**
  String get showPassword;

  /// No description provided for @hidePassword.
  ///
  /// In es, this message translates to:
  /// **'Ocultar contraseña'**
  String get hidePassword;

  /// No description provided for @acceptTerms.
  ///
  /// In es, this message translates to:
  /// **'Acepto los Términos de uso y la Política de privacidad.'**
  String get acceptTerms;

  /// No description provided for @termsOfUse.
  ///
  /// In es, this message translates to:
  /// **'Términos de uso'**
  String get termsOfUse;

  /// No description provided for @privacyPolicy.
  ///
  /// In es, this message translates to:
  /// **'Política de privacidad'**
  String get privacyPolicy;

  /// No description provided for @noAccount.
  ///
  /// In es, this message translates to:
  /// **'¿No tienes cuenta?'**
  String get noAccount;

  /// No description provided for @exploreWithoutAccount.
  ///
  /// In es, this message translates to:
  /// **'Ver descuentos sin registrarme'**
  String get exploreWithoutAccount;

  /// No description provided for @nameInvalid.
  ///
  /// In es, this message translates to:
  /// **'Introduce tu nombre.'**
  String get nameInvalid;

  /// No description provided for @emailInvalid.
  ///
  /// In es, this message translates to:
  /// **'Introduce un correo válido.'**
  String get emailInvalid;

  /// No description provided for @passwordTooShort.
  ///
  /// In es, this message translates to:
  /// **'La contraseña debe tener al menos 8 caracteres.'**
  String get passwordTooShort;

  /// No description provided for @mustAcceptTerms.
  ///
  /// In es, this message translates to:
  /// **'Debes aceptar los términos para continuar.'**
  String get mustAcceptTerms;

  /// No description provided for @errorEmailTaken.
  ///
  /// In es, this message translates to:
  /// **'Ya existe una cuenta con este correo.'**
  String get errorEmailTaken;

  /// No description provided for @errorInvalidCredentials.
  ///
  /// In es, this message translates to:
  /// **'Correo o contraseña incorrectos.'**
  String get errorInvalidCredentials;

  /// No description provided for @errorNetwork.
  ///
  /// In es, this message translates to:
  /// **'Sin conexión. Revisa tu internet e inténtalo de nuevo.'**
  String get errorNetwork;

  /// No description provided for @errorGeneric.
  ///
  /// In es, this message translates to:
  /// **'Algo salió mal. Inténtalo de nuevo.'**
  String get errorGeneric;

  /// No description provided for @signInToSeeSavings.
  ///
  /// In es, this message translates to:
  /// **'Inicia sesión para ver cuánto ahorras con Eclud.'**
  String get signInToSeeSavings;

  /// No description provided for @signInToSeeProfile.
  ///
  /// In es, this message translates to:
  /// **'Crea tu cuenta o inicia sesión para gestionar tu suscripción.'**
  String get signInToSeeProfile;

  /// No description provided for @subscriptionActiveUntil.
  ///
  /// In es, this message translates to:
  /// **'Suscripción activa hasta el {date}'**
  String subscriptionActiveUntil(String date);

  /// No description provided for @subscriptionInactive.
  ///
  /// In es, this message translates to:
  /// **'Sin suscripción activa'**
  String get subscriptionInactive;

  /// No description provided for @subscriptionRequired.
  ///
  /// In es, this message translates to:
  /// **'Necesitas una suscripción activa para usar descuentos.'**
  String get subscriptionRequired;

  /// No description provided for @logout.
  ///
  /// In es, this message translates to:
  /// **'Cerrar sesión'**
  String get logout;

  /// No description provided for @deleteAccount.
  ///
  /// In es, this message translates to:
  /// **'Eliminar cuenta'**
  String get deleteAccount;

  /// No description provided for @deleteAccountTitle.
  ///
  /// In es, this message translates to:
  /// **'¿Eliminar tu cuenta?'**
  String get deleteAccountTitle;

  /// No description provided for @deleteAccountBody.
  ///
  /// In es, this message translates to:
  /// **'Se borrarán tus datos personales de forma permanente. Esta acción no se puede deshacer.'**
  String get deleteAccountBody;

  /// No description provided for @confirmDelete.
  ///
  /// In es, this message translates to:
  /// **'Eliminar'**
  String get confirmDelete;

  /// No description provided for @adminPanel.
  ///
  /// In es, this message translates to:
  /// **'Administración'**
  String get adminPanel;

  /// No description provided for @adminPanelHint.
  ///
  /// In es, this message translates to:
  /// **'Da de alta y aprueba establecimientos.'**
  String get adminPanelHint;

  /// No description provided for @addMerchant.
  ///
  /// In es, this message translates to:
  /// **'Añadir establecimiento'**
  String get addMerchant;

  /// No description provided for @statusPending.
  ///
  /// In es, this message translates to:
  /// **'Pendiente'**
  String get statusPending;

  /// No description provided for @statusApproved.
  ///
  /// In es, this message translates to:
  /// **'Aprobado'**
  String get statusApproved;

  /// No description provided for @statusRejected.
  ///
  /// In es, this message translates to:
  /// **'Rechazado'**
  String get statusRejected;

  /// No description provided for @approve.
  ///
  /// In es, this message translates to:
  /// **'Aprobar'**
  String get approve;

  /// No description provided for @reject.
  ///
  /// In es, this message translates to:
  /// **'Rechazar'**
  String get reject;

  /// No description provided for @noMerchants.
  ///
  /// In es, this message translates to:
  /// **'Todavía no hay establecimientos.'**
  String get noMerchants;

  /// No description provided for @ownerEmailLabel.
  ///
  /// In es, this message translates to:
  /// **'Correo de la cuenta del comercio'**
  String get ownerEmailLabel;

  /// No description provided for @ownerEmailHint.
  ///
  /// In es, this message translates to:
  /// **'El comercio debe registrarse antes en la app'**
  String get ownerEmailHint;

  /// No description provided for @categoryLabel.
  ///
  /// In es, this message translates to:
  /// **'Categoría'**
  String get categoryLabel;

  /// No description provided for @priceLevelLabel.
  ///
  /// In es, this message translates to:
  /// **'Precio'**
  String get priceLevelLabel;

  /// No description provided for @addressLabel.
  ///
  /// In es, this message translates to:
  /// **'Dirección'**
  String get addressLabel;

  /// No description provided for @cityLabel.
  ///
  /// In es, this message translates to:
  /// **'Ciudad'**
  String get cityLabel;

  /// No description provided for @countryLabel.
  ///
  /// In es, this message translates to:
  /// **'País'**
  String get countryLabel;

  /// No description provided for @pinLabel.
  ///
  /// In es, this message translates to:
  /// **'PIN del comercio (4 dígitos)'**
  String get pinLabel;

  /// No description provided for @imageUrlLabel.
  ///
  /// In es, this message translates to:
  /// **'Enlace de la foto (opcional)'**
  String get imageUrlLabel;

  /// No description provided for @locationLabel.
  ///
  /// In es, this message translates to:
  /// **'Ubicación'**
  String get locationLabel;

  /// No description provided for @locationHint.
  ///
  /// In es, this message translates to:
  /// **'Toca el mapa para marcar el establecimiento.'**
  String get locationHint;

  /// No description provided for @locationRequired.
  ///
  /// In es, this message translates to:
  /// **'Marca la ubicación en el mapa.'**
  String get locationRequired;

  /// No description provided for @fieldRequired.
  ///
  /// In es, this message translates to:
  /// **'Campo obligatorio.'**
  String get fieldRequired;

  /// No description provided for @merchantCreated.
  ///
  /// In es, this message translates to:
  /// **'Establecimiento añadido.'**
  String get merchantCreated;

  /// No description provided for @errorOwnerNotFound.
  ///
  /// In es, this message translates to:
  /// **'No existe ninguna cuenta con ese correo.'**
  String get errorOwnerNotFound;

  /// No description provided for @errorOwnerHasMerchant.
  ///
  /// In es, this message translates to:
  /// **'Esa cuenta ya tiene un establecimiento.'**
  String get errorOwnerHasMerchant;

  /// No description provided for @favorites.
  ///
  /// In es, this message translates to:
  /// **'Mis favoritos'**
  String get favorites;

  /// No description provided for @noFavorites.
  ///
  /// In es, this message translates to:
  /// **'Aún no tienes favoritos. Toca el corazón en un establecimiento para guardarlo aquí.'**
  String get noFavorites;

  /// No description provided for @sortBy.
  ///
  /// In es, this message translates to:
  /// **'Ordenar'**
  String get sortBy;

  /// No description provided for @sortDiscount.
  ///
  /// In es, this message translates to:
  /// **'Mayor descuento'**
  String get sortDiscount;

  /// No description provided for @share.
  ///
  /// In es, this message translates to:
  /// **'Compartir'**
  String get share;

  /// No description provided for @shareText.
  ///
  /// In es, this message translates to:
  /// **'{percent} de descuento en {name} con Eclud 👉 {link}'**
  String shareText(String percent, String name, String link);

  /// No description provided for @securePaymentPlay.
  ///
  /// In es, this message translates to:
  /// **'Pago seguro con Google Play'**
  String get securePaymentPlay;

  /// No description provided for @forgotPassword.
  ///
  /// In es, this message translates to:
  /// **'¿Olvidaste tu contraseña?'**
  String get forgotPassword;

  /// No description provided for @forgotTitle.
  ///
  /// In es, this message translates to:
  /// **'Recupera tu cuenta'**
  String get forgotTitle;

  /// No description provided for @forgotIntro.
  ///
  /// In es, this message translates to:
  /// **'Te enviaremos un código de 6 dígitos a tu correo.'**
  String get forgotIntro;

  /// No description provided for @sendCode.
  ///
  /// In es, this message translates to:
  /// **'Enviar código'**
  String get sendCode;

  /// No description provided for @codeSent.
  ///
  /// In es, this message translates to:
  /// **'Si existe una cuenta con {email}, recibirás un código en unos minutos. Revisa también la carpeta de spam.'**
  String codeSent(String email);

  /// No description provided for @codeLabel.
  ///
  /// In es, this message translates to:
  /// **'Código de 6 dígitos'**
  String get codeLabel;

  /// No description provided for @codeInvalidFormat.
  ///
  /// In es, this message translates to:
  /// **'El código tiene 6 dígitos.'**
  String get codeInvalidFormat;

  /// No description provided for @newPasswordLabel.
  ///
  /// In es, this message translates to:
  /// **'Nueva contraseña'**
  String get newPasswordLabel;

  /// No description provided for @savePassword.
  ///
  /// In es, this message translates to:
  /// **'Guardar y entrar'**
  String get savePassword;

  /// No description provided for @resendCode.
  ///
  /// In es, this message translates to:
  /// **'Volver a enviar'**
  String get resendCode;

  /// No description provided for @errorInvalidCode.
  ///
  /// In es, this message translates to:
  /// **'Código incorrecto o caducado. Pide uno nuevo.'**
  String get errorInvalidCode;

  /// No description provided for @errorReviewNotAllowed.
  ///
  /// In es, this message translates to:
  /// **'Solo puedes valorar los sitios donde has usado un descuento.'**
  String get errorReviewNotAllowed;

  /// No description provided for @errorPurchaseInUse.
  ///
  /// In es, this message translates to:
  /// **'Esta compra ya está vinculada a otra cuenta.'**
  String get errorPurchaseInUse;

  /// No description provided for @errorPurchase.
  ///
  /// In es, this message translates to:
  /// **'No pudimos confirmar la compra. Inténtalo de nuevo en unos minutos.'**
  String get errorPurchase;

  /// No description provided for @subscribeTitle.
  ///
  /// In es, this message translates to:
  /// **'Hazte miembro de Eclud'**
  String get subscribeTitle;

  /// No description provided for @subscribeBenefit1.
  ///
  /// In es, this message translates to:
  /// **'Descuentos en restaurantes, cafeterías, belleza y ocio'**
  String get subscribeBenefit1;

  /// No description provided for @subscribeBenefit2.
  ///
  /// In es, this message translates to:
  /// **'Úsalos tantas veces como quieras'**
  String get subscribeBenefit2;

  /// No description provided for @subscribeBenefit3.
  ///
  /// In es, this message translates to:
  /// **'Ve cuánto ahorras cada mes'**
  String get subscribeBenefit3;

  /// No description provided for @subscribeCta.
  ///
  /// In es, this message translates to:
  /// **'Suscribirme por {price}/mes'**
  String subscribeCta(String price);

  /// No description provided for @subscribeLegal.
  ///
  /// In es, this message translates to:
  /// **'Se renueva cada mes. Cancela cuando quieras en Google Play.'**
  String get subscribeLegal;

  /// No description provided for @restorePurchases.
  ///
  /// In es, this message translates to:
  /// **'Restaurar compra'**
  String get restorePurchases;

  /// No description provided for @notNow.
  ///
  /// In es, this message translates to:
  /// **'Ahora no'**
  String get notNow;

  /// No description provided for @subscribeOnAndroid.
  ///
  /// In es, this message translates to:
  /// **'La suscripción se contrata desde la app Eclud para Android.'**
  String get subscribeOnAndroid;

  /// No description provided for @openGooglePlay.
  ///
  /// In es, this message translates to:
  /// **'Abrir Google Play'**
  String get openGooglePlay;

  /// No description provided for @subscribed.
  ///
  /// In es, this message translates to:
  /// **'¡Ya eres miembro de Eclud!'**
  String get subscribed;

  /// No description provided for @manageSubscription.
  ///
  /// In es, this message translates to:
  /// **'Gestionar suscripción'**
  String get manageSubscription;

  /// No description provided for @subscribe.
  ///
  /// In es, this message translates to:
  /// **'Suscribirme'**
  String get subscribe;

  /// No description provided for @freeTrial.
  ///
  /// In es, this message translates to:
  /// **'{days} días gratis'**
  String freeTrial(int days);

  /// No description provided for @storeUnavailable.
  ///
  /// In es, this message translates to:
  /// **'Google Play no está disponible en este dispositivo.'**
  String get storeUnavailable;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['es'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'es':
      return AppLocalizationsEs();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
