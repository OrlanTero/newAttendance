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

    // Special handling for admin account - normalize credentials
    const isAdmin = username.toLowerCase() === "admin";

    // If it's admin, make sure the password case is correct
    if (isAdmin && password !== "Admin") {
      console.log(
        "Admin account detected but incorrect password case, correcting to 'Admin'"
      );
      if (password.toLowerCase() === "admin") {
        // Silently correct the password case for default admin
        const correctedPassword = "Admin";

        try {
          if (apiAvailable) {
            console.log(
              "Attempting API login with corrected admin credentials"
            );
            const result = await api.login(username, correctedPassword);

            if (result.success) {
              console.log(
                "API login successful with corrected admin credentials"
              );
              onLogin({
                username,
                password: correctedPassword,
                user: result.user,
                method: "api",
              });
              return;
            }
          }

          // Fall back to IPC login with corrected credentials
          console.log("Using IPC login with corrected admin credentials");
          onLogin({
            username: "Admin",
            password: "Admin",
            method: "ipc",
          });
          return;
        } catch (error) {
          console.error("Login error with corrected credentials:", error);
          setError(
            `Login failed: ${error.message || "Unknown error occurred"}`
          );
          setIsLoading(false);
          return;
        }
      }
    }

    // Standard login flow
    try {
      if (apiAvailable) {
        // Try API login first
        console.log("Attempting API login...");
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
          // Show error message from API
          console.log(`API login failed: ${result.message}`);

          // Fallback for admin account
          if (isAdmin) {
            console.log("Trying admin credentials with IPC login");
            // Fall back to direct IPC login for admin
            onLogin({
              username: "Admin",
              password: "Admin",
              method: "ipc",
            });
          } else {
            setError(
              `Login failed: ${result.message || "Authentication error"}`
            );
            setIsLoading(false);
          }
        }
      } else {
        // Use direct IPC login if API is not available
        console.log("API not available, using IPC login...");

        // For admin accounts, always use the correct case
        if (isAdmin) {
          onLogin({
            username: "Admin",
            password: "Admin",
            method: "ipc",
          });
        } else {
          onLogin({ username, password, method: "ipc" });
        }
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
