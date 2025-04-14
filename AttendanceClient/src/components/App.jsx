import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material";
import { CssBaseline, Box, Snackbar, Button } from "@mui/material";
import SplashScreen from "../pages/SplashScreen";
import AttendanceScreen from "../pages/AttendanceScreen";
import ServerConfigPage from "../pages/ServerConfigPage";
import * as api from "../utils/api";

// Create a custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
      light: "#42a5f5",
      dark: "#1565c0",
    },
    secondary: {
      main: "#9c27b0",
      light: "#ba68c8",
      dark: "#7b1fa2",
    },
    background: {
      default: "#f5f7fa",
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        },
      },
    },
  },
});

const App = () => {
  const [initialRoute, setInitialRoute] = useState("/splash");
  const [serverConnected, setServerConnected] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [showFullScreenAlert, setShowFullScreenAlert] = useState(false);
  const navigate = useNavigate();

  // Check server connection on mount and when the server IP changes
  useEffect(() => {
    const checkServerConnection = async () => {
      console.log("Checking server connection...");
      try {
        // Set a shorter timeout for the connection test
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

        const result = await fetch(`${api.API_URL}/auth/test`, {
          signal: controller.signal,
        })
          .then((res) => res.json())
          .catch((err) => {
            console.error("Server connection fetch error:", err);
            return { success: false, message: err.message };
          });

        clearTimeout(timeoutId);

        console.log("Server connection test result:", result);
        setServerConnected(result.success === true);

        if (result.success === true) {
          console.log("Server connection successful");
          // If we're on the config page and connection is successful, go to splash
          if (window.location.hash === "#/server-config") {
            navigate("/splash");
          }
        } else {
          console.error("Server connection failed:", result.message);
          console.log("Redirecting to server configuration page");
          navigate("/server-config");
        }
      } catch (error) {
        console.error("Server connection error:", error);
        setServerConnected(false);
        console.log("Redirecting to server configuration page due to error");
        navigate("/server-config");
      } finally {
        setConnectionChecked(true);
      }
    };

    // Check connection immediately on component mount
    checkServerConnection();

    // Add event listener for storage changes (in case IP is updated in another tab)
    const handleStorageChange = (event) => {
      if (event.key === "serverIpAddress") {
        console.log(
          "Server IP address changed in storage, rechecking connection"
        );
        checkServerConnection();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Check connection every 10 seconds
    const intervalId = setInterval(checkServerConnection, 10000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(intervalId);
    };
  }, [navigate]);

  // Listen for initial route from Electron main process
  useEffect(() => {
    if (window.electron) {
      window.electron.ipcRenderer.on("set-initial-route", (route) => {
        console.log("Received initial route:", route);
        // Check if this is explicitly the server config route
        if (route === "/server-config") {
          console.log("Explicitly navigating to server config");
          setInitialRoute("/server-config");
          navigate("/server-config");
          return;
        }

        // Otherwise only set the initial route if we have a server connection
        if (serverConnected || route === "/server-config") {
          setInitialRoute(route);
          navigate(route);
        } else if (connectionChecked) {
          // If connection check is complete and failed, go to server config
          console.log("Connection check failed, navigating to server config");
          navigate("/server-config");
        }
      });
    }

    return () => {
      if (window.electron) {
        window.electron.ipcRenderer.removeAllListeners("set-initial-route");
      }
    };
  }, [navigate, serverConnected, connectionChecked]);

  // Monitor fullscreen state changes
  useEffect(() => {
    const handleFullScreenChange = (data) => {
      console.log("Window state changed:", data);
      if (data.isFullScreen !== undefined) {
        setIsFullScreen(data.isFullScreen);

        // Show alert if exited fullscreen
        if (!data.isFullScreen) {
          setShowFullScreenAlert(true);

          // Request to return to fullscreen after a brief delay
          setTimeout(() => {
            if (window.windowManager) {
              window.windowManager.toggleFullscreen();
            }
          }, 3000);
        }
      }
    };

    // Check initial fullscreen state
    if (window.windowManager) {
      window.windowManager.checkFullscreen();
      window.windowManager.onFullscreenChange(handleFullScreenChange);
    }

    // Set up a keyboard shortcut listener for F11
    const handleKeyDown = (event) => {
      if (event.key === "F11") {
        event.preventDefault();
        if (window.windowManager) {
          window.windowManager.toggleFullscreen();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (window.windowManager) {
        // Remove listener (ideally, but might not be exposed in the API)
      }
    };
  }, []);

  // Function to return to fullscreen
  const handleReturnToFullScreen = () => {
    if (window.windowManager) {
      window.windowManager.toggleFullscreen();
      setShowFullScreenAlert(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Routes>
          <Route path="/splash" element={<SplashScreen />} />
          <Route path="/attendance" element={<AttendanceScreen />} />
          <Route path="/server-config" element={<ServerConfigPage />} />
          <Route
            path="*"
            element={
              !connectionChecked ? (
                <SplashScreen />
              ) : !serverConnected ? (
                <Navigate to="/server-config" replace />
              ) : (
                <Navigate to={initialRoute} replace />
              )
            }
          />
        </Routes>

        {/* Fullscreen Alert */}
        <Snackbar
          open={showFullScreenAlert}
          autoHideDuration={3000}
          onClose={() => setShowFullScreenAlert(false)}
          message="For best experience, please use fullscreen mode"
          action={
            <Button
              color="primary"
              size="small"
              onClick={handleReturnToFullScreen}
            >
              Return to Fullscreen
            </Button>
          }
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          sx={{ mb: 2 }}
        />
      </Box>
    </ThemeProvider>
  );
};

export default App;
