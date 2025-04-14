// Import required Electron components
const { app, Menu, Tray, BrowserWindow } = require("electron");
const path = require("path");

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
  app.quit();
}

// Determine if we're in development mode
const isDev = process.env.NODE_ENV === "development";

// Keep a global reference of the window objects
let mainWindow = null;
let splashWindow = null;
let tray = null;

// Set application name for Windows 10+ notifications
app.setAppUserModelId("com.attendance.electron");

// Disable hardware acceleration for better performance
app.disableHardwareAcceleration();

// Only allow a single instance of the app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Setup the tray icon
const setupTray = () => {
  tray = new Tray(path.join(__dirname, "assets", "tray-icon.png"));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.setFullScreen(true);
        }
      },
    },
    {
      label: "Exit",
      click: () => app.quit(),
    },
  ]);
  tray.setToolTip("Attendance Client");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.setFullScreen(true);
      }
    }
  });
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Set up the tray icon
  setupTray();

  // Create the splash window first
  createSplashWindow();

  // Create the main window after a delay
  setTimeout(() => {
    createMainWindow();
  }, 500);

  // Re-create windows on activation (macOS)
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
      setTimeout(() => {
        createMainWindow();
      }, 500);
    }
  });
});

// Create the splash window
const createSplashWindow = () => {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 300,
    center: true,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "splash-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, "splash.html"));
};

// Console logging for app ready
app.on("ready", () => {
  console.log("Application is ready. Environment:", process.env.NODE_ENV);
});

// Handle app activation
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSplashWindow();
    setTimeout(() => {
      createMainWindow();
    }, 500);
  }
});

// Exit cleanup
app.on("before-quit", () => {
  if (tray) {
    tray.destroy();
  }
});
