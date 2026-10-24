const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rubinotAPI', {
  readData: () => ipcRenderer.invoke('storage:read'),
  writeData: (data) => ipcRenderer.invoke('storage:write', data),
  saveFile: (opts) => ipcRenderer.invoke('dialog:saveFile', opts),
  openFile: (opts) => ipcRenderer.invoke('dialog:openFile', opts)
});
