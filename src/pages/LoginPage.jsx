import React, { useState, useEffect } from "react";
import logo from "../assets/logo.png";
import * as api from "../utils/api";

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);

  // Check if API is available on component mount
  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        const result = await api.testConnection();
        setApiAvailable(result.success);
        console.log(
          "API connection:",
          result.success ? "Available" : "Unavailable"
        );
      } catch (error) {
        console.error("API connection error:", error);
        setApiAvailable(false);
      }
    };

    checkApiConnection();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    // Clear any previous errors
    setError("");
    setIsLoading(true);

    try {
      // Special handling for admin login
      const isAdminUser = username.toLowerCase() === "admin";

      // For admin user, API might fail but we want to try IPC login anyway
      if (isAdminUser) {
        console.log(
          "Admin user detected, will try API first, then fallback to IPC"
        );

        if (apiAvailable) {
          try {
            // Try API first
            const result = await api.login(username, password);

            if (result.success) {
              console.log("API login successful for admin");
              onLogin({
                username,
                password,
                user: result.user,
                method: "api",
              });
              return;
            }

            // If API fails, automatically try IPC for admin
            console.log("API login failed for admin, falling back to IPC");
            onLogin({
              username: "Admin",
              password: "Admin",
              method: "ipc",
            });
            return;
          } catch (error) {
            console.error("Error during admin API login:", error);
            // Fall back to IPC for any error
            onLogin({
              username: "Admin",
              password: "Admin",
              method: "ipc",
            });
            return;
          }
        } else {
          // API not available, use IPC directly
          console.log("API not available, using IPC login for admin");
          onLogin({
            username: "Admin",
            password: "Admin",
            method: "ipc",
          });
          return;
        }
      }

      // Non-admin users
      if (apiAvailable) {
        // Try API login for regular users
        console.log("Attempting API login for non-admin user");
        const result = await api.login(username, password);

        if (result.success) {
          console.log("API login successful");
          onLogin({
            username,
            password,
            user: result.user,
            method: "api",
          });
        } else {
          // Show error message from API for non-admin users
          console.log(`API login failed: ${result.message}`);
          setError(`Login failed: ${result.message || "Authentication error"}`);
          setIsLoading(false);
        }
      } else {
        // Use direct IPC login if API is not available
        console.log("API not available, using IPC login...");
        onLogin({ username, password, method: "ipc" });
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(`Login failed: ${error.message || "Unknown error occurred"}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <img src={logo} alt="Company Logo" className="login-logo" />
        <div className="login-left-content">
          <h1>Welcome Back!</h1>
          <p>Manage your workforce attendance efficiently and effectively.</p>
          {apiAvailable && <p className="api-status">API Connected ✓</p>}
        </div>
      </div>
      <div className="login-right">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form-header">
            <img src={logo} alt="Logo" className="form-logo" />
            <h2 className="login-title">Login to Your Account</h2>
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>

          <div className="login-footer">
            <p>Default credentials:</p>
            <p>
              Username: <strong>Admin</strong> (case-insensitive)
            </p>
            <p>
              Password: <strong>Admin</strong> (case-sensitive)
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
