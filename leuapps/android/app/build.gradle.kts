// LeuApps para Android: a loja da LeuName Softwares que instala os apps no celular (como uma loja de apps).
// Versão: o workflow passa VERSAO_CODIGO e VERSAO_NOME. Assinatura: chave do cofre privado (KEYSTORE_PASSWORD).
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.leunamesoftwares.leuapps"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.leunamesoftwares.leuapps"
        minSdk = 24
        targetSdk = 34
        versionCode = (System.getenv("VERSAO_CODIGO") ?: "1").toInt()
        versionName = System.getenv("VERSAO_NOME") ?: "1.0"
    }

    signingConfigs {
        create("release") {
            storeFile = file("release.keystore")
            storePassword = System.getenv("KEYSTORE_PASSWORD")
            keyAlias = "leuapps"
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
