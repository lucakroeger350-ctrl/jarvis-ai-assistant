const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vaultPin', {
  getLabel: () => ipcRenderer.invoke('vault:get-pending-label'),
  submit: (pin) => ipcRenderer.invoke('vault:submit-pin', pin),
  cancel: () => ipcRenderer.invoke('vault:cancel-pin'),
});
