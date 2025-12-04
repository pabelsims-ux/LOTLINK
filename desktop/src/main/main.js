/**
 * LotoLink Desktop App - Main Process
 * Electron main process for Windows, macOS, and Linux
 */

const { app, BrowserWindow, Menu, Tray, ipcMain, shell, nativeTheme } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize electron store for persistent settings
const store = new Store({
  defaults: {
    windowBounds: { width: 1200, height: 800 },
    theme: 'system', // 'light', 'dark', 'system'
    notifications: true,
    startMinimized: false,
    minimizeToTray: true,
  }
});

// Keep a global reference of the window object
let mainWindow = null;
let tray = null;

// Check if app is in development mode
const isDev = process.argv.includes('--dev');

/**
 * Create the main application window
 */
function createWindow() {
  const { width, height } = store.get('windowBounds');

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    title: 'LotoLink',
    icon: path.join(__dirname, '../../assets/icon.png'),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#000000' : '#f5f5f7',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false, // Don't show until ready
  });

  // Load the app
  // In development, __dirname is desktop/src/main, so we go up 3 levels to reach the root
  // In production, we use extraResources which copies files to the resources folder
  const indexPath = isDev 
    ? path.join(__dirname, '../../../index.html')
    : path.join(process.resourcesPath, 'index.html');
  
  mainWindow.loadFile(indexPath);
  
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (!store.get('startMinimized')) {
      mainWindow.show();
    }
  });

  // Save window bounds on resize/move
  mainWindow.on('resize', saveWindowBounds);
  mainWindow.on('move', saveWindowBounds);

  // Handle close to tray
  mainWindow.on('close', (event) => {
    if (store.get('minimizeToTray') && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
  createMenu();

  // Create system tray
  createTray();
}

/**
 * Save window bounds to store
 */
function saveWindowBounds() {
  if (mainWindow) {
    const { width, height } = mainWindow.getBounds();
    store.set('windowBounds', { width, height });
  }
}

/**
 * Create application menu
 */
function createMenu() {
  const template = [
    // App Menu (macOS)
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferencias',
          accelerator: 'Cmd+,',
          click: () => openPreferences(),
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    
    // File Menu
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Nueva Jugada',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('new-play'),
        },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
      ],
    },
    
    // Edit Menu
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
    
    // View Menu
    {
      label: 'Vista',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'forceReload', label: 'Forzar recarga' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom normal' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
        ...(isDev ? [
          { type: 'separator' },
          { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
        ] : []),
      ],
    },
    
    // Window Menu
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front', label: 'Traer al frente' },
        ] : [
          { role: 'close', label: 'Cerrar' },
        ]),
      ],
    },
    
    // Help Menu
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Documentación',
          click: () => shell.openExternal('https://lotolink.com/docs'),
        },
        {
          label: 'Soporte',
          click: () => shell.openExternal('https://lotolink.com/support'),
        },
        { type: 'separator' },
        {
          label: 'Acerca de LotoLink',
          click: () => showAbout(),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Create system tray
 */
function createTray() {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir LotoLink',
      click: () => {
        mainWindow?.show();
      },
    },
    {
      label: 'Nueva Jugada',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('new-play');
      },
    },
    { type: 'separator' },
    {
      label: 'Resultados',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('navigate', 'results');
      },
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('LotoLink');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

/**
 * Open preferences window
 */
function openPreferences() {
  mainWindow?.webContents.send('open-preferences');
}

/**
 * Show about dialog
 */
function showAbout() {
  const { dialog } = require('electron');
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Acerca de LotoLink',
    message: 'LotoLink Desktop',
    detail: `Versión: ${app.getVersion()}\n\nLa mejor aplicación de lotería para escritorio.\n\n© 2024 LotoLink. Todos los derechos reservados.`,
    buttons: ['OK'],
    icon: path.join(__dirname, '../../assets/icon.png'),
  });
}

// IPC Handlers
ipcMain.handle('get-settings', () => {
  return store.store;
});

ipcMain.handle('set-setting', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('get-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

// App event handlers
app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// Handle theme changes
nativeTheme.on('updated', () => {
  mainWindow?.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
});
