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

  /// No description provided for @securePayment.
  ///
  /// In es, this message translates to:
  /// **'Pago seguro con Stripe'**
  String get securePayment;

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

  /// No description provided for @notifications.
  ///
  /// In es, this message translates to:
  /// **'Notificaciones'**
  String get notifications;

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
