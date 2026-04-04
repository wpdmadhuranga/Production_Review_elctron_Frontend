const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	getMachineId: () => ipcRenderer.invoke('get-machine-id'),
	storeLicense: (licenseKey) => ipcRenderer.invoke('store-license', licenseKey),
	getStoredLicense: () => ipcRenderer.invoke('get-license'),
	clearStoredLicense: () => ipcRenderer.invoke('clear-license'),
	getConfig: () => ipcRenderer.invoke('get-config'),
	setCache: (key, value) => ipcRenderer.invoke('set-cache', key, value),
	getCache: (key) => ipcRenderer.invoke('get-cache', key),
});
