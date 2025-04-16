import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Container,
  InputAdornment,
  Divider,
  Stack,
} from "@mui/material";
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  NetworkCheck as NetworkCheckIcon,
  Settings as SettingsIcon,
  RestartAlt as ResetIcon,
} from "@mui/icons-material";
import logo from "../assets/logo.png";
import * as api from "../utils/api";

const ServerConfigPage = () => {
  const [ipAddress, setIpAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  console.log("Server Config Page Loaded");

  // Load current IP address on component mount
  useEffect(() => {
    console.log("ServerConfigPage - Initializing with server IP");
    const savedIp = localStorage.getItem("serverIpAddress");
    if (savedIp) {
      console.log("ServerConfigPage - Found saved IP:", savedIp);
      setIpAddress(savedIp);
    } else if (window.ipConfig) {
      // Try to get IP from the main process if available
      console.log("ServerConfigPage - Requesting IP from main process");
      window.ipConfig
        .getLocalIp()
        .then((ip) => {
          console.log("ServerConfigPage - Got IP from main process:", ip);
          setIpAddress(ip);
        })
        .catch((err) => {
          console.error("Failed to get IP from main process:", err);
          setIpAddress("127.0.0.1"); // Default fallback
        });
    } else {
      console.log("ServerConfigPage - Using default IP");
      setIpAddress("127.0.0.1"); // Default fallback
    }
  }, []);

  // Function to validate IP address format
  const isValidIpAddress = (ip) => {
    const ipRegex =
      /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  // Function to test the server connection
  const testConnection = async () => {
    if (!isValidIpAddress(ipAddress)) {
      setError("Please enter a valid IP address");
      return;
    }

    setTestLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("Testing connection to server IP:", ipAddress);
      // Update API configuration with the new IP address temporarily
      api.updateServerIp(ipAddress);

      // First try using the API testConnection method
      const apiTestResult = await api.testConnection();

      if (apiTestResult.success) {
        console.log("API test connection succeeded:", apiTestResult);
        setSuccess(
          `Connection successful! Server is reachable at ${ipAddress}`
        );
        setTestLoading(false);
        return;
      }

      console.warn("API test failed, trying direct fetch:", apiTestResult);

      // If API method fails, try a direct fetch with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      console.log(`Direct fetch to http://${ipAddress}:3000/api/test`);
      const response = await fetch(`http://${ipAddress}:3000/api/test`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        mode: "cors", // Explicitly set CORS mode
      }).catch((err) => {
        console.error("Test connection fetch error:", err);
        throw err;
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Server returned status ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.success) {
        console.log("Test connection succeeded:", result);
        setSuccess(
          `Connection successful! Server is reachable at ${ipAddress}`
        );
      } else {
        console.error("Test connection failed:", result);
        setError(`Connection failed: ${result.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Test connection error:", err);
      if (err.name === "AbortError") {
        setError(
          `Connection timed out. Server at ${ipAddress} is not responding.`
        );
      } else {
        setError(
          `Connection error: ${err.message || "Cannot connect to server"}`
        );
      }
    } finally {
      setTestLoading(false);
    }
  };

  // Function to save the IP address configuration
  const saveConfiguration = async () => {
    if (!isValidIpAddress(ipAddress)) {
      setError("Please enter a valid IP address");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("Saving configuration with IP:", ipAddress);
      // Update API configuration with the new IP address
      api.updateServerIp(ipAddress);

      // Test the connection before saving with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`http://${ipAddress}:3000/api/test`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }).catch((err) => {
        console.error("Save configuration fetch error:", err);
        throw err;
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("Save configuration success:", result);
        // Save the IP address to local storage
        localStorage.setItem("serverIpAddress", ipAddress);
        console.log("IP address saved to localStorage");
        setSuccess("Server configuration saved successfully!");

        // Wait a moment before redirecting
        setTimeout(() => {
          console.log("Redirecting to splash screen");
          navigate("/splash");
        }, 1500);
      } else {
        console.error("Save configuration failed:", result);
        setError(
          `Cannot save configuration: ${
            result.message || "Server responded with an error"
          }`
        );
      }
    } catch (err) {
      console.error("Save configuration error:", err);
      if (err.name === "AbortError") {
        setError(
          `Connection timed out. Server at ${ipAddress} is not responding.`
        );
      } else {
        setError(
          `Cannot save configuration: ${err.message || "Unknown error"}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to reset the server configuration
  const resetConfiguration = () => {
    setResetLoading(true);
    setError("");
    setSuccess("");

    try {
      // Clear the saved IP address
      localStorage.removeItem("serverIpAddress");

      // Reset to the correct IP address
      const defaultIp = "192.168.1.19"; // Updated to match the server
      setIpAddress(defaultIp);
      api.updateServerIp(defaultIp);
      setSuccess(`Server configuration has been reset to ${defaultIp}`);

      // Wait a moment before testing the connection with the new IP
      setTimeout(() => {
        testConnection();
      }, 500);
    } catch (err) {
      console.error("Reset configuration error:", err);
      setError(`Failed to reset configuration: ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100vw",
        backgroundColor: "#f5f7fa",
        padding: 0,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          p: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: 700,
          width: "90%",
          borderRadius: 3,
          background: "linear-gradient(to bottom right, #ffffff, #f9f9f9)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Box sx={{ mb: 4, display: "flex", alignItems: "center" }}>
          <img src={logo} alt="Logo" style={{ height: 100, marginRight: 20 }} />
          <Typography
            variant="h3"
            component="h1"
            sx={{ fontWeight: 700, color: "#1976d2" }}
          >
            Server Configuration
          </Typography>
        </Box>

        <Typography
          variant="h6"
          sx={{ mb: 4, textAlign: "center", maxWidth: "80%" }}
        >
          The application cannot connect to the server. Please configure the
          server IP address to continue.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: "100%", mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ width: "100%", mb: 3 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ width: "100%", mb: 5 }}>
          <TextField
            fullWidth
            label="Server IP Address"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            margin="normal"
            variant="outlined"
            placeholder="e.g., 192.168.1.100"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <NetworkCheckIcon fontSize="large" color="primary" />
                </InputAdornment>
              ),
              style: { fontSize: "1.2rem", padding: "0.5rem 0" },
            }}
            error={!!error && error.includes("valid IP address")}
            helperText={
              error && error.includes("valid IP address")
                ? error
                : "Enter the IP address of the attendance server"
            }
            sx={{ mb: 3 }}
          />
        </Box>

        <Stack direction="row" spacing={2} sx={{ width: "100%", mb: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            color="primary"
            onClick={testConnection}
            disabled={testLoading}
            startIcon={
              testLoading ? (
                <CircularProgress size={24} />
              ) : (
                <RefreshIcon fontSize="large" />
              )
            }
            size="large"
            sx={{ py: 2, fontSize: "1.1rem" }}
          >
            {testLoading ? "Testing..." : "Test Connection"}
          </Button>

          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={saveConfiguration}
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={24} />
              ) : (
                <SaveIcon fontSize="large" />
              )
            }
            size="large"
            sx={{ py: 2, fontSize: "1.1rem" }}
          >
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </Stack>

        <Button
          fullWidth
          variant="outlined"
          color="secondary"
          onClick={resetConfiguration}
          disabled={resetLoading}
          startIcon={
            resetLoading ? (
              <CircularProgress size={24} />
            ) : (
              <ResetIcon fontSize="medium" />
            )
          }
          size="medium"
          sx={{ mt: 1, py: 1.5, fontSize: "1rem" }}
        >
          {resetLoading ? "Resetting..." : "Reset to Default"}
        </Button>
      </Paper>
    </Box>
  );
};

export default ServerConfigPage;
