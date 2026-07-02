const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gamingOverlay', {
  restore: () => ipcRenderer.invoke('gaming:restore'),
});
