const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("node:path");
const isDev = process.env.NODE_ENV === "development";
// const isDev = false;
const { exec, spawn } = require("child_process");
const os = require("os");
const fs = require("fs");
const http = require("http");

// Get database module with proper path resolution
let dbModule;
try {
  dbModule = require("./utils/db");
} catch (err) {
  console.error("Failed to load db from ./utils/db:", err);
  try {
    // Try alternative path
    const dbPath = path.join(__dirname, "utils", "db");
    console.log("Trying alternative db path:", dbPath);
    dbModule = require(dbPath);
  } catch (err2) {
    console.error("Failed to load db from absolute path:", err2);
    // Create stub methods to prevent app from crashing
    dbModule = {
      initDatabase: () => console.log("Using stub initDatabase"),
      authenticateUser: (username, password) => {
        console.log(`Using stub authenticateUser: ${username}`);
        return Promise.resolve({
          success: true,
          message: "Stub authentication",
          username: username,
        });
      },
      closeDb: () => console.log("Using stub closeDb"),
    };
  }
}

// Extract the methods we need
const { initDatabase, authenticateUser, closeDb } = dbModule;

let mainWindow = null;
let splashWindow = null;

// Get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  let ipAddress = "127.0.0.1"; // Default fallback

  // Loop through network interfaces
  Object.keys(interfaces).forEach((ifname) => {
    interfaces[ifname].forEach((iface) => {
      // Skip over non-IPv4 and internal/loopback interfaces
      if (iface.family === "IPv4" && !iface.internal) {
        ipAddress = iface.address;
      }
    });
  });

  return ipAddress;
}

// Start the local BiometricAPI process
function startBiometricAPI() {
  const localIp = getLocalIpAddress();
  console.log(`Starting BiometricAPI with local IP address: ${localIp}`);

  // Resolve the path to the BiometricAPI executable
  let fingerprintServerPath;
  try {
    fingerprintServerPath = path.join(
      app.getAppPath(),
      "BiometricAPI",
      "FingerPrintAPI.exe"
    );
    console.log(`BiometricAPI path: ${fingerprintServerPath}`);

    if (!fs.existsSync(fingerprintServerPath)) {
      console.error(
        `BiometricAPI executable not found at: ${fingerprintServerPath}`
      );
      return null;
    }
  } catch (error) {
    console.error("Error resolving BiometricAPI path:", error);
    return null;
  }

  // Spawn the BiometricAPI process
  try {
    const fingerprintServerProcess = spawn(
      fingerprintServerPath,
      [localIp, "3006"],
      {
        detached: true,
        windowsHide: true,
      }
    );

    fingerprintServerProcess.stdout.on("data", (data) =>
      console.log(`BiometricAPI: ${data}`)
    );

    fingerprintServerProcess.stderr.on("data", (data) =>
      console.error(`BiometricAPI Error: ${data}`)
    );

    fingerprintServerProcess.on("error", (error) => {
      console.error(`Failed to start BiometricAPI: ${error.message}`);
    });

    fingerprintServerProcess.on("close", (code) => {
      console.log(`BiometricAPI process exited with code ${code}`);
    });

    // Don't wait for the child process to exit
    fingerprintServerProcess.unref();

    console.log("BiometricAPI process started successfully");
    return fingerprintServerProcess;
  } catch (error) {
    console.error(`Error starting BiometricAPI: ${error.message}`);
    return null;
  }
}

// Function to check server connection
function checkServerConnection(ipAddress, callback) {
  console.log(`Checking server connection at ${ipAddress}:3000/api/test`);

  const options = {
    hostname: ipAddress,
    port: 3000,
    path: "/api/test",
    method: "GET",
    timeout: 3000, // 3 second timeout
  };

  const req = http.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      try {
        const jsonData = JSON.parse(data);
        console.log("Server connection check successful:", jsonData);
        callback(true);
      } catch (e) {
        console.error("Error parsing server response:", e.message);
        callback(false);
      }
    });
  });

  req.on("error", (e) => {
    console.error(`Server connection check failed: ${e.message}`);
    callback(false);
  });

  req.on("timeout", () => {
    console.error("Server connection check timed out");
    req.destroy();
    callback(false);
  });

  req.end();
}

const createSplashWindow = () => {
  // Fixed dimensions for splash window
  const splashWidth = 800;
  const splashHeight = 600;

  // Create the splash window with fixed dimensions
  splashWindow = new BrowserWindow({
    width: splashWidth,
    height: splashHeight,
    transparent: false,
    frame: false,
    resizable: false,
    center: true,
    skipTaskbar: true,
    backgroundColor: "#f5f7fa",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Load the splash screen HTML file
  splashWindow.loadFile(path.join(__dirname, "index.html"));

  // Center the splash window
  splashWindow.center();

  // Pass the initial route to the renderer process
  splashWindow.webContents.on("did-finish-load", () => {
    splashWindow.webContents.send("set-initial-route", "/splash");
  });
};

const createMainWindow = () => {
  // Get the primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the main window with fullscreen setup
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    minWidth: 1280,
    minHeight: 800,
    show: false,
    center: true,
    backgroundColor: "#ffffff",
    fullscreen: true, // Set fullscreen by default
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Center the window
  mainWindow.center();

  // Open the DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();

    // Load from webpack dev server in development mode
    mainWindow.loadURL("http://localhost:8081");

    // Set up hot reload
    const webpackDevServer = require("webpack-dev-server");
    const webpack = require("webpack");
    const config = require("../webpack.config.js");
    const compiler = webpack(config);

    const server = new webpackDevServer(config.devServer, compiler);

    server.startCallback(() => {
      console.log("Webpack Dev Server running on port 8081");
    });
  } else {
    // Load the local file in production mode
    mainWindow.loadFile(path.join(__dirname, "index.html"));
  }

  // Get the local IP address
  const localIp = getLocalIpAddress();
  console.log(`Using local IP address: ${localIp}`);

  // Check if server is running before proceeding
  checkServerConnection(localIp, (isServerRunning) => {
    console.log("Server running status:", isServerRunning);

    // Expose the IP address to the renderer process
    mainWindow.webContents.on("did-finish-load", () => {
      mainWindow.webContents.send("local-ip-address", localIp);

      // If server is not running, redirect to server config
      if (!isServerRunning) {
        console.log("Server not running, redirecting to server config");
        mainWindow.webContents.send("set-initial-route", "/server-config");
      } else {
        console.log("Server running, continuing to attendance screen");
      }
    });

    // Show main window when it's ready
    mainWindow.once("ready-to-show", () => {
      // Send IP address to renderer
      mainWindow.webContents.send("local-ip-address", localIp);

      if (splashWindow) {
        // Close splash window after a delay to ensure smooth transition
        setTimeout(() => {
          splashWindow.close();
          splashWindow = null;
          mainWindow.show();

          // Ensure fullscreen mode is active
          if (!mainWindow.isFullScreen()) {
            mainWindow.setFullScreen(true);
          }
        }, 2000); // 2 seconds delay
      } else {
        mainWindow.show();

        // Ensure fullscreen mode is active
        if (!mainWindow.isFullScreen()) {
          mainWindow.setFullScreen(true);
        }
      }
    });
  });

  // Handle fullscreen state changes
  mainWindow.on("enter-full-screen", () => {
    console.log("Entered fullscreen mode");
    mainWindow.webContents.send("window-state-change", { isFullScreen: true });
  });

  mainWindow.on("leave-full-screen", () => {
    console.log("Left fullscreen mode");
    mainWindow.webContents.send("window-state-change", { isFullScreen: false });

    // Return to fullscreen mode automatically after a brief delay
    setTimeout(() => {
      if (!mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(true);
      }
    }, 500);
  });

  // Keep handling maximize events for compatibility
  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("window-state-change", { isMaximized: true });
  });

  mainWindow.on("unmaximize", () => {
    mainWindow.webContents.send("window-state-change", { isMaximized: false });
  });
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createSplashWindow();

  // Start the BiometricAPI process
  const biometricProcess = startBiometricAPI();
  if (!biometricProcess) {
    console.warn(
      "Failed to start BiometricAPI process, fingerprint functionality may not work"
    );
  }

  // Create main window after a delay to show splash screen
  setTimeout(() => {
    createMainWindow();
  }, 2000); // 2 seconds delay

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  // Initialize the database when the app starts
  initDatabase();
});

// Quit when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC handlers for login
ipcMain.on("login", async (event, { username, password }) => {
  try {
    // Use the database for authentication
    const result = await authenticateUser(username, password);
    event.reply("login-response", result);
  } catch (error) {
    console.error("Login error:", error);
    event.reply("login-response", {
      success: false,
      message: "Authentication error",
    });
  }
});

// Add cleanup code for when the app is about to quit
app.on("will-quit", async () => {
  try {
    await closeDb();
    // BiometricAPI process is detached, so we don't need to kill it explicitly
    console.log("Application cleanup complete");
  } catch (error) {
    console.error("Error during application cleanup:", error);
  }
});

// Add IPC handler for IP address retrieval
ipcMain.handle("get-local-ip", () => {
  return getLocalIpAddress();
});

// Add IPC handlers for fullscreen
ipcMain.on("toggle-fullscreen", () => {
  if (mainWindow) {
    const isFullScreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFullScreen);
    mainWindow.webContents.send("window-state-change", {
      isFullScreen: !isFullScreen,
    });
  }
});

ipcMain.on("check-fullscreen", () => {
  if (mainWindow) {
    const isFullScreen = mainWindow.isFullScreen();
    mainWindow.webContents.send("window-state-change", { isFullScreen });
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
