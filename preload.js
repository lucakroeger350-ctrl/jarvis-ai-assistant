const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvis', {
  chat: (message) => ipcRenderer.invoke('jarvis:chat', message),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  getMemory: () => ipcRenderer.invoke('memory:get'),
  clearMemory: () => ipcRenderer.invoke('memory:clear'),
  deleteMemoryItem: (id) => ipcRenderer.invoke('memory:delete', id),
  getLearnedSkills: () => ipcRenderer.invoke('skills:get-learned'),
  deleteLearnedSkill: (id) => ipcRenderer.invoke('skills:delete-learned', id),

  transcribeAudio: (float32Samples) => ipcRenderer.invoke('speech:transcribe', Array.from(float32Samples)),

  addAppointment: (appt) => ipcRenderer.invoke('calendar:add', appt),
  getAppointments: () => ipcRenderer.invoke('calendar:list'),
  deleteAppointment: (id) => ipcRenderer.invoke('calendar:delete', id),

  onGreeting: (cb) => ipcRenderer.on('app:greeting', (_e, payload) => cb(payload.text)),
  onAnnounce: (cb) => ipcRenderer.on('app:announce', (_e, payload) => cb(payload.text)),
  onHardwareAlert: (cb) => ipcRenderer.on('app:hardware-alert', (_e, payload) => cb(payload)),
  onVisualizerToggle: (cb) => ipcRenderer.on('visualizer:toggle', (_e, payload) => cb(payload.active)),
  onGlobeFocusCities: (cb) => ipcRenderer.on('globe:focus-cities', (_e, payload) => cb(payload.cities)),
  onNightProtocol: (cb) => ipcRenderer.on('night-protocol:start', (_e, payload) => cb(payload.text)),
  onFocusStart: (cb) => ipcRenderer.on('focus:start', (_e, payload) => cb(payload.minutes)),
  onReactorFlash: (cb) => ipcRenderer.on('reactor:flash', () => cb()),

  getSecurityStatus: () => ipcRenderer.invoke('security:get-status'),
  setSecurityPin: (pin) => ipcRenderer.invoke('security:set-pin', pin),
  saveFaceDescriptor: (descriptor) => ipcRenderer.invoke('security:save-descriptor', descriptor),
  ensureFaceModels: () => ipcRenderer.invoke('security:ensure-models'),
  onFaceModelsProgress: (cb) => ipcRenderer.on('security:models-progress', (_e, payload) => cb(payload.message)),
  setSecurityArmed: (armed) => ipcRenderer.invoke('security:set-armed', armed),
  checkFace: (descriptor) => ipcRenderer.invoke('security:check-face', descriptor),
  onSecurityArmedChanged: (cb) => ipcRenderer.on('security:armed-changed', (_e, payload) => cb(payload.armed)),
  onStealthLog: (cb) => ipcRenderer.on('stealth:log', (_e, payload) => cb(payload.text)),
  reportError: (message) => ipcRenderer.send('app:error', message),
  onShortcutMic: (cb) => ipcRenderer.on('shortcut:mic', () => cb()),

  onMeetingStart: (cb) => ipcRenderer.on('meeting:start', () => cb()),
  onMeetingStop: (cb) => ipcRenderer.on('meeting:stop', () => cb()),
  submitMeetingAudio: (base64Wav) => ipcRenderer.invoke('meeting:submit-audio', base64Wav),

  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  getActiveProfile: () => ipcRenderer.invoke('profiles:get-active'),
  createProfile: (name) => ipcRenderer.invoke('profiles:create', name),
  switchProfile: (id) => ipcRenderer.invoke('profiles:switch', id),
  renameProfile: (id, name) => ipcRenderer.invoke('profiles:rename', { id, name }),
  deleteProfile: (id) => ipcRenderer.invoke('profiles:delete', id),

  register: (email, password, displayName) => ipcRenderer.invoke('auth:register', { email, password, displayName }),
  login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getSession: () => ipcRenderer.invoke('auth:get-session'),
  continueAsGuest: () => ipcRenderer.invoke('auth:continue-as-guest'),
  sessionReady: () => ipcRenderer.invoke('app:session-ready'),

  getAccountState: () => ipcRenderer.invoke('account:get-state'),
  activateVip: (code) => ipcRenderer.invoke('account:activate-vip', code),

  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateAvailable: (cb) => ipcRenderer.on('update:available', (_e, payload) => cb(payload)),
  onUpdateStatus: (cb) => ipcRenderer.on('update:status', (_e, payload) => cb(payload)),
  onUpdateProgress: (cb) => ipcRenderer.on('update:progress', (_e, payload) => cb(payload)),
  onUpdateReady: (cb) => ipcRenderer.on('update:ready', () => cb()),

  integrationsGet: () => ipcRenderer.invoke('integrations:get'),
  integrationsSave: (config) => ipcRenderer.invoke('integrations:save', config),

  spotifyIsConnected: () => ipcRenderer.invoke('spotify:is-connected'),
  spotifyConnect: () => ipcRenderer.invoke('spotify:connect'),

  openSoundSettings: () => ipcRenderer.invoke('system:open-sound-settings'),
  openVoiceSettings: () => ipcRenderer.invoke('system:open-voice-settings'),

  isPiperInstalled: () => ipcRenderer.invoke('tts:piper-installed'),
  ensurePiper: () => ipcRenderer.invoke('tts:ensure-piper'),
  speakPiper: (text) => ipcRenderer.invoke('tts:speak-piper', text),
  onPiperProgress: (cb) => ipcRenderer.on('tts:piper-progress', (_e, payload) => cb(payload.message)),
});
