const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  relaunch: () => ipcRenderer.invoke('relaunch'),
});
