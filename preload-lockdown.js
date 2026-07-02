const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lockdown', {
  verifyPin: (pin) => ipcRenderer.invoke('security:verify-pin', pin),
});
