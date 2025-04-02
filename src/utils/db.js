const path = require("path");
const { app } = require("electron");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

// Ensure the data directory exists
const dataDir = path.join(app.getPath("userData"), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path
const dbPath = path.join(dataDir, "attendance.db");

// Initialize database connection
let db = null;

function initDatabase() {
  return new Promise((resolve, reject) => {
    try {
      // Create or open the database
      db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error("Database connection error:", err.message);
          reject(err);
          return;
        }
        console.log("Connected to the SQLite database");
      });

      // Create tables if they don't exist
      db.run(
        `
        CREATE TABLE IF NOT EXISTS users (
          user_id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          display_name TEXT NOT NULL,
          biometric_data TEXT,
          image TEXT,
          date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `,
        (err) => {
          if (err) {
            console.error("Error creating users table:", err.message);
            reject(err);
            return;
          }

          // Check if admin user exists, if not create default admin
          db.get(
            "SELECT * FROM users WHERE username = ?",
            ["Admin"],
            (err, row) => {
              if (err) {
                console.error("Error checking for admin user:", err.message);
                reject(err);
                return;
              }

              if (!row) {
                db.run(
                  `
              INSERT INTO users (username, password, display_name)
              VALUES (?, ?, ?)
            `,
                  ["Admin", "Admin", "Administrator"],
                  function (err) {
                    if (err) {
                      console.error("Error creating admin user:", err.message);
                      reject(err);
                      return;
                    }
                    console.log("Default Admin user created");
                    resolve(true);
                  }
                );
              } else {
                resolve(true);
              }
            }
          );
        }
      );

      console.log("Database initialized successfully");
      return true;
    } catch (error) {
      console.error("Database initialization error:", error);
      reject(error);
      return false;
    }
  });
}

function getDb() {
  if (!db) {
    initDatabase();
  }
  return db;
}

function closeDb() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error("Error closing database:", err.message);
          reject(err);
          return;
        }
        console.log("Database connection closed");
        db = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// User-related functions
function authenticateUser(username, password) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    console.log(`[IPC] Authenticating user: ${username}`);

    // Special handling for default admin account
    const isDefaultAdmin = username.toLowerCase() === "admin";

    db.get(
      "SELECT * FROM users WHERE LOWER(username) = LOWER(?)",
      [username],
      (err, user) => {
        if (err) {
          console.error(`[IPC] Authentication error: ${err.message}`);
          reject(err);
          return;
        }

        if (!user) {
          console.log(`[IPC] User not found: ${username}`);
          resolve({ success: false, message: "User not found" });
          return;
        }

        console.log(`[IPC] User found: ${user.username}, checking password`);
        console.log(
          `[IPC] Expected password: ${user.password}, Provided password: ${password}`
        );

        // Compare passwords with exact match (case-sensitive)
        // Special case for admin account for backward compatibility
        const passwordMatches = isDefaultAdmin
          ? user.password.toLowerCase() === password.toLowerCase()
          : user.password === password;

        if (passwordMatches) {
          // Don't return the password in the response
          const { password, ...userWithoutPassword } = user;
          console.log(
            `[IPC] Authentication successful for user: ${user.username}`
          );
          resolve({
            success: true,
            message: "Authentication successful",
            user: userWithoutPassword,
          });
        } else {
          console.log(`[IPC] Invalid password for user: ${user.username}`);
          resolve({ success: false, message: "Invalid password" });
        }
      }
    );
  });
}

function getAllUsers() {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.all(
      "SELECT user_id, username, display_name, image, date_created FROM users",
      [],
      (err, rows) => {
        if (err) {
          console.error("Error getting users:", err.message);
          reject(err);
          return;
        }
        resolve(rows);
      }
    );
  });
}

module.exports = {
  initDatabase,
  getDb,
  closeDb,
  authenticateUser,
  getAllUsers,
};
