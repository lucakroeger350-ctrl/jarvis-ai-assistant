const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gamingOverlay', {
  restore: () => ipcRenderer.invoke('gaming:restore'),
  setIgnoreMouseEvents: (ignore) => ipcRenderer.invoke('gaming:set-ignore-mouse', ignore),
});
