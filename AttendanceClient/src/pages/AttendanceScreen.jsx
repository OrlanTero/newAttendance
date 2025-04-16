import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Alert,
  Chip,
} from "@mui/material";
import logo from "../assets/logo.png";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import CelebrationIcon from "@mui/icons-material/Celebration";
import SignalWifiOffIcon from "@mui/icons-material/SignalWifiOff";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import { io } from "socket.io-client";
import * as api from "../utils/api";
import { useNavigate } from "react-router-dom";

// Standby Screen Component
const StandbyScreen = ({ currentTime, onRetryConnection }) => {
  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        p: { xs: 2, sm: 3 },
        overflow: "hidden",
        backgroundColor: "#f5f7fa",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          py: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <img src={logo} alt="Logo" style={{ height: 50, marginRight: 16 }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Attendance System
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 500 }}>
          {currentTime.toLocaleTimeString()}
        </Typography>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: { xs: 4, sm: 5 },
            borderRadius: 2,
            maxWidth: 600,
            width: "100%",
            textAlign: "center",
          }}
        >
          <SignalWifiOffIcon
            sx={{ fontSize: 100, color: "error.main", mb: 3 }}
          />

          <Typography variant="h4" gutterBottom>
            Fingerprint Service Unavailable
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            The fingerprint service is not responding. This could be due to a
            connection issue or because the fingerprint reader is not properly
            connected.
          </Typography>

          <Alert severity="info" sx={{ mb: 4, textAlign: "left" }}>
            <Typography variant="body2">
              Please ensure:
              <ul>
                <li>
                  The fingerprint reader is properly connected to the system
                </li>
                <li>The BiometricAPI service is running</li>
                <li>
                  Network connection is stable (if using a networked fingerprint
                  reader)
                </li>
              </ul>
            </Typography>
          </Alert>

          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<RestartAltIcon />}
            onClick={onRetryConnection}
            sx={{ minWidth: 200 }}
          >
            Retry Connection
          </Button>
        </Paper>
      </Box>
    </Box>
  );
};

const AttendanceScreen = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState("idle"); // idle, init, connecting, ready, capturing, verifying, success, error, processing, holiday, rest-day
  const [message, setMessage] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [fingerprintData, setFingerprintData] = useState(null);
  const [socket, setSocket] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState(null); // present, late, absent
  const [attendanceType, setAttendanceType] = useState(null); // check-in, check-out
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [nonWorkingDayReason, setNonWorkingDayReason] = useState(null); // holiday, rest-day
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketErrorCount, setSocketErrorCount] = useState(0);
  const [biometricServiceAvailable, setBiometricServiceAvailable] =
    useState(true); // Flag for service availability
  const [connectionAttempts, setConnectionAttempts] = useState(0); // Track connection attempts
  const navigate = useNavigate();

  // Constants for time calculations
  const SHIFT_START_HOUR = 8; // 8 AM
  const SHIFT_END_HOUR = 18; // 6 PM
  const GRACE_PERIOD_MINUTES = 15; // 15 min grace period
  const CONNECTION_TIMEOUT = 5000; // 5 seconds timeout

  // Initialize socket connection
  useEffect(() => {
    // First, check if the server is reachable
    const checkServerConnection = async () => {
      try {
        const result = await api.testConnection();
        if (!result.success) {
          console.error(
            "Server connection failed before socket initialization"
          );
          navigate("/server-config");
          return false;
        }
        return true;
      } catch (error) {
        console.error("Server connection error:", error);
        navigate("/server-config");
        return false;
      }
    };

    // Main initialization function
    const initializeSocket = async () => {
      // Only proceed if server is reachable
      const isServerConnected = await checkServerConnection();
      if (!isServerConnected) return;

      // Reset error count when we try to connect
      setSocketErrorCount(0);

      // Implement exponential backoff for reconnection attempts
      // Only increment connectionAttempts if the last attempt was more than 5 seconds ago
      const now = Date.now();
      const lastAttemptTime = window.lastConnectionAttemptTime || 0;
      if (now - lastAttemptTime < 5000 && connectionAttempts > 0) {
        console.log("Throttling connection attempts - waiting to retry");
        setTimeout(() => {
          setConnectionAttempts((prev) => prev + 1);
        }, 5000);
        return;
      }

      window.lastConnectionAttemptTime = now;
      setConnectionAttempts((prev) => prev + 1);

      let connectionTimeoutId = null;
      let newSocket = null;

      try {
        // Create socket connection with options to immediately disable after first failure
        console.log(`Connecting to socket server at ${api.SOCKET_API_URL}`);
        console.log(`Connection attempt #${connectionAttempts}`);

        // Check if the socket server port is accessible before attempting connection
        try {
          // Simple fetch to check if the port is open - will fail for CORS but that's okay
          // We just want to see if the port is reachable
          console.log(
            `Checking if socket server port is accessible at port 3006...`
          );
          let portCheck = null;

          try {
            portCheck = await fetch(`${api.SOCKET_API_URL}/health-check`, {
              mode: "no-cors",
              timeout: 2000,
            });
          } catch (e) {
            console.log("Port check failed with error:", e.message);
            // Continue with portCheck being null
          }

          if (!portCheck) {
            console.log(
              "Socket server port is not accessible, skipping socket connection"
            );
            setBiometricServiceAvailable(false);

            // Check if we need to start the BiometricAPI
            // Use a safer way to check for Electron environment
            try {
              // Check if window.electron (from preload) is available instead of using require directly
              if (window.electron && window.electron.ipcRenderer) {
                console.log(
                  "Electron IPC renderer is available, attempting to restart BiometricAPI"
                );
                window.electron.ipcRenderer.send("check-biometric-api");

                window.electron.ipcRenderer.once(
                  "biometric-api-status",
                  (running) => {
                    console.log(
                      "BiometricAPI status:",
                      running ? "running" : "not running"
                    );
                    if (!running) {
                      console.log("Attempting to start BiometricAPI...");
                      window.electron.ipcRenderer.send("start-biometric-api");
                    }
                  }
                );
              } else {
                console.log(
                  "Not running in Electron environment or IPC renderer not exposed"
                );
              }
            } catch (error) {
              console.log("Error accessing Electron IPC:", error);
            }

            return;
          }
          console.log("Socket server port appears to be accessible");
        } catch (e) {
          // If we get any error, the port is likely not available
          console.error("Socket server port check failed:", e);
          setBiometricServiceAvailable(false);
          return;
        }

        newSocket = io(api.SOCKET_API_URL, {
          reconnectionAttempts: 2, // Increased from 1 to 2
          timeout: CONNECTION_TIMEOUT,
          reconnectionDelay: 1000, // Add a small delay between attempts
          autoConnect: true,
          reconnection: true, // Enable reconnection but with limited attempts
        });

        newSocket.on("connect", () => {
          console.log("Connected to fingerprint server");
          setMessage("Connected to fingerprint server");
          setStatus("connecting");
          setSocketConnected(true);
          setSocketErrorCount(0);
          setBiometricServiceAvailable(true);

          // Clear timeout if we successfully connect
          if (connectionTimeoutId) {
            clearTimeout(connectionTimeoutId);
            connectionTimeoutId = null;
          }
        });

        newSocket.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
          setMessage("Could not connect to fingerprint server");
          setStatus("error");
          setSocketConnected(false);

          // Increment the error count
          setSocketErrorCount((prev) => prev + 1);

          // Only disable reconnection after multiple attempts
          if (socketErrorCount >= 3) {
            console.log(
              "Multiple connection errors - stopping reconnection attempts"
            );
            if (newSocket) {
              newSocket.io.opts.reconnection = false;
              if (newSocket.connected) {
                newSocket.disconnect();
              }
            }

            // Set the biometric service as unavailable
            setBiometricServiceAvailable(false);
          } else {
            // Log the attempt but keep trying
            console.log(
              `Connection error (attempt ${
                socketErrorCount + 1
              }) - will retry...`
            );
          }
        });

        // If we get disconnected, update the state but allow for reconnection attempts
        newSocket.on("disconnect", () => {
          console.log("Disconnected from fingerprint server");
          setMessage("Disconnected from fingerprint server");
          setStatus("error");
          setIsInitialized(false);
          setSocketConnected(false);

          // Don't immediately set service as unavailable
          // Allow for reconnection attempts as configured
          if (socketErrorCount >= 3) {
            console.log(
              "Too many connection failures - setting service as unavailable"
            );
            setBiometricServiceAvailable(false);

            // Only disable reconnection after multiple attempts
            if (newSocket) {
              newSocket.io.opts.reconnection = false;
            }
          }
        });

        // Set a shorter timeout
        connectionTimeoutId = setTimeout(() => {
          console.log(
            "Connection timeout - no response from fingerprint server"
          );
          setBiometricServiceAvailable(false);

          if (newSocket) {
            newSocket.io.opts.reconnection = false;
            if (newSocket.connected) {
              newSocket.disconnect();
            }
          }
        }, CONNECTION_TIMEOUT + 1000); // Just slightly longer than the socket timeout

        newSocket.on("BIOMETRIC_CONNECTED", (data) => {
          console.log("Biometric connected:", data);
          setMessage("Biometric connected");
          setStatus("ready");
          setIsInitialized(true);
          setBiometricServiceAvailable(true);

          if (newSocket.connected) {
            newSocket.emit("START");
          }
        });

        newSocket.on("BIOMETRIC_DISCONNECTED", (data) => {
          console.log("Biometric disconnected:", data);
          setMessage("Biometric disconnected");
          setStatus("error");
          setIsInitialized(false);
        });

        // Listen for fingerprint capture results
        newSocket.on("FINGERPRINT_CAPTURE", (data) => {
          setFingerprintData(data);
          setMessage("Fingerprint captured successfully");
          setStatus("verifying");
        });

        newSocket.on("CAPTURE", (data) => {
          console.log("Fingerprint captured:", data);
          setFingerprintData(data);
          setMessage("Fingerprint captured successfully");
          setStatus("capturing");
        });

        newSocket.on("VERIFY_RESULT", (data) => {
          const result = JSON.parse(data.result);

          if (result.result === "success") {
            // employee is the same structure of the employee object in the database
            setEmployee(result.employee);
            setMessage("Employee found: " + result.employee.display_name);
            setStatus("processing"); // Change to processing to handle attendance logic
            handleEmployeeIdentified(result.employee);
          } else {
            setMessage("Employee not found");
            setStatus("error");
            setEmployee(null);

            // Reset after 5 seconds
            setTimeout(() => {
              resetScan();
            }, 2000);
          }
        });

        setSocket(newSocket);

        // Clean up function to disconnect socket when component unmounts
        return () => {
          console.log("Cleaning up socket connection");
          if (connectionTimeoutId) {
            clearTimeout(connectionTimeoutId);
          }

          if (newSocket) {
            // Explicitly disable reconnection before disconnecting
            newSocket.io.opts.reconnection = false;

            try {
              if (newSocket.connected) {
                newSocket.disconnect();
              }
            } catch (e) {
              console.error("Error during socket cleanup:", e);
            }
          }
        };
      } catch (error) {
        console.error("Error initializing socket:", error);
        setMessage("Failed to connect to server");
        setStatus("error");
        setBiometricServiceAvailable(false);

        if (connectionTimeoutId) {
          clearTimeout(connectionTimeoutId);
        }
      }
    };

    // Initialize the socket
    const cleanup = initializeSocket();

    // This is the cleanup function that runs when the component unmounts
    return () => {
      if (typeof cleanup === "function") {
        cleanup();
      }
      if (socket) {
        // Ensure reconnection is disabled
        try {
          socket.io.opts.reconnection = false;
          socket.disconnect();
        } catch (e) {
          console.error("Error during socket cleanup in return:", e);
        }
      }
    };
  }, [navigate, connectionAttempts]); // Remove MAX_SOCKET_ERRORS from dependencies

  // This effect will run when socket is set and will emit START
  useEffect(() => {
    if (socket && socket.connected) {
      console.log("Emitting START event to socket server");
      socket.emit("START");
    }
  }, [socket, socketConnected]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Effect for refreshing attendance data periodically
  useEffect(() => {
    // Initial fetch of today's attendance
    fetchTodayAttendance();

    // Set up interval for periodic refresh
    const refreshTimer = setInterval(() => {
      fetchTodayAttendance();
    }, 60000); // Every minute

    return () => clearInterval(refreshTimer);
  }, []);

  useEffect(() => {
    if (status === "verifying") {
      socket.emit("VERIFY", fingerprintData);
    }
  }, [status, fingerprintData]);

  // Function to fetch today's attendance records
  const fetchTodayAttendance = async () => {
    try {
      // Get today's date in local timezone YYYY-MM-DD format
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const todayStr = `${year}-${month}-${day}`;

      console.log("Fetching attendance for today's date:", todayStr);
      const response = await api.getAttendanceByDate(todayStr);
      console.log("Today's attendance:", response);
      setTodayAttendance(response);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error("Error fetching today's attendance:", error);
    }
  };

  // Function to format time from ISO string
  const formatTime = (timeString) => {
    if (!timeString) return "N/A";

    // Create a date object from the ISO string
    // For consistent display in local time, we need to handle the timezone properly
    const time = new Date(timeString);

    // Format the time in the local timezone
    return time.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true, // Use 12-hour format with AM/PM
    });
  };

  // Helper function to get today's date in YYYY-MM-DD format in local timezone
  const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Function to handle employee identification and determine attendance action
  const handleEmployeeIdentified = async (employee) => {
    try {
      console.log("Employee identified:", employee);

      // First, check if today is a working day for this employee
      const today = getTodayDateString();
      const workingDayCheck = await api.isWorkingDay(
        today,
        employee.employee_id
      );

      if (!workingDayCheck.isWorkingDay) {
        // Today is not a working day for this employee
        console.log(
          `Today is not a working day for ${employee.display_name}. Reason: ${workingDayCheck.reason}`
        );

        setNonWorkingDayReason(workingDayCheck.reason);

        if (workingDayCheck.reason === "holiday") {
          setMessage(
            `Today is a holiday. ${employee.display_name} is not scheduled to work.`
          );
          setStatus("holiday");
        } else if (workingDayCheck.reason === "rest day") {
          setMessage(`Today is a rest day for ${employee.display_name}.`);
          setStatus("rest-day");
        }

        // Reset after 5 seconds
        setTimeout(() => {
          resetScan();
        }, 5000);

        return;
      }

      // Get today's attendance records for this employee
      console.log("Checking attendance for employee ID:", employee.employee_id);
      const attendanceRecords = await api.getAttendanceByEmployeeAndDate(
        employee.employee_id,
        today
      );
      console.log("Attendance records found:", attendanceRecords);

      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      const currentMinutes = currentTime.getMinutes();

      // Calculate if within shift hours
      const isWithinShiftHours =
        currentHour >= SHIFT_START_HOUR && currentHour < SHIFT_END_HOUR;

      // Calculate if late (after start time + grace period)
      const isLate =
        currentHour > SHIFT_START_HOUR ||
        (currentHour === SHIFT_START_HOUR &&
          currentMinutes > GRACE_PERIOD_MINUTES);

      // Determine attendance status
      let status = "present";
      if (isWithinShiftHours && isLate) {
        status = "late";
      } else if (!isWithinShiftHours && currentHour >= SHIFT_END_HOUR) {
        status = "present"; // Still present if checking out after shift end
      }

      // If no records for today, this is a check-in
      if (!attendanceRecords || attendanceRecords.length === 0) {
        setAttendanceType("check-in");
        setAttendanceStatus(status);

        // Record check-in
        console.log("Checking in employee with ID:", employee.employee_id);
        const checkInResult = await api.checkInEmployee(employee.employee_id);
        console.log("Check-in result:", checkInResult);

        if (checkInResult.success) {
          setAttendanceRecord(checkInResult.data);
          setMessage(
            `${employee.display_name} successfully checked in (${status})`
          );
          setStatus("success");

          // Refresh attendance list after successful check-in
          fetchTodayAttendance();
        } else {
          setMessage(`Failed to check in: ${checkInResult.message}`);
          setStatus("error");
        }
      }
      // If there's a record without check_out, this is a check-out
      else {
        const latestRecord = attendanceRecords[attendanceRecords.length - 1];

        if (!latestRecord.check_out) {
          setAttendanceType("check-out");
          setAttendanceStatus("present"); // Always present when checking out

          // Record check-out
          const checkOutResult = await api.checkOutEmployee(
            latestRecord.attendance_id
          );
          if (checkOutResult.success) {
            setAttendanceRecord(checkOutResult.data);
            setMessage(`${employee.display_name} successfully checked out`);
            setStatus("success");

            // Refresh attendance list after successful check-out
            fetchTodayAttendance();
          } else {
            setMessage(`Failed to check out: ${checkOutResult.message}`);
            setStatus("error");
          }
        } else {
          // Already checked in and out today
          setMessage(
            `${employee.display_name} has already completed attendance for today`
          );
          setStatus("success");
        }
      }

      // Reset after 5 seconds
      setTimeout(() => {
        resetScan();
      }, 5000);
    } catch (error) {
      console.error("Error handling employee identification:", error);
      setMessage("Error processing attendance: " + error.message);
      setStatus("error");

      // Reset after 5 seconds
      setTimeout(() => {
        resetScan();
      }, 5000);
    }
  };

  // Function to reset scan state
  const resetScan = () => {
    setStatus("ready");
    setMessage("Scanner initialized. Ready to scan.");
    setEmployee(null);
    setAttendanceRecord(null);
    setAttendanceStatus(null);
    setAttendanceType(null);
    setFingerprintData(null);
    setNonWorkingDayReason(null);

    // Restart scanning if socket is available
    if (socket) {
      socket.emit("START");
    }
  };

  // Handler to retry connecting to the biometric service
  const handleRetryConnection = () => {
    console.log("Attempting to reconnect to biometric service...");
    setBiometricServiceAvailable(true); // Reset to try again
    setSocketErrorCount(0); // Reset error count
    setStatus("init"); // Reset status to show connecting animation

    // Reset the last connection attempt time to ensure we can connect immediately
    window.lastConnectionAttemptTime = 0;

    // Add a small delay before attempting to reconnect
    setTimeout(() => {
      setConnectionAttempts((prev) => prev + 1); // Increment to trigger useEffect
    }, 1000);
  };

  // Helper function to render status icon
  const renderStatusIcon = () => {
    switch (status) {
      case "ready":
        return (
          <FingerprintIcon
            sx={{
              fontSize: 100,
              color: "primary.main",
              mb: 2,
            }}
          />
        );
      case "capturing":
      case "verifying":
      case "processing":
        return <CircularProgress size={100} sx={{ mb: 2 }} />;
      case "success":
        return (
          <CheckCircleIcon
            sx={{
              fontSize: 100,
              color: "success.main",
              mb: 2,
            }}
          />
        );
      case "error":
        return (
          <ErrorIcon
            sx={{
              fontSize: 100,
              color: "error.main",
              mb: 2,
            }}
          />
        );
      case "holiday":
        return (
          <CelebrationIcon
            sx={{
              fontSize: 100,
              color: "info.main",
              mb: 2,
            }}
          />
        );
      case "rest-day":
        return (
          <EventBusyIcon
            sx={{
              fontSize: 100,
              color: "info.main",
              mb: 2,
            }}
          />
        );
      default:
        return (
          <FingerprintIcon
            sx={{
              fontSize: 100,
              color: "primary.main",
              mb: 2,
            }}
          />
        );
    }
  };

  // Function to render attendance status badge
  const renderStatusBadge = (status) => {
    const colorMap = {
      present: "#4caf50",
      late: "#ff9800",
      absent: "#f44336",
    };

    return (
      <Box
        sx={{
          display: "inline-block",
          px: 1,
          py: 0.5,
          borderRadius: 1,
          backgroundColor: colorMap[status] || "#e0e0e0",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "0.75rem",
          textTransform: "uppercase",
        }}
      >
        {status}
      </Box>
    );
  };

  // Function to render the non-working day message
  const renderNonWorkingDayAlert = () => {
    if (status !== "holiday" && status !== "rest-day") return null;

    const isHoliday = nonWorkingDayReason === "holiday";

    return (
      <Alert
        severity="info"
        sx={{
          mb: 2,
          alignItems: "center",
          backgroundColor: isHoliday
            ? "rgba(103, 58, 183, 0.1)"
            : "rgba(33, 150, 243, 0.1)",
        }}
        icon={isHoliday ? <CelebrationIcon /> : <EventBusyIcon />}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: "medium" }}>
            {isHoliday ? "Today is a holiday" : "Today is a scheduled rest day"}
          </Typography>
          <Chip
            label={isHoliday ? "Holiday" : "Rest Day"}
            color={isHoliday ? "secondary" : "primary"}
            size="small"
          />
        </Box>
      </Alert>
    );
  };

  // If the biometric service is not available, show the standby screen
  if (!biometricServiceAvailable) {
    return (
      <StandbyScreen
        currentTime={currentTime}
        onRetryConnection={handleRetryConnection}
      />
    );
  }

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        p: { xs: 2, sm: 3 },
        overflow: "hidden",
        backgroundColor: "#f5f7fa",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          py: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <img src={logo} alt="Logo" style={{ height: 50, marginRight: 16 }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Attendance System
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 500 }}>
          {currentTime.toLocaleTimeString()}
        </Typography>
      </Box>

      {/* Main Content - Split Screen Layout */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
          overflow: "hidden",
          height: "calc(100vh - 100px)", // Adjust for header height
        }}
      >
        {/* Left side - Check In/Out */}
        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, sm: 4 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: { xs: "100%", md: "40%" },
            height: { xs: "auto", md: "100%" },
            overflow: "auto",
            borderRadius: 2,
          }}
        >
          <Typography variant="h5" gutterBottom align="center">
            Fingerprint Authentication
          </Typography>

          {renderStatusIcon()}

          {/* Display non-working day alert if applicable */}
          {renderNonWorkingDayAlert()}

          {status === "success" && employee && (
            <Typography variant="h6" gutterBottom align="center">
              {attendanceType === "check-in" ? "Check In" : "Check Out"} -{" "}
              {employee.display_name}
            </Typography>
          )}

          {status === "success" && attendanceStatus && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                bgcolor:
                  attendanceStatus === "late"
                    ? "warning.light"
                    : "success.light",
                px: 2,
                py: 1,
                borderRadius: 1,
                mb: 2,
              }}
            >
              <AccessTimeIcon
                sx={{
                  mr: 1,
                  color:
                    attendanceStatus === "late"
                      ? "warning.dark"
                      : "success.dark",
                }}
              />
              <Typography
                variant="body1"
                sx={{
                  color:
                    attendanceStatus === "late"
                      ? "warning.dark"
                      : "success.dark",
                  fontWeight: "bold",
                }}
              >
                {attendanceStatus === "late" ? "Late" : "On Time"}
              </Typography>
            </Box>
          )}

          <Typography
            variant="body1"
            textAlign="center"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            {message ||
              "Please place your finger on the scanner to record your attendance."}
          </Typography>

          {employee && status === "success" && (
            <Box sx={{ textAlign: "center", mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {`ID: ${employee.unique_id || employee.employee_id}`}
              </Typography>
              {attendanceRecord && (
                <Typography variant="body2" color="text.secondary">
                  {attendanceType === "check-in"
                    ? `Check In Time: ${new Date(
                        attendanceRecord.check_in
                      ).toLocaleTimeString()}`
                    : `Check Out Time: ${new Date(
                        attendanceRecord.check_out
                      ).toLocaleTimeString()}`}
                </Typography>
              )}
            </Box>
          )}

          {status === "error" && (
            <Button
              variant="contained"
              color="error"
              onClick={resetScan}
              sx={{ mt: 2 }}
            >
              Try Again
            </Button>
          )}
        </Paper>

        {/* Right side - Today's Attendance */}
        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, sm: 4 },
            width: { xs: "100%", md: "60%" },
            height: { xs: "auto", md: "100%" },
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography variant="h5">Today's Attendance</Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date().toLocaleDateString()}
            </Typography>
          </Box>

          {lastRefreshed && (
            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
              Last updated: {lastRefreshed.toLocaleTimeString()}
            </Typography>
          )}

          {todayAttendance.length === 0 ? (
            <Box
              sx={{
                my: 2,
                p: 3,
                textAlign: "center",
                backgroundColor: "info.light",
                borderRadius: 1,
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="body1">
                No attendance records for today yet.
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ flex: 1, overflow: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: "primary.main",
                        color: "white",
                      }}
                    >
                      Employee
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: "primary.main",
                        color: "white",
                      }}
                    >
                      ID
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: "primary.main",
                        color: "white",
                      }}
                    >
                      In
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: "primary.main",
                        color: "white",
                      }}
                    >
                      Out
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: "primary.main",
                        color: "white",
                      }}
                    >
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {todayAttendance.map((record) => (
                    <TableRow
                      key={record.attendance_id}
                      sx={{
                        "&:nth-of-type(odd)": {
                          backgroundColor: "action.hover",
                        },
                        "&:hover": { backgroundColor: "action.selected" },
                      }}
                    >
                      <TableCell
                        component="th"
                        scope="row"
                        sx={{
                          maxWidth: "150px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {record.display_name}
                      </TableCell>
                      <TableCell>{record.unique_id}</TableCell>
                      <TableCell>{formatTime(record.check_in)}</TableCell>
                      <TableCell>{formatTime(record.check_out)}</TableCell>
                      <TableCell>{renderStatusBadge(record.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default AttendanceScreen;
