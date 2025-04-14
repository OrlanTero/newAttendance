const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const { Server } = require("socket.io");
const http = require("http");
const os = require("os");

const Employee = require("./models/employee");
const backup = require("./utils/backup");

// Get IP address from environment or detect it automatically
const getLocalIpAddress = () => {
  // First check if provided through environment variable
  if (process.env.LOCAL_IP_ADDRESS) {
    return process.env.LOCAL_IP_ADDRESS;
  }

  // Otherwise, detect it automatically
  const interfaces = os.networkInterfaces();
  let ipAddress = "127.0.0.1"; // Default fallback

  Object.keys(interfaces).forEach((ifname) => {
    interfaces[ifname].forEach((iface) => {
      if (iface.family === "IPv4" && !iface.internal) {
        ipAddress = iface.address;
      }
    });
  });

  return ipAddress;
};

// Use the detected IP address
const IP_ADDRESS = getLocalIpAddress();
console.log(`Server using IP address: ${IP_ADDRESS}`);

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Import routes
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const employeeRoutes = require("./routes/employees");
const departmentRoutes = require("./routes/departments");
const holidayRoutes = require("./routes/holidays");
const fingerprintRoutes = require("./routes/fingerprint");
const testRoutes = require("./routes/test");
const attendanceRoutes = require("./routes/attendance");
const workScheduleRoutes = require("./routes/workSchedule");
const backupRoutes = require("./routes/backup");
const eventRoutes = require("./routes/events");

// Routes
app.use("/api/test", testRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/fingerprint", fingerprintRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/work-schedule", workScheduleRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/events", eventRoutes);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, IP_ADDRESS, () => {
  console.log(`Server running at http://${IP_ADDRESS}:${PORT}/`);
});

module.exports = { app, server };
