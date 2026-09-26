// ARQUIVO GERADO AUTOMATICAMENTE — NÃO EDITE À MÃO.
//
// Este arquivo ainda não foi configurado com um projeto Firebase real. Antes
// de rodar o app, o responsável pelo projeto deve:
//   1. Criar (ou usar) um projeto no https://console.firebase.google.com
//   2. Instalar a FlutterFire CLI: dart pub global activate flutterfire_cli
//   3. Rodar na raiz do projeto: flutterfire configure
// O comando acima substitui este arquivo pelos valores reais do projeto e
// gera os arquivos nativos (google-services.json / GoogleService-Info.plist).
//
// Enquanto isso não for feito, os placeholders abaixo impedem a inicialização
// do Firebase (proposital — evita conectar o app a um projeto que não existe).

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'LeuPlace ainda não tem configuração Firebase para Web. Rode `flutterfire configure`.',
      );
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'Plataforma não suportada. Rode `flutterfire configure` para gerar as opções corretas.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'REPLACE_WITH_FLUTTERFIRE_CONFIGURE',
    appId: 'REPLACE_WITH_FLUTTERFIRE_CONFIGURE',
    messagingSenderId: 'REPLACE_WITH_FLUTTERFIRE_CONFIGURE',
    projectId: 'REPLACE_WITH_FLUTTERFIRE_CONFIGURE',
    storageBucket: 'REPLACE_WITH_FLUTTERFIRE_CONFIGURE',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'REPLACE_WITH_FLUTTERFIRE_CONFIGURE',
    appId: 'REPLACE_WITH_FLUTTERFIRE_CONFIGURE',
    messagingSenderId: 'REPLACE_WITH_FLUTTERFIRE_CONFIGURE',
    projectId: 'REPLACE_WITH_FLUTTERFIRE_CONFIGURE',
    storageBucket: 'REPLACE_WITH_FLUTTERFIRE_CONFIGURE',
    iosBundleId: 'com.leunamesoftware.leuplace',
  );
}
