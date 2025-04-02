// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

// Add IP address communication channels
const validSendChannels = [
  "login",
  "logout",
  "fingerprint-initialize",
  "fingerprint-capture",
  "fingerprint-verify",
  "fingerprint-register",
  "fingerprint-status",
  "get-local-ip", // Add channel to request the IP address
];

const validReceiveChannels = [
  "set-initial-route",
  "login-response",
  "window-state-change",
  "fingerprint-initialize-response",
  "fingerprint-capture-response",
  "fingerprint-verify-response",
  "fingerprint-register-response",
  "fingerprint-status-response",
  "local-ip-address", // Add channel to receive the IP address
];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    send: (channel, data) => {
      if (validSendChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    on: (channel, func) => {
      if (validReceiveChannels.includes(channel)) {
        // Strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once: (channel, func) => {
      if (validReceiveChannels.includes(channel)) {
        // Strip event as it includes `sender`
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    },
    removeListener: (channel, func) => {
      if (validReceiveChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, func);
      }
    },
    removeAllListeners: (channel) => {
      if (validReceiveChannels.includes(channel)) {
        ipcRenderer.removeAllListeners(channel);
      }
    },
  },
});

// Create an additional API for IP address management
contextBridge.exposeInMainWorld("ipConfig", {
  getLocalIp: () => ipcRenderer.invoke("get-local-ip"),
  onIpUpdate: (callback) => {
    ipcRenderer.on("local-ip-address", (event, data) => callback(data));
  },
});
