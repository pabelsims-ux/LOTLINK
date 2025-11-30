# LotoLink Desktop App

Aplicación de escritorio de LotoLink para Windows, macOS y Linux, desarrollada con Electron.

## 💻 Características

- **Multiplataforma**: Windows, macOS y Linux
- **Interfaz Premium**: Diseño inspirado en Apple con modo claro/oscuro
- **Menú Nativo**: Integración completa con el sistema operativo
- **Bandeja del Sistema**: Acceso rápido desde la barra de tareas
- **Auto-actualización**: Actualizaciones automáticas en segundo plano
- **Notificaciones**: Alertas nativas del sistema

## 🚀 Instalación

### Requisitos Previos

- Node.js >= 18
- npm o yarn

### Desarrollo

```bash
# Instalar dependencias
cd desktop
npm install

# Ejecutar en modo desarrollo
npm run dev

# Ejecutar normalmente
npm start
```

### Compilar para Distribución

```bash
# Windows (genera .exe instalador y portable)
npm run build:win

# macOS (genera .dmg y .zip)
npm run build:mac

# Linux (genera AppImage, .deb, .rpm)
npm run build:linux

# Todas las plataformas
npm run build
```

## 📁 Estructura del Proyecto

```
desktop/
├── src/
│   ├── main/
│   │   ├── main.js          # Proceso principal de Electron
│   │   └── preload.js       # Script de preload (bridge seguro)
│   └── renderer/
│       └── index.html       # Interfaz de usuario
├── assets/                   # Iconos y recursos
│   ├── icon.png             # Icono general
│   ├── icon.ico             # Icono Windows
│   ├── icon.icns            # Icono macOS
│   └── tray-icon.png        # Icono de bandeja
├── dist/                     # Ejecutables compilados
├── package.json
└── README.md
```

## 🎨 Iconos

Para compilar correctamente, necesitas los siguientes iconos en `assets/`:

| Archivo | Uso | Tamaño Recomendado |
|---------|-----|-------------------|
| `icon.png` | General/Linux | 1024x1024 |
| `icon.ico` | Windows | 256x256 (multi-size) |
| `icon.icns` | macOS | 1024x1024 (multi-size) |
| `tray-icon.png` | Bandeja sistema | 32x32 o 64x64 |

## ⚙️ Configuración

### Preferencias de Usuario

Las preferencias se guardan automáticamente:
- Tamaño y posición de ventana
- Tema (claro/oscuro/sistema)
- Notificaciones
- Minimizar a bandeja

### API Backend

Edita la URL del API en `src/renderer/index.html`:

```javascript
const API_BASE_URL = 'https://api.lotolink.com';
```

## 📦 Publicación

### Windows

1. Genera certificado de firma de código
2. Configura en `package.json` -> `build.win`
3. Ejecuta `npm run build:win`
4. Sube a tu servidor o Microsoft Store

### macOS

1. Necesitas Apple Developer ID
2. Configura notarización en `package.json`
3. Ejecuta `npm run build:mac`
4. Sube a Mac App Store o distribución directa

### Linux

1. Ejecuta `npm run build:linux`
2. Distribuye via repositorios o sitio web

## 🔧 Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Cmd/Ctrl + N` | Nueva jugada |
| `Cmd/Ctrl + ,` | Preferencias |
| `Cmd/Ctrl + R` | Recargar |
| `Cmd/Ctrl + Q` | Salir |

## 📄 Licencia

© 2024 LotoLink. Todos los derechos reservados.
