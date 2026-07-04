const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('projection', {
  // Boot-Eingabeleiste: Nutzer bestätigt "Ja/Weiter" -> HUD zieht sich zurück.
  dismiss: (value) => ipcRenderer.invoke('projection:dismiss', value),
  // Main -> Projektion: Status-/Farb-/Moduswechsel (z.B. Kugelzustand, Rot-Alarm).
  onUpdate: (cb) => ipcRenderer.on('projection:update', (_e, payload) => cb(payload)),
});
