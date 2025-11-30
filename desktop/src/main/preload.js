/**
 * LotoLink Desktop App - Preload Script
 * Exposes secure APIs to the renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  
  // App info
  getVersion: () => ipcRenderer.invoke('get-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Navigation events
  onNavigate: (callback) => {
    ipcRenderer.on('navigate', (event, page) => callback(page));
  },
  
  // Theme
  onThemeChanged: (callback) => {
    ipcRenderer.on('theme-changed', (event, theme) => callback(theme));
  },
  
  // New play
  onNewPlay: (callback) => {
    ipcRenderer.on('new-play', () => callback());
  },
  
  // Preferences
  onOpenPreferences: (callback) => {
    ipcRenderer.on('open-preferences', () => callback());
  },
  
  // Notifications
  showNotification: (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: './assets/icon.png' });
    }
  },
  
  // Platform detection
  isMac: () => process.platform === 'darwin',
  isWindows: () => process.platform === 'win32',
  isLinux: () => process.platform === 'linux',
});

// Request notification permission
if (Notification.permission === 'default') {
  Notification.requestPermission();
}
