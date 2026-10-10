// Pedêê Entregador para Android: o app do entregador com GPS nativo (sem depender da permissão do navegador).
// Versão: o workflow passa VERSAO_CODIGO e VERSAO_NOME. Assinatura: chave do cofre privado (KEYSTORE_PASSWORD).
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.leunamesoftwares.pedee.entregador"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.leunamesoftwares.pedee.entregador"
        minSdk = 24
        targetSdk = 34
        versionCode = (System.getenv("VERSAO_CODIGO") ?: "1").toInt()
        versionName = System.getenv("VERSAO_NOME") ?: "1.0"
    }

    signingConfigs {
        create("release") {
            storeFile = file("release.keystore")
            storePassword = System.getenv("KEYSTORE_PASSWORD")
            keyAlias = "pedee"
            keyPassword = System.getenv("KEYSTORE_PASSWORD")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = if (file("release.keystore").exists()) signingConfigs.getByName("release") else null
        }
    }

    buildFeatures { buildConfig = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
