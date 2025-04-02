const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

// Ensure the data directory exists
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path
const dbPath = path.join(dataDir, "attendance.db");

// Initialize database connection
let db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to the SQLite database");
  }
});

// Create tables if they don't exist
function initDatabase() {
  return new Promise((resolve, reject) => {
    // Users table
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

        // Create Employees table
        db.run(
          `
        CREATE TABLE IF NOT EXISTS employees (
          employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
          department_id INTEGER,
          unique_id TEXT UNIQUE NOT NULL,
          lastname TEXT NOT NULL,
          firstname TEXT NOT NULL,
          middlename TEXT,
          display_name TEXT NOT NULL,
          age INTEGER,
          gender TEXT,
          biometric_data TEXT,
          image BLOB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `,
          (err) => {
            if (err) {
              console.error("Error creating employees table:", err.message);
              reject(err);
              return;
            }

            // Create Departments table
            db.run(
              `
              CREATE TABLE IF NOT EXISTS departments (
                department_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                department_head TEXT NOT NULL,
                date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `,
              (err) => {
                if (err) {
                  console.error(
                    "Error creating departments table:",
                    err.message
                  );
                  reject(err);
                  return;
                }

                // Create Holidays table
                db.run(
                  `
                  CREATE TABLE IF NOT EXISTS holidays (
                    holiday_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    date TEXT NOT NULL,
                    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                  )
                `,
                  (err) => {
                    if (err) {
                      console.error(
                        "Error creating holidays table:",
                        err.message
                      );
                      reject(err);
                      return;
                    }

                    // Create Attendance table
                    db.run(
                      `
                      CREATE TABLE IF NOT EXISTS attendance (
                        attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        employee_id INTEGER NOT NULL,
                        date TEXT NOT NULL,
                        check_in TIMESTAMP,
                        check_out TIMESTAMP,
                        status TEXT NOT NULL, 
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
                      )
                    `,
                      (err) => {
                        if (err) {
                          console.error(
                            "Error creating attendance table:",
                            err.message
                          );
                          reject(err);
                          return;
                        }

                        // Create work schedule table
                        db.run(
                          `
                          CREATE TABLE IF NOT EXISTS work_schedule (
                            schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
                            employee_id INTEGER NOT NULL,
                            monday BOOLEAN DEFAULT 1,
                            tuesday BOOLEAN DEFAULT 1,
                            wednesday BOOLEAN DEFAULT 1,
                            thursday BOOLEAN DEFAULT 1,
                            friday BOOLEAN DEFAULT 1,
                            saturday BOOLEAN DEFAULT 0,
                            sunday BOOLEAN DEFAULT 0,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
                          )
                          `,
                          (err) => {
                            if (err) {
                              console.error(
                                "Error creating work schedule table:",
                                err.message
                              );
                              reject(err);
                              return;
                            }

                            // Check if admin user exists, if not create default admin
                            db.get(
                              "SELECT * FROM users WHERE username = ?",
                              ["Admin"],
                              (err, row) => {
                                if (err) {
                                  console.error(
                                    "Error checking for admin user:",
                                    err.message
                                  );
                                  reject(err);
                                  return;
                                }

                                if (!row) {
                                  // Create new admin if it doesn't exist
                                  console.log("Admin user does not exist. Creating default Admin account...");
                                  db.run(
                                    `
                                    INSERT INTO users (username, password, display_name)
                                    VALUES (?, ?, ?)
                                  `,
                                    ["Admin", "Admin", "Administrator"],
                                    function (err) {
                                      if (err) {
                                        console.error(
                                          "Error creating admin user:",
                                          err.message
                                        );
                                        reject(err);
                                        return;
                                      }
                                      console.log("Default Admin user created with password 'Admin'");
                                      resolve(true);
                                    }
                                  );
                                } else {
                                  // If Admin exists but has wrong password, update it
                                  if (row.password !== "Admin") {
                                    console.log("Admin user exists but has incorrect password. Updating to 'Admin'...");
                                    db.run(
                                      `UPDATE users SET password = 'Admin' WHERE username = 'Admin'`,
                                      function(err) {
                                        if (err) {
                                          console.error("Error updating admin password:", err.message);
                                          reject(err);
                                          return;
                                        }
                                        console.log("Admin password updated to 'Admin'");
                                        resolve(true);
                                      }
                                    );
                                  } else {
                                    console.log("Admin user exists with correct password");
                                    resolve(true);
                                  }
                                }
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
}

// Initialize the database
initDatabase().catch((err) => {
  console.error("Database initialization failed:", err);
});

// Helper functions for database operations
const dbMethods = {
  // Get all users
  getAllUsers: () => {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT user_id, username, display_name, image, date_created FROM users",
        [],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows);
        }
      );
    });
  },

  // Get user by ID
  getUserById: (userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT user_id, username, display_name, image, date_created FROM users WHERE user_id = ?",
        [userId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row);
        }
      );
    });
  },

  // Get user by username
  getUserByUsername: (username) => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row);
        }
      );
    });
  },

  // Create a new user
  createUser: (userData) => {
    const {
      username,
      password,
      display_name,
      biometric_data = null,
      image = null,
    } = userData;

    return new Promise((resolve, reject) => {
      db.run(
        `
        INSERT INTO users (username, password, display_name, biometric_data, image)
        VALUES (?, ?, ?, ?, ?)
      `,
        [username, password, display_name, biometric_data, image],
        function (err) {
          if (err) {
            if (err.message.includes("UNIQUE constraint failed")) {
              resolve({ success: false, message: "Username already exists" });
            } else {
              reject(err);
            }
            return;
          }

          resolve({
            success: true,
            user_id: this.lastID,
            message: "User created successfully",
          });
        }
      );
    });
  },

  // Update user
  updateUser: (userId, userData) => {
    const { display_name, biometric_data, image } = userData;

    return new Promise((resolve, reject) => {
      db.run(
        `
        UPDATE users 
        SET display_name = ?, biometric_data = ?, image = ?
        WHERE user_id = ?
      `,
        [display_name, biometric_data, image, userId],
        function (err) {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            success: this.changes > 0,
            message:
              this.changes > 0
                ? "User updated successfully"
                : "No changes made or user not found",
          });
        }
      );
    });
  },

  // Update user password
  updateUserPassword: (userId, newPassword) => {
    return new Promise((resolve, reject) => {
      db.run(
        `
        UPDATE users 
        SET password = ?
        WHERE user_id = ?
      `,
        [newPassword, userId],
        function (err) {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            success: this.changes > 0,
            message:
              this.changes > 0
                ? "Password updated successfully"
                : "User not found",
          });
        }
      );
    });
  },

  // Delete user
  deleteUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM users WHERE user_id = ?", [userId], function (err) {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          success: this.changes > 0,
          message:
            this.changes > 0 ? "User deleted successfully" : "User not found",
        });
      });
    });
  },

  // Authenticate user
  authenticateUser: (username, password) => {
    return new Promise((resolve, reject) => {
      console.log(`Authenticating user: ${username}`);

      // Special handling for default admin account
      const isDefaultAdmin = username.toLowerCase() === "admin";

      // For Admin user, use exact case for query but case-insensitive comparison for password
      const userQuery = isDefaultAdmin
        ? "SELECT * FROM users WHERE username = 'Admin'"
        : "SELECT * FROM users WHERE LOWER(username) = LOWER(?)";
      const queryParams = isDefaultAdmin ? [] : [username];

      console.log(`Running query: ${userQuery} with params: ${queryParams}`);

      // Query to find user, case-insensitive for username
      db.get(userQuery, queryParams, (err, user) => {
        if (err) {
          console.error(`Authentication error: ${err.message}`);
          reject(err);
          return;
        }

        if (!user) {
          console.log(`User not found: ${username}`);
          resolve({ success: false, message: "User not found" });
          return;
        }

        console.log(`User found: ${user.username}, checking password`);
        console.log(
          `Expected password: ${user.password}, Provided password: ${password}`
        );

        // Compare passwords with exact match (case-sensitive)
        // Special case for admin account for backward compatibility
        let passwordMatches = false;

        if (isDefaultAdmin) {
          // For Admin, always match if either "Admin" or "admin" is provided as password
          passwordMatches =
            password === "Admin" || password.toLowerCase() === "admin";
          console.log(
            `Admin user login - Password match result: ${passwordMatches}`
          );
        } else {
          // Regular users need exact password match
          passwordMatches = user.password === password;
        }

        if (passwordMatches) {
          // Don't return the password in the response
          const { password, ...userWithoutPassword } = user;
          console.log(`Authentication successful for user: ${user.username}`);
          resolve({
            success: true,
            message: "Authentication successful",
            user: userWithoutPassword,
          });
        } else {
          console.log(`Invalid password for user: ${user.username}`);
          resolve({ success: false, message: "Invalid password" });
        }
      });
    });
  },

  // Close database connection
  closeDatabase: () => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          console.error("Error closing database:", err.message);
          reject(err);
          return;
        }
        console.log("Database connection closed");
        resolve();
      });
    });
  },

  // Export all other methods here
  // ... rest of the methods from the original file
};

// Export all database methods
module.exports = {
  initDatabase,
  db,
  getAllUsers: dbMethods.getAllUsers,
  getUserById: dbMethods.getUserById,
  getUserByUsername: dbMethods.getUserByUsername,
  createUser: dbMethods.createUser,
  updateUser: dbMethods.updateUser,
  updateUserPassword: dbMethods.updateUserPassword,
  deleteUser: dbMethods.deleteUser,
  authenticateUser: dbMethods.authenticateUser,
  closeDatabase: dbMethods.closeDatabase,
  
  // Add all other methods as needed
};