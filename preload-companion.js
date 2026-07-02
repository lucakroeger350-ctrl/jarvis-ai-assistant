const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('companionOverlay', {
  onState: (cb) => ipcRenderer.on('companion:state', (_e, payload) => cb(payload.state)),
});
