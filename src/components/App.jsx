import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material";
import { CssBaseline } from "@mui/material";
import SplashScreen from "../pages/SplashScreen";
import LoginPage from "../pages/LoginPage";
import MainPage from "../pages/MainPage";
import EmployeesPage from "../pages/EmployeesPage";
import DepartmentsPage from "../pages/DepartmentsPage";
import HolidaysPage from "../pages/HolidaysPage";
import FingerprintPage from "../pages/FingerprintPage";
import AttendancePage from "../pages/AttendancePage";
import ReportPage from "../pages/ReportPage";
import ProfilePage from "../pages/ProfilePage";
import ChangePasswordPage from "../pages/ChangePasswordPage";
import BackupPage from "../pages/BackupPage";
import SettingsPage from "../pages/SettingsPage";
import EventsPage from "../pages/EventsPage";
import UserManagementPage from "../pages/UserManagementPage";

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Initialize auth state from session storage
    const savedAuth = sessionStorage.getItem("isAuthenticated");
    return savedAuth === "true";
  });
  const [currentUser, setCurrentUser] = useState(() => {
    // Initialize user state from session storage
    const savedUser = sessionStorage.getItem("currentUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the initial route from the main process
    if (window.electron) {
      window.electron.ipcRenderer.on("set-initial-route", (route) => {
        setInitialRoute(route);
        navigate(route);
      });

      // Listen for login response
      window.electron.ipcRenderer.on("login-response", (response) => {
        if (response.success) {
          handleAuthSuccess(response.user || { username: response.username });
        }
      });
    }

    // Cleanup listeners
    return () => {
      if (window.electron) {
        window.electron.ipcRenderer.removeAllListeners("set-initial-route");
        window.electron.ipcRenderer.removeAllListeners("login-response");
      }
    };
  }, [navigate]);

  // Function to handle successful authentication
  const handleAuthSuccess = (user) => {
    // Ensure user has a valid user_id
    if (!user.user_id && user.username) {
      console.warn(
        "User from authentication is missing user_id, adding a placeholder:",
        user
      );
      // If user_id is missing but we have a username, add a placeholder user_id
      // This should be replaced with the actual user_id when API data is fetched
      user = {
        ...user,
        user_id: user.id || 1, // Default to 1 for Admin, should be replaced later
      };
    }

    console.log("Setting authenticated user:", user);
    setIsAuthenticated(true);
    setCurrentUser(user);

    // Save to session storage
    sessionStorage.setItem("isAuthenticated", "true");
    sessionStorage.setItem("currentUser", JSON.stringify(user));
    navigate("/main");
  };

  // Function to handle user profile update
  const handleProfileUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
    // Update in session storage
    sessionStorage.setItem("currentUser", JSON.stringify(updatedUser));
  };

  // Function to handle login
  const handleLogin = (credentials) => {
    const { method, user } = credentials;

    if (method === "api" && user) {
      handleAuthSuccess(user);
    } else if (window.electron) {
      // Fall back to IPC login
      window.electron.ipcRenderer.send("login", {
        username: credentials.username,
        password: credentials.password,
      });
    }
  };

  // Function to handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    // Clear session storage
    sessionStorage.removeItem("isAuthenticated");
    sessionStorage.removeItem("currentUser");

    if (window.electron) {
      window.electron.ipcRenderer.send("logout");
    }

    navigate("/login");
  };

  // Handle navigation from MainPage
  const handleNavigate = (route) => {
    navigate(`/${route}`);
  };

  // Protected route component
  const ProtectedRoute = ({ element, allowedRoles = [] }) => {
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    // If no roles specified or user has admin role, allow access
    if (allowedRoles.length === 0 || currentUser?.role === "admin") {
      return element;
    }

    // Check if user's role is in the allowed roles
    if (currentUser?.role && allowedRoles.includes(currentUser.role)) {
      return element;
    }

    // If role not allowed, redirect to main page
    return <Navigate to="/main" replace />;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/splash" element={<SplashScreen />} />
        <Route
          path="/login"
          element={
            <LoginPage
              onLogin={handleLogin}
              isAuthenticated={isAuthenticated}
            />
          }
        />
        <Route
          path="/main"
          element={
            <ProtectedRoute
              element={
                <MainPage
                  user={currentUser}
                  onLogout={handleLogout}
                  onNavigate={handleNavigate}
                />
              }
            />
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute
              element={
                <EmployeesPage user={currentUser} onLogout={handleLogout} />
              }
              allowedRoles={["admin"]}
            />
          }
        />
        <Route
          path="/departments"
          element={
            <ProtectedRoute
              element={
                <DepartmentsPage user={currentUser} onLogout={handleLogout} />
              }
              allowedRoles={["admin"]}
            />
          }
        />
        <Route
          path="/holidays"
          element={
            <ProtectedRoute
              element={
                <HolidaysPage user={currentUser} onLogout={handleLogout} />
              }
              allowedRoles={["admin"]}
            />
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute
              element={
                <EventsPage user={currentUser} onLogout={handleLogout} />
              }
              allowedRoles={["admin", "captain", "secretary"]}
            />
          }
        />
        <Route
          path="/fingerprint"
          element={
            <ProtectedRoute
              element={
                <FingerprintPage user={currentUser} onLogout={handleLogout} />
              }
              allowedRoles={["admin"]}
            />
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute
              element={
                <AttendancePage user={currentUser} onLogout={handleLogout} />
              }
              allowedRoles={["admin", "captain"]}
            />
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute
              element={
                <ReportPage user={currentUser} onLogout={handleLogout} />
              }
              allowedRoles={["admin", "captain", "secretary"]}
            />
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute
              element={
                <ProfilePage user={currentUser} onLogout={handleLogout} />
              }
            />
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute
              element={
                <ChangePasswordPage
                  user={currentUser}
                  onLogout={handleLogout}
                />
              }
            />
          }
        />
        <Route
          path="/backup"
          element={
            <ProtectedRoute
              element={
                <BackupPage user={currentUser} onLogout={handleLogout} />
              }
              allowedRoles={["admin"]}
            />
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute
              element={
                <SettingsPage user={currentUser} onLogout={handleLogout} />
              }
              allowedRoles={["admin", "captain"]}
            />
          }
        />
        <Route
          path="/user-management"
          element={
            <ProtectedRoute
              element={
                <UserManagementPage
                  user={currentUser}
                  onLogout={handleLogout}
                />
              }
              allowedRoles={["admin", "captain"]}
            />
          }
        />
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? "/main" : "/login"} />}
        />
        <Route path="*" element={<Navigate to="/main" />} />
      </Routes>
    </ThemeProvider>
  );
};

export default App;
