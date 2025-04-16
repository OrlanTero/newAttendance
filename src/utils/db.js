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
          role TEXT DEFAULT 'user',
          date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `,
        (err) => {
          if (err) {
            console.error("Error creating users table:", err.message);
            reject(err);
            return;
          }

          // Check if 'role' column exists in users table, add it if it doesn't
          db.all("PRAGMA table_info(users)", [], (err, rows) => {
            if (err) {
              console.error("Error getting table info:", err.message);
              // Even if we can't check, continue with initialization
              console.log("Continuing initialization despite PRAGMA error");
              continueInitialization();
              return;
            }

            // Check if the query returned any column info
            let hasRoleColumn = false;
            if (Array.isArray(rows)) {
              // If it returned an array, check if any column is named 'role'
              hasRoleColumn = rows.some((row) => row.name === "role");
              console.log("Found column info (array):", rows.length, "columns");
              console.log("Has role column:", hasRoleColumn);
            } else if (rows && typeof rows === "object") {
              // If it returned a single object, check if it has a 'name' property equal to 'role'
              hasRoleColumn = rows.name === "role";
              console.log("Found column info (object)");
              console.log("Has role column:", hasRoleColumn);
            } else {
              console.log("Unexpected result from PRAGMA query:", rows);
              // Safer to assume role column doesn't exist and try to add it
              hasRoleColumn = false;
            }

            // If no role column, add it
            if (!hasRoleColumn) {
              console.log("Adding 'role' column to users table");
              db.run(
                "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'",
                (err) => {
                  if (err) {
                    console.error("Error adding role column:", err.message);
                    // Continue even if this fails, as it might be that the column already exists
                    console.log("Continuing despite error adding role column");
                  } else {
                    console.log("Added 'role' column to users table");
                  }

                  // Continue with the rest of the initialization
                  continueInitialization();
                }
              );
            } else {
              // Role column exists, continue initialization
              continueInitialization();
            }
          });

          // Function to continue with the rest of the initialization
          function continueInitialization() {
            // Create events table
            db.run(
              `
              CREATE TABLE IF NOT EXISTS events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                location TEXT,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(user_id)
              )
            `,
              (err) => {
                if (err) {
                  console.error("Error creating events table:", err.message);
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
                      db.run(
                        `
                    INSERT INTO users (username, password, display_name, role)
                    VALUES (?, ?, ?, ?)
                  `,
                        ["Admin", "Admin", "Administrator", "admin"],
                        function (err) {
                          if (err) {
                            console.error(
                              "Error creating admin user:",
                              err.message
                            );
                            reject(err);
                            return;
                          }
                          console.log("Default Admin user created");

                          // Create default Captain user
                          db.run(
                            `
                      INSERT INTO users (username, password, display_name, role)
                      VALUES (?, ?, ?, ?)
                    `,
                            ["Captain", "Captain", "Captain", "captain"],
                            function (err) {
                              if (err) {
                                console.error(
                                  "Error creating captain user:",
                                  err.message
                                );
                                reject(err);
                                return;
                              }
                              console.log("Default Captain user created");

                              // Create default Secretary user
                              db.run(
                                `
                          INSERT INTO users (username, password, display_name, role)
                          VALUES (?, ?, ?, ?)
                        `,
                                [
                                  "Secretary",
                                  "Secretary",
                                  "Secretary",
                                  "secretary",
                                ],
                                function (err) {
                                  if (err) {
                                    console.error(
                                      "Error creating secretary user:",
                                      err.message
                                    );
                                    reject(err);
                                    return;
                                  }
                                  console.log("Default Secretary user created");
                                  resolve(true);
                                }
                              );
                            }
                          );
                        }
                      );
                    } else {
                      // Check if existing Admin has role field, update if not
                      if (!row.role) {
                        // First check if role column exists to avoid error
                        db.all(
                          "PRAGMA table_info(users)",
                          [],
                          (err, columnInfo) => {
                            if (err) {
                              console.error(
                                "Error getting column info:",
                                err.message
                              );
                              // Don't reject, just log and continue
                              console.log(
                                "Skipping role update due to PRAGMA error"
                              );
                              resolve(true);
                              return;
                            }

                            // If role column exists now, update the admin user
                            let hasRoleColumn = false;
                            if (Array.isArray(columnInfo)) {
                              hasRoleColumn = columnInfo.some(
                                (col) => col.name === "role"
                              );
                              console.log(
                                "Column check result (array):",
                                columnInfo.length,
                                "columns"
                              );
                            } else if (
                              columnInfo &&
                              typeof columnInfo === "object"
                            ) {
                              hasRoleColumn = columnInfo.name === "role";
                              console.log("Column check result (object)");
                            } else {
                              console.log(
                                "Unexpected PRAGMA result format:",
                                columnInfo
                              );
                              hasRoleColumn = false;
                            }

                            console.log(
                              "Has role column (for update):",
                              hasRoleColumn
                            );

                            if (hasRoleColumn) {
                              db.run(
                                "UPDATE users SET role = 'admin' WHERE username = 'Admin'",
                                function (err) {
                                  if (err) {
                                    console.error(
                                      "Error updating admin role:",
                                      err.message
                                    );
                                    reject(err);
                                    return;
                                  }
                                  console.log("Updated Admin user with role");
                                  resolve(true);
                                }
                              );
                            } else {
                              console.log(
                                "Role column still not available, skipping update"
                              );
                              resolve(true);
                            }
                          }
                        );
                      } else {
                        resolve(true);
                      }
                    }
                  }
                );
              }
            );
          }
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
            `[IPC] Authentication successful for user: ${
              user.username
            } with role: ${user.role || "admin"}`
          );

          // If the user doesn't have a role (for backward compatibility), assume admin for default Admin user
          if (!userWithoutPassword.role && isDefaultAdmin) {
            userWithoutPassword.role = "admin";
          }

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

// Event-related functions
function getAllEvents() {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.all(
      `SELECT e.*, u.display_name as creator_name 
       FROM events e 
       LEFT JOIN users u ON e.created_by = u.user_id 
       ORDER BY e.start_date ASC`,
      [],
      (err, rows) => {
        if (err) {
          console.error("Error getting events:", err.message);
          reject(err);
          return;
        }
        resolve(rows);
      }
    );
  });
}

function getUpcomingEvents(limit = 5) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const today = new Date().toISOString();

    db.all(
      `SELECT e.*, u.display_name as creator_name 
       FROM events e 
       LEFT JOIN users u ON e.created_by = u.user_id 
       WHERE e.start_date >= ? 
       ORDER BY e.start_date ASC 
       LIMIT ?`,
      [today, limit],
      (err, rows) => {
        if (err) {
          console.error("Error getting upcoming events:", err.message);
          reject(err);
          return;
        }
        resolve(rows);
      }
    );
  });
}

function getEvent(eventId) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.get(
      `SELECT e.*, u.display_name as creator_name 
       FROM events e 
       LEFT JOIN users u ON e.created_by = u.user_id 
       WHERE e.event_id = ?`,
      [eventId],
      (err, row) => {
        if (err) {
          console.error("Error getting event:", err.message);
          reject(err);
          return;
        }
        resolve(row);
      }
    );
  });
}

function createEvent(eventData) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const { title, description, location, start_date, end_date, created_by } =
      eventData;

    db.run(
      `INSERT INTO events (title, description, location, start_date, end_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description, location, start_date, end_date, created_by],
      function (err) {
        if (err) {
          console.error("Error creating event:", err.message);
          reject(err);
          return;
        }

        // Return the created event with its ID
        getEvent(this.lastID)
          .then((event) => resolve(event))
          .catch((err) => reject(err));
      }
    );
  });
}

function updateEvent(eventId, eventData) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const { title, description, location, start_date, end_date } = eventData;
    const updated_at = new Date().toISOString();

    db.run(
      `UPDATE events 
       SET title = ?, description = ?, location = ?, start_date = ?, end_date = ?, updated_at = ? 
       WHERE event_id = ?`,
      [title, description, location, start_date, end_date, updated_at, eventId],
      function (err) {
        if (err) {
          console.error("Error updating event:", err.message);
          reject(err);
          return;
        }

        if (this.changes === 0) {
          reject(new Error("Event not found"));
          return;
        }

        // Return the updated event
        getEvent(eventId)
          .then((event) => resolve(event))
          .catch((err) => reject(err));
      }
    );
  });
}

function deleteEvent(eventId) {
  return new Promise((resolve, reject) => {
    const db = getDb();

    db.run(`DELETE FROM events WHERE event_id = ?`, [eventId], function (err) {
      if (err) {
        console.error("Error deleting event:", err.message);
        reject(err);
        return;
      }

      if (this.changes === 0) {
        reject(new Error("Event not found"));
        return;
      }

      resolve({ success: true, message: "Event deleted successfully" });
    });
  });
}

module.exports = {
  initDatabase,
  getDb,
  closeDb,
  authenticateUser,
  getAllUsers,
  getAllEvents,
  getUpcomingEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
};
