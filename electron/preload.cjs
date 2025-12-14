const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('quickmath', {
  versions: process.versions,
  window: {
    close: () => ipcRenderer.invoke('window:close'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
  },
})
