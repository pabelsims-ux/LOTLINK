# LotoLink Mobile App

Aplicación móvil nativa de LotoLink para iOS y Android, desarrollada con React Native.

## 📱 Características

- **Interfaz Premium**: Diseño inspirado en Apple con soporte para modo claro/oscuro
- **Jugar Loterías**: Selección de números, modalidades y apuestas
- **Bancas Cercanas**: Lista y mapa de bancas con ubicación GPS
- **Resultados en Vivo**: Actualizaciones en tiempo real de sorteos
- **Perfil y Cartera**: Gestión de balance, historial y pagos
- **Notificaciones Push**: Alertas de sorteos y premios

## 🚀 Instalación

### Requisitos Previos

- Node.js >= 18
- React Native CLI
- Para iOS: Xcode 14+ y CocoaPods
- Para Android: Android Studio y SDK

### Configuración

```bash
# Instalar dependencias
cd mobile
npm install

# iOS - Instalar pods
cd ios && pod install && cd ..

# Iniciar Metro bundler
npm start
```

### Ejecutar en Dispositivo

```bash
# iOS
npm run ios

# Android
npm run android
```

## 📁 Estructura del Proyecto

```
mobile/
├── src/
│   ├── App.tsx              # Componente principal
│   ├── screens/             # Pantallas de la app
│   │   ├── HomeScreen.tsx
│   │   ├── BancasScreen.tsx
│   │   ├── LoteriasScreen.tsx
│   │   ├── PlayScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── LoginScreen.tsx
│   ├── components/          # Componentes reutilizables
│   ├── services/            # Servicios y contextos
│   │   └── AuthContext.tsx
│   ├── navigation/          # Configuración de navegación
│   └── assets/              # Imágenes y recursos
├── ios/                     # Proyecto nativo iOS
├── android/                 # Proyecto nativo Android
├── package.json
└── app.json
```

## 🛠 Compilar para Producción

### iOS (App Store)

```bash
# Compilar release
cd ios
xcodebuild -workspace LotoLink.xcworkspace -scheme LotoLink -configuration Release archive

# Generar IPA
xcodebuild -exportArchive -archivePath LotoLink.xcarchive -exportPath ./build -exportOptionsPlist ExportOptions.plist
```

### Android (Play Store)

```bash
# Generar APK release
cd android
./gradlew assembleRelease

# El APK estará en: android/app/build/outputs/apk/release/
```

## 🔧 Configuración de API

Edita `src/services/AuthContext.tsx` para configurar la URL del backend:

```typescript
const API_BASE_URL = 'https://tu-api.lotolink.com';
```

## 📄 Licencia

© 2024 LotoLink. Todos los derechos reservados.
