const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("node:path");
// const isDev = process.env.NODE_ENV === "development";
const isDev = false;
const { exec, spawn } = require("child_process");
const os = require("os");
const fs = require("fs");

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

let mainWindow = null;
let splashWindow = null;

const createSplashWindow = () => {
  // Create the splash window with fixed dimensions
  splashWindow = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    frame: false,
    resizable: false,
    center: true,
    skipTaskbar: true,
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

  // Create the main window with fixed dimensions
  mainWindow = new BrowserWindow({
    width: Math.min(1600, width),
    height: Math.min(1000, height),
    minWidth: 1280,
    minHeight: 800,
    show: false,
    center: true,
    backgroundColor: "#ffffff",
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
    mainWindow.loadURL("http://localhost:8080");

    // Set up hot reload
    const webpackDevServer = require("webpack-dev-server");
    const webpack = require("webpack");
    const config = require("../webpack.config.js");
    const compiler = webpack(config);

    const server = new webpackDevServer(config.devServer, compiler);

    server.startCallback(() => {
      console.log("Webpack Dev Server running on port 8080");
    });
  } else {
    // Load the local file in production mode
    mainWindow.loadFile(path.join(__dirname, "index.html"));
  }

  // Get the local IP address
  const localIp = getLocalIpAddress();
  console.log(`Using local IP address: ${localIp}`);

  // Determine the correct path to server.js based on whether we're in development or production
  let serverPath;
  try {
    if (isDev) {
      serverPath = path.join(__dirname, "..", "api", "server.js");
    } else {
      // Try multiple approaches to find the API server
      const appPath = app.getAppPath();
      console.log("App path:", appPath);

      // First try: check if it's in extraResources
      const extraResourcesPath = process.resourcesPath;
      const apiInResourcesPath = path.join(
        extraResourcesPath,
        "api",
        "server.js"
      );
      console.log("Checking for API in resources:", apiInResourcesPath);

      if (fs.existsSync(apiInResourcesPath)) {
        console.log("Found API in resources path");
        serverPath = apiInResourcesPath;
      } else {
        // Second try: relative to app directory
        const basePath = appPath.includes("app.asar")
          ? path.dirname(appPath)
          : appPath;
        const apiRelativePath = path.join(basePath, "..", "api", "server.js");
        console.log("Checking for API relative to app:", apiRelativePath);

        if (fs.existsSync(apiRelativePath)) {
          console.log("Found API in relative path");
          serverPath = apiRelativePath;
        } else {
          // Fallback: app directory itself
          const apiFallbackPath = path.join(basePath, "api", "server.js");
          console.log("Using fallback API path:", apiFallbackPath);
          serverPath = apiFallbackPath;
        }
      }
    }

    console.log(`Final server path: ${serverPath}`);
  } catch (error) {
    console.error("Error resolving server path:", error);
    // Provide a dummy server path to avoid crashes
    serverPath = path.join(__dirname, "dummy-server.js");
  }

  // Start the server using Node.js and pass the IP address as an environment variable
  const serverProcess = spawn("node", [serverPath], {
    env: {
      ...process.env,
      LOCAL_IP_ADDRESS: localIp,
    },
  });

  serverProcess.stdout.on("data", (data) => console.log(`Server: ${data}`));
  serverProcess.stderr.on("data", (data) =>
    console.error(`Server Error: ${data}`)
  );
  serverProcess.on("close", (code) =>
    console.log(`Server exited with code ${code}`)
  );
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
        mainWindow.maximize(); // Maximize the window on first show
      }, 2000); // 2 seconds delay
    } else {
      mainWindow.show();
      mainWindow.maximize(); // Maximize the window on first show
    }
  });

  // Handle window state
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

// Add IPC handler for IP address retrieval
ipcMain.handle("get-local-ip", () => {
  return getLocalIpAddress();
});

// Close the database when the app is about to quit
app.on("will-quit", async () => {
  try {
    await closeDb();
  } catch (error) {
    console.error("Error closing database:", error);
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
