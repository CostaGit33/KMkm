import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Assinatura de release. Os segredos ficam fora do repositório: `android/key.properties`
// (ignorado pelo git; chaves storeFile, storePassword, keyAlias, keyPassword) ou as
// variáveis ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS e
// ANDROID_KEY_PASSWORD (usadas pelo workflow mobile-release.yml).
val keyProperties = Properties().apply {
    val arquivo = rootProject.file("key.properties")
    if (arquivo.exists()) arquivo.inputStream().use { load(it) }
}

fun valorDeAssinatura(propriedade: String, variavel: String): String? =
    (keyProperties.getProperty(propriedade) ?: System.getenv(variavel))?.takeIf { it.isNotBlank() }

val releaseStoreFile = valorDeAssinatura("storeFile", "ANDROID_KEYSTORE_PATH")
val releaseStorePassword = valorDeAssinatura("storePassword", "ANDROID_KEYSTORE_PASSWORD")
val releaseKeyAlias = valorDeAssinatura("keyAlias", "ANDROID_KEY_ALIAS")
val releaseKeyPassword = valorDeAssinatura("keyPassword", "ANDROID_KEY_PASSWORD")
val hasReleaseSigning = listOf(
    releaseStoreFile, releaseStorePassword, releaseKeyAlias, releaseKeyPassword,
).all { it != null }

// Com REQUIRE_RELEASE_SIGNING=true (propriedade do Gradle ou variável de ambiente) o build
// de release falha se a chave não estiver configurada, em vez de cair na chave de debug.
val requireReleaseSigning = (
    providers.gradleProperty("REQUIRE_RELEASE_SIGNING")
        .orElse(providers.environmentVariable("REQUIRE_RELEASE_SIGNING"))
        .getOrElse("false")
    ).equals("true", ignoreCase = true)

// Keep the Android Maps key external to source control. A missing key is valid
// for the default OSM build, which does not enable the Google map renderer.
val mapsApiKey = providers.gradleProperty("MAPS_API_KEY")
    .orElse(providers.environmentVariable("MAPS_API_KEY"))
    .getOrElse("")

android {
    namespace = "online.novaagencian8n.mais1km"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "online.novaagencian8n.mais1km"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        manifestPlaceholders["MAPS_API_KEY"] = mapsApiKey
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = rootProject.file(releaseStoreFile!!)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        release {
            signingConfig = when {
                hasReleaseSigning -> signingConfigs.getByName("release")
                requireReleaseSigning -> throw GradleException(
                    "Assinatura de release ausente: defina android/key.properties ou as variáveis " +
                        "ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS e ANDROID_KEY_PASSWORD.",
                )
                // Sem chave de release (CI de PR, desenvolvimento): usa a de debug só para teste.
                // Esse APK não serve para a Play Store nem para App Links verificados.
                else -> signingConfigs.getByName("debug")
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
