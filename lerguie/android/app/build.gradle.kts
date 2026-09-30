import java.net.URI
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
}

val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

// URL pública do backend (não é segredo). Ordem: variável de ambiente > local.properties > gradle.properties.
val apiUrl: String = System.getenv("LERGUIE_API_URL")
    ?: localProps.getProperty("lerguie.apiUrl")
    ?: (project.findProperty("lerguie.apiUrl") as String? ?: "")

// Assinatura de release: lida de keystore.properties (fora do Git) ou variáveis de ambiente.
val keystoreProps = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
fun signingValue(key: String, env: String): String? = keystoreProps.getProperty(key) ?: System.getenv(env)

android {
    namespace = "com.leuname.lerguie"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.leuname.lerguie"
        minSdk = 26
        targetSdk = 35
        // No CI o número da versão vem do número da execução (atualizações de teste crescentes).
        val buildNumber = (project.findProperty("lerguie.versionCode") as String?)?.toIntOrNull() ?: 1
        versionCode = buildNumber
        versionName = "1.0.$buildNumber"
        buildConfigField("boolean", "UPDATE_CHECK", "false")
        buildConfigField("String", "API_BASE_URL", "\"${apiUrl.trimEnd('/')}\"")
        resourceConfigurations += listOf("pt-rBR", "pt")
    }

    val storeFilePath = signingValue("storeFile", "LERGUIE_KEYSTORE_FILE")
    signingConfigs {
        // Chave SÓ para APKs de teste (atualizações instaláveis por cima). Nunca usar na Play Store.
        create("beta") {
            storeFile = file("teste.keystore")
            storePassword = "lerguie-teste"
            keyAlias = "lerguie-teste"
            keyPassword = "lerguie-teste"
        }
        if (storeFilePath != null) {
            create("release") {
                storeFile = file(storeFilePath)
                storePassword = signingValue("storePassword", "LERGUIE_KEYSTORE_PASSWORD")
                keyAlias = signingValue("keyAlias", "LERGUIE_KEY_ALIAS")
                keyPassword = signingValue("keyPassword", "LERGUIE_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (storeFilePath != null) signingConfig = signingConfigs.getByName("release")
        }
        // APK de TESTE para instalar direto no celular: otimizado como o release (menor e
        // mais rápido), assinado com a chave de teste e com atualização automática pelo GitHub.
        create("beta") {
            initWith(getByName("release"))
            signingConfig = signingConfigs.getByName("beta")
            matchingFallbacks += "release"
            buildConfigField("boolean", "UPDATE_CHECK", "true")
        }
    }

    // Um APK por arquitetura (bem menor). Não afeta o AAB da Play Store.
    splits {
        abi {
            isEnable = true
            reset()
            include("arm64-v8a", "armeabi-v7a")
            isUniversalApk = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    // Modelos .tflite precisam ficar sem compressão para o MediaPipe mapear na memória.
    androidResources {
        noCompress += "tflite"
    }
}

// Modelos de IA no aparelho, baixados no build para não versionar binários:
// - object_detector: EfficientDet-Lite2 (80 classes COCO: pessoa, carro, bicicleta, moto...)
// - image_classifier: EfficientNet-Lite2 (1000 objetos: toalha, prego, guarda-roupa...)
// - image_embedder: MobileNetV3 Large (semelhança de imagens para "objetos ensinados")
val models = mapOf(
    "object_detector.tflite" to "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/int8/latest/efficientdet_lite2.tflite",
    "image_classifier.tflite" to "https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite2/int8/latest/efficientnet_lite2.tflite",
    "image_embedder.tflite" to "https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_large/float32/latest/mobilenet_v3_large.tflite",
)
val modelsDir = layout.projectDirectory.dir("src/main/assets/models")
val downloadModels by tasks.registering {
    models.keys.forEach { outputs.file(modelsDir.file(it)) }
    doLast {
        models.forEach { (name, url) ->
            val out = modelsDir.file(name).asFile
            if (!out.exists()) {
                out.parentFile.mkdirs()
                URI(url).toURL().openStream().use { input -> out.outputStream().use { output -> input.copyTo(output) } }
            }
        }
    }
}
tasks.named("preBuild") { dependsOn(downloadModels) }

ksp {
    arg("room.schemaLocation", "$projectDir/schemas")
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.core.splashscreen)
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons)
    debugImplementation(libs.compose.ui.tooling)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.navigation.compose)
    implementation(libs.datastore.preferences)
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)
    implementation(libs.camerax.core)
    implementation(libs.camerax.camera2)
    implementation(libs.camerax.lifecycle)
    implementation(libs.camerax.view)
    implementation(libs.mlkit.text)
    implementation(libs.mlkit.barcode)
    implementation(libs.mlkit.labeling)
    implementation(libs.coroutines.android)
    implementation(libs.coroutines.play.services)
    implementation(libs.serialization.json)
    implementation(libs.billing.ktx)
    implementation(libs.mediapipe.vision)
    testImplementation(libs.junit)
}
