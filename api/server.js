const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const { Server } = require("socket.io");
const http = require("http");
const os = require("os");

const Employee = require("./models/employee");
const backup = require("./utils/backup");
const database = require("./database");

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

// // Initialize Express app
// const app = express();
// const server = http.createServer(app);

// // Middleware
// app.use(cors());
// app.use(bodyParser.json({ limit: "50mb" }));
// app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Initialize express app
const app = express();
const socketApp = express();
const server = http.createServer(socketApp);
const socketAppClient = express();
const serverClient = http.createServer(socketAppClient);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const ioClient = new Server(serverClient, {
  cors: {
    origin: "*",
  },
});

const PORT = process.env.PORT || 3000;
const SOCKET_PORT = process.env.SOCKET_PORT || 3005;
const SOCKET_PORT_CLIENT = 3006;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files (for uploads)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

// Serve static files from the uploads directory
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

// Handle Socket.IO Connections
[io, ioClient].forEach((io) => {
  io.on("connection", (socket) => {
    console.log("Fingerprint Scanner connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });

    socket.on("BIOMETRIC_CONNECTED", (data) => {
      socket.broadcast.emit("BIOMETRIC_CONNECTED", {
        message: data,
        initiatorId: socket.id,
      });

      socket.on("disconnect", (data) => {
        socket.broadcast.emit("BIOMETRIC_DISCONNECTED", {
          message: data,
          initiatorId: socket.id,
        });
      });
    });

    socket.on("FINGERPRINT_CAPTURE", (data) => {
      socket.broadcast.emit("FINGERPRINT_CAPTURE", {
        message: data,
        initiatorId: socket.id,
      });
    });

    socket.on("VERIFY", (data) => {
      Employee.getAll().then((employees) => {
        socket.broadcast.emit("VERIFY_TEMPLATE", {
          templates: { data: employees, success: true },
          fingerprint: data,
        });
      });
    });

    socket.on("VERIFY_RESULT", (data) => {
      socket.broadcast.emit("VERIFY_RESULT", {
        result: data,
        initiatorId: socket.id,
      });
    });

    socket.on("START", () => {
      // Broadcast to all sockets except the sender
      socket.broadcast.emit("START", {
        message: "Scanner started by another client",
        initiatorId: socket.id,
      });
    });
  });
});

// Start server
if (require.main === module) {
  // Initialize the database before starting the server
  database
    .initDatabase()
    .then(() => {
      // Make sure Admin has admin role
      return database.forceUpdateAdminRole();
    })
    .then(() => {
      // Update user table schema with any missing columns
      return database.updateUserTableSchema();
    })
    .then(() => {
      console.log("Database initialized successfully");

      // Start the server
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });

      server.listen(SOCKET_PORT, () => {
        console.log(`Socket server running on port ${SOCKET_PORT}`);
      });

      serverClient.listen(SOCKET_PORT_CLIENT, () => {
        console.log(
          `Socket server client running on port ${SOCKET_PORT_CLIENT}`
        );
      });
    })
    .catch((err) => {
      console.error("Database initialization failed:", err);
    });
}

module.exports = { app, server, serverClient, io, ioClient };
