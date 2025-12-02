# 📦 Guía de Construcción de Instaladores LotoLink

Esta guía explica cómo construir los instaladores de LotoLink para Android (APK) y escritorio (Windows, macOS, Linux).

## 🔧 Requisitos Previos

### General
- Node.js >= 18
- npm o yarn

### Android
- Java JDK 17
- Android SDK (API Level 34)
- Android Build Tools 34.0.0

### Desktop
- Electron 28+
- electron-builder 24+

### Iconos (opcional)
- ImageMagick (para generar iconos)

## 📱 Construcción Android APK

### Opción 1: GitHub Actions (Recomendado)

Los instaladores se construyen automáticamente en cada push a `main` o cuando se crea un tag.

```bash
# Crear un release tag para construir instaladores
git tag v1.0.0
git push origin v1.0.0
```

Los APK estarán disponibles en la sección "Releases" de GitHub.

### Opción 2: Construcción Local

```bash
# 1. Navegar al directorio mobile
cd mobile

# 2. Instalar dependencias
npm install

# 3. Construir APK de debug
npm run build:android:debug

# 4. Construir APK de release
npm run build:android

# Los APK estarán en:
# - Debug: android/app/build/outputs/apk/debug/app-debug.apk
# - Release: android/app/build/outputs/apk/release/app-release.apk
```

### Firmar APK para Play Store

1. Generar un keystore:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore lotolink-release.keystore -alias lotolink -keyalg RSA -keysize 2048 -validity 10000
```

2. Configurar variables de entorno o `gradle.properties`:
```properties
LOTOLINK_UPLOAD_STORE_FILE=lotolink-release.keystore
LOTOLINK_UPLOAD_STORE_PASSWORD=tu_password
LOTOLINK_UPLOAD_KEY_ALIAS=lotolink
LOTOLINK_UPLOAD_KEY_PASSWORD=tu_password
```

3. Construir APK firmado:
```bash
npm run build:android
```

## 💻 Construcción Desktop

### Opción 1: GitHub Actions (Recomendado)

Los instaladores de escritorio se construyen automáticamente para Windows, macOS y Linux.

### Opción 2: Construcción Local

```bash
# 1. Navegar al directorio desktop
cd desktop

# 2. Instalar dependencias
npm install

# 3. Generar iconos (requiere ImageMagick)
cd ..
./scripts/generate-icons.sh
cd desktop

# 4. Construir para tu plataforma
npm run build          # Plataforma actual
npm run build:win      # Windows
npm run build:mac      # macOS
npm run build:linux    # Linux

# Los instaladores estarán en: desktop/dist/
```

### Instaladores Generados

| Plataforma | Archivo | Descripción |
|------------|---------|-------------|
| Windows | `LotoLink-Setup-*.exe` | Instalador NSIS |
| Windows | `LotoLink-*.exe` | Portable (sin instalación) |
| macOS | `LotoLink-*.dmg` | Imagen de disco |
| macOS | `LotoLink-*.zip` | ZIP para distribución directa |
| Linux | `LotoLink-*.AppImage` | AppImage universal |
| Linux | `LotoLink-*.deb` | Paquete Debian/Ubuntu |
| Linux | `LotoLink-*.rpm` | Paquete Fedora/RHEL |

## 🎨 Generación de Iconos

El script `scripts/generate-icons.sh` genera todos los iconos necesarios:

```bash
# Desde la raíz del proyecto
./scripts/generate-icons.sh
```

### Iconos Generados

#### Desktop (`desktop/assets/`)
- `icon.png` - Icono general (1024x1024)
- `icon.ico` - Windows
- `icon.icns` - macOS (solo en macOS)
- `tray-icon.png` - Bandeja del sistema

#### Mobile (`mobile/src/assets/`)
- `icon.png` - Icono de app
- `splash.png` - Pantalla de splash
- `adaptive-icon.png` - Android adaptive icon

#### Android (`mobile/android/app/src/main/res/mipmap-*/`)
- `ic_launcher.png` - Launcher icons (varios tamaños)
- `ic_launcher_round.png` - Launcher icons redondos

## 🔐 Configuración de Secrets para CI/CD

Para construir releases firmados, configura estos secrets en GitHub:

### Android
- `ANDROID_KEYSTORE_BASE64` - Contenido del keystore codificado en base64
- `ANDROID_KEYSTORE_PASSWORD` - Password del keystore
- `ANDROID_KEY_ALIAS` - Alias de la clave
- `ANDROID_KEY_PASSWORD` - Password de la clave

Para codificar el keystore en base64:
```bash
base64 -i lotolink-release.keystore | pbcopy  # macOS
base64 lotolink-release.keystore | xclip      # Linux
```

### Desktop (opcional, para auto-actualizaciones)
- `GH_TOKEN` - Token de GitHub para publicar releases

## 📋 Estructura de Archivos

```
LOTLINK/
├── mobile/
│   ├── android/              # Proyecto Android nativo
│   │   ├── app/
│   │   │   ├── src/main/
│   │   │   │   ├── AndroidManifest.xml
│   │   │   │   ├── java/com/lotolink/app/
│   │   │   │   │   ├── MainActivity.java
│   │   │   │   │   └── MainApplication.java
│   │   │   │   └── res/
│   │   │   │       ├── mipmap-*/  # Iconos
│   │   │   │       ├── values/    # Strings, colors, styles
│   │   │   │       └── drawable/  # Splash screen
│   │   │   └── build.gradle      # Configuración de app
│   │   ├── build.gradle          # Configuración del proyecto
│   │   ├── gradle.properties     # Propiedades de Gradle
│   │   └── gradlew              # Wrapper de Gradle
│   ├── src/assets/              # Assets de React Native
│   └── package.json
├── desktop/
│   ├── assets/                  # Iconos para el instalador
│   │   ├── icon.png
│   │   ├── icon.ico
│   │   ├── icon.icns
│   │   └── tray-icon.png
│   ├── src/
│   │   ├── main/               # Proceso principal Electron
│   │   └── renderer/           # UI (HTML/CSS/JS)
│   └── package.json            # Configuración de electron-builder
├── .github/workflows/
│   └── build-installers.yml    # Workflow de construcción
└── scripts/
    └── generate-icons.sh       # Script para generar iconos
```

## ❓ Solución de Problemas

### Android: SDK no encontrado
```bash
export ANDROID_HOME=/path/to/android-sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### Desktop: electron-builder falla
```bash
# Limpiar cache
rm -rf node_modules
rm -rf desktop/dist
npm install
npm run build
```

### Iconos: ImageMagick no disponible
```bash
# macOS
brew install imagemagick

# Ubuntu
sudo apt-get install imagemagick

# Windows
choco install imagemagick
```

## 📄 Licencia

© 2024 LotoLink. Todos los derechos reservados.
