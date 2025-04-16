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
        email TEXT,
        phone TEXT,
        address TEXT,
        position TEXT,
        bio TEXT,
        biometric_data TEXT,
        image TEXT,
        role TEXT,
        date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
                                  console.log(
                                    "Admin user does not exist. Creating default Admin account..."
                                  );
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
                                      console.log(
                                        "Default Admin user created with password 'Admin'"
                                      );
                                      resolve(true);
                                    }
                                  );
                                } else {
                                  // If Admin exists but has wrong password, update it
                                  if (row.password !== "Admin") {
                                    console.log(
                                      "Admin user exists but has incorrect password. Updating to 'Admin'..."
                                    );
                                    db.run(
                                      `UPDATE users SET password = 'Admin' WHERE username = 'Admin'`,
                                      function (err) {
                                        if (err) {
                                          console.error(
                                            "Error updating admin password:",
                                            err.message
                                          );
                                          reject(err);
                                          return;
                                        }
                                        console.log(
                                          "Admin password updated to 'Admin'"
                                        );
                                        resolve(true);
                                      }
                                    );
                                  } else {
                                    console.log(
                                      "Admin user exists with correct password"
                                    );
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

    // Create Events table
    try {
      db.run(`
        CREATE TABLE IF NOT EXISTS events (
          event_id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          start_date TEXT NOT NULL,
          end_date TEXT,
          location TEXT,
          type TEXT DEFAULT 'general',
          created_at TEXT,
          updated_at TEXT
        )
      `);
      console.log("Events table created or already exists");
    } catch (err) {
      console.error("Error creating events table:", err.message);
    }
  });
}

// Initialize the database
initDatabase()
  .then(() => {
    console.log("Database initialized successfully");
    // Update user table schema to add missing columns
    console.log(
      "Running schema update to add any missing columns to the users table..."
    );
    return updateUserTableSchema();
  })
  .then(() => {
    console.log("User table schema update completed");
    // Now that the schema is updated, ensure default users exist
    return ensureDefaultUsers();
  })
  .then(() => {
    console.log("Default users check completed");
    console.log("Database setup complete!");
  })
  .then(() => {
    // Force an immediate update to the Admin user's role
    forceUpdateAdminRole();
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
  });

// Helper functions for database operations
const dbMethods = {
  // Get all users
  getAllUsers: () => {
    return new Promise((resolve, reject) => {
      // Check if updated_at column exists first
      db.all("PRAGMA table_info(users)", [], (err, columns) => {
        if (err) {
          reject(err);
          return;
        }

        // Determine if updated_at column exists
        const hasUpdatedAt =
          columns && columns.some((col) => col.name === "updated_at");

        // Build query based on available columns
        const query = `SELECT user_id, username, display_name, email, phone, address, position, bio, image, role, date_created${
          hasUpdatedAt ? ", updated_at" : ""
        } FROM users`;

        db.all(query, [], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows);
        });
      });
    });
  },

  // Get user by ID
  getUserById: (userId) => {
    return new Promise((resolve, reject) => {
      // Check if updated_at column exists first
      db.all("PRAGMA table_info(users)", [], (err, columns) => {
        if (err) {
          reject(err);
          return;
        }

        // Determine if updated_at column exists
        const hasUpdatedAt =
          columns && columns.some((col) => col.name === "updated_at");

        // Build query based on available columns
        const query = `SELECT user_id, username, display_name, email, phone, address, position, bio, image, role, date_created${
          hasUpdatedAt ? ", updated_at" : ""
        } FROM users WHERE user_id = ?`;

        db.get(query, [userId], (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row);
        });
      });
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
      email = null,
      phone = null,
      address = null,
      position = null,
      bio = null,
      biometric_data = null,
      image = null,
      role = null,
    } = userData;

    return new Promise((resolve, reject) => {
      // First check if updated_at column exists
      db.all("PRAGMA table_info(users)", [], (err, columns) => {
        if (err) {
          reject(err);
          return;
        }

        // Determine if updated_at column exists
        const hasUpdatedAt =
          columns && columns.some((col) => col.name === "updated_at");
        const now = new Date().toISOString();

        // Build SQL query based on column existence
        let sql, params;

        if (hasUpdatedAt) {
          sql = `
            INSERT INTO users (
              username, password, display_name, email, phone, address, position, bio, 
              biometric_data, image, role, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          params = [
            username,
            password,
            display_name,
            email,
            phone,
            address,
            position,
            bio,
            biometric_data,
            image,
            role,
            now,
          ];
        } else {
          sql = `
            INSERT INTO users (
              username, password, display_name, email, phone, address, position, bio, 
              biometric_data, image, role
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          params = [
            username,
            password,
            display_name,
            email,
            phone,
            address,
            position,
            bio,
            biometric_data,
            image,
            role,
          ];
        }

        db.run(sql, params, function (err) {
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
        });
      });
    });
  },

  // Update user
  updateUser: (userId, userData) => {
    const {
      display_name,
      email = "",
      phone = "",
      address = "",
      position = "",
      bio = "",
      biometric_data,
      image,
    } = userData;

    return new Promise((resolve, reject) => {
      // First get the existing user to determine if it's the Admin
      db.get(
        "SELECT username, role FROM users WHERE user_id = ?",
        [userId],
        (roleErr, existingUser) => {
          if (roleErr) {
            reject(roleErr);
            return;
          }

          // If user doesn't exist, return error
          if (!existingUser) {
            resolve({
              success: false,
              message: "User not found",
            });
            return;
          }

          // Check if this is the Admin user - if so, always set role to "admin"
          const isAdmin =
            existingUser.username === "Admin" ||
            existingUser.username.toLowerCase() === "admin";
          const role = isAdmin ? "admin" : existingUser.role || "user";

          console.log(
            `Updating user ${userId} (${existingUser.username}), isAdmin=${isAdmin}, role=${role}`
          );

          // Print the values being saved
          console.log(
            `Saving user data: display_name=${display_name}, email=${email}, phone=${phone}, address=${address}, position=${position}, bio=${bio}, role=${role}`
          );

          // Get current timestamp for updated_at
          const now = new Date().toISOString();

          // Execute the update query with all fields
          const query = `
            UPDATE users 
            SET display_name = ?, email = ?, phone = ?, address = ?, position = ?, bio = ?,
                biometric_data = ?, image = ?, role = ?, updated_at = ?
            WHERE user_id = ?
          `;

          const params = [
            display_name,
            email, // Empty string instead of null
            phone, // Empty string instead of null
            address, // Empty string instead of null
            position, // Empty string instead of null
            bio, // Empty string instead of null
            biometric_data,
            image,
            role,
            now,
            userId,
          ];

          db.run(query, params, function (err) {
            if (err) {
              console.error("Error updating user:", err.message);
              reject(err);
              return;
            }

            if (this.changes === 0) {
              resolve({
                success: false,
                message: "No changes made or user not found",
              });
              return;
            }

            // Fetch the updated user to return
            db.get(
              "SELECT * FROM users WHERE user_id = ?",
              [userId],
              (err, updatedUser) => {
                if (err) {
                  reject(err);
                  return;
                }

                if (!updatedUser) {
                  resolve({
                    success: false,
                    message: "Failed to retrieve updated user details",
                  });
                  return;
                }

                // Remove sensitive information before sending the user data
                const userWithoutPassword = { ...updatedUser };
                delete userWithoutPassword.password;

                // Convert null values to empty strings for consistency
                if (userWithoutPassword.email === null)
                  userWithoutPassword.email = "";
                if (userWithoutPassword.phone === null)
                  userWithoutPassword.phone = "";
                if (userWithoutPassword.address === null)
                  userWithoutPassword.address = "";
                if (userWithoutPassword.position === null)
                  userWithoutPassword.position = "";
                if (userWithoutPassword.bio === null)
                  userWithoutPassword.bio = "";

                resolve({
                  success: true,
                  message: "User updated successfully",
                  user: userWithoutPassword,
                });
              }
            );
          });
        }
      );
    });
  },

  // Update user password
  updateUserPassword: (userId, newPassword) => {
    return new Promise((resolve, reject) => {
      // First check if updated_at column exists
      db.all("PRAGMA table_info(users)", [], (err, columns) => {
        if (err) {
          reject(err);
          return;
        }

        // Determine if updated_at column exists
        const hasUpdatedAt =
          columns && columns.some((col) => col.name === "updated_at");
        const now = new Date().toISOString();

        // Build the query based on whether updated_at exists
        let query, params;

        if (hasUpdatedAt) {
          query = `
            UPDATE users 
            SET password = ?, updated_at = ?
            WHERE user_id = ?
          `;
          params = [newPassword, now, userId];
        } else {
          query = `
        UPDATE users 
        SET password = ?
        WHERE user_id = ?
          `;
          params = [newPassword, userId];
        }

        db.run(query, params, function (err) {
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
        });
      });
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

          // Ensure Admin user always has admin role
          if (isDefaultAdmin) {
            // Always override with admin role for Admin user
            userWithoutPassword.role = "admin";
            console.log(`Setting admin role for Admin user login`);

            // Also update the database if needed
            if (!user.role || user.role !== "admin") {
              db.run(
                "UPDATE users SET role = 'admin' WHERE username = 'Admin'",
                [],
                (updateErr) => {
                  if (updateErr) {
                    console.error(
                      `Error updating Admin role: ${updateErr.message}`
                    );
                  } else {
                    console.log(
                      "Updated Admin user role in database during login"
                    );
                  }
                }
              );
            }
          }

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

  // Employee methods
  getAllEmployees: () => {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM employees ORDER BY lastname ASC",
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

  getEmployeeById: (employeeId) => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM employees WHERE employee_id = ?",
        [employeeId],
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

  getEmployeeByUniqueId: (uniqueId) => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM employees WHERE unique_id = ?",
        [uniqueId],
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

  createEmployee: (employeeData) => {
    const {
      department_id,
      unique_id,
      lastname,
      firstname,
      middlename,
      display_name,
      age,
      gender,
      biometric_data,
      image,
    } = employeeData;

    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      db.run(
        `
        INSERT INTO employees (
          department_id, unique_id, lastname, firstname, middlename,
          display_name, age, gender, biometric_data, image, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          department_id,
          unique_id,
          lastname,
          firstname,
          middlename,
          display_name,
          age,
          gender,
          biometric_data,
          image,
          now,
          now,
        ],
        function (err) {
          if (err) {
            if (err.message.includes("UNIQUE constraint failed")) {
              resolve({
                success: false,
                message: "Employee ID already exists",
              });
            } else {
              reject(err);
            }
            return;
          }

          resolve({
            success: true,
            employee_id: this.lastID,
            message: "Employee created successfully",
          });
        }
      );
    });
  },

  updateEmployee: (employeeId, employeeData) => {
    const {
      department_id,
      unique_id,
      lastname,
      firstname,
      middlename,
      display_name,
      age,
      gender,
      biometric_data,
      image,
    } = employeeData;

    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      db.run(
        `
        UPDATE employees 
        SET department_id = ?, unique_id = ?, lastname = ?, firstname = ?, 
            middlename = ?, display_name = ?, age = ?, gender = ?, 
            biometric_data = ?, image = ?, updated_at = ?
        WHERE employee_id = ?
      `,
        [
          department_id,
          unique_id,
          lastname,
          firstname,
          middlename,
          display_name,
          age,
          gender,
          biometric_data,
          image,
          now,
          employeeId,
        ],
        function (err) {
          if (err) {
            if (err.message.includes("UNIQUE constraint failed")) {
              resolve({
                success: false,
                message: "Employee ID already exists",
              });
            } else {
              reject(err);
            }
            return;
          }

          resolve({
            success: this.changes > 0,
            message:
              this.changes > 0
                ? "Employee updated successfully"
                : "No changes made or employee not found",
          });
        }
      );
    });
  },

  deleteEmployee: (employeeId) => {
    return new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM employees WHERE employee_id = ?",
        [employeeId],
        function (err) {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            success: this.changes > 0,
            message:
              this.changes > 0
                ? "Employee deleted successfully"
                : "Employee not found",
          });
        }
      );
    });
  },

  searchEmployees: (searchTerm) => {
    return new Promise((resolve, reject) => {
      const searchPattern = `%${searchTerm}%`;
      db.all(
        `
        SELECT * FROM employees 
        WHERE unique_id LIKE ? 
        OR lastname LIKE ? 
        OR firstname LIKE ? 
        OR middlename LIKE ? 
        OR display_name LIKE ?
        ORDER BY lastname ASC
      `,
        [
          searchPattern,
          searchPattern,
          searchPattern,
          searchPattern,
          searchPattern,
        ],
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

  // Department methods
  getAllDepartments: (searchTerm = "") => {
    return new Promise((resolve, reject) => {
      const query = searchTerm
        ? `SELECT * FROM departments WHERE name LIKE ? OR department_head LIKE ?`
        : `SELECT * FROM departments`;
      const params = searchTerm ? [`%${searchTerm}%`, `%${searchTerm}%`] : [];

      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  },

  getDepartmentById: (departmentId) => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM departments WHERE department_id = ?",
        [departmentId],
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

  createDepartment: (departmentData) => {
    const { name, department_head } = departmentData;
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO departments (name, department_head) VALUES (?, ?)",
        [name, department_head],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({
            department_id: this.lastID,
            name,
            department_head,
            date_created: new Date().toISOString(),
          });
        }
      );
    });
  },

  updateDepartment: (departmentId, departmentData) => {
    const { name, department_head } = departmentData;
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE departments SET name = ?, department_head = ? WHERE department_id = ?",
        [name, department_head, departmentId],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({
            success: this.changes > 0,
            department_id: departmentId,
            name,
            department_head,
          });
        }
      );
    });
  },

  deleteDepartment: (departmentId) => {
    return new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM departments WHERE department_id = ?",
        [departmentId],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({
            success: this.changes > 0,
          });
        }
      );
    });
  },

  // Holiday methods
  getAllHolidays: (searchTerm = "") => {
    return new Promise((resolve, reject) => {
      const query = searchTerm
        ? `SELECT * FROM holidays WHERE name LIKE ?`
        : `SELECT * FROM holidays`;
      const params = searchTerm ? [`%${searchTerm}%`] : [];

      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  },

  getHolidayById: (holidayId) => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM holidays WHERE holiday_id = ?",
        [holidayId],
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

  createHoliday: (holidayData) => {
    const { name, date } = holidayData;
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO holidays (name, date) VALUES (?, ?)",
        [name, date],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({
            success: true,
            holiday_id: this.lastID,
            name,
            date,
            date_created: new Date().toISOString(),
          });
        }
      );
    });
  },

  updateHoliday: (holidayId, holidayData) => {
    const { name, date } = holidayData;
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE holidays SET name = ?, date = ? WHERE holiday_id = ?",
        [name, date, holidayId],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({
            success: this.changes > 0,
            holiday_id: holidayId,
            name,
            date,
          });
        }
      );
    });
  },

  deleteHoliday: (holidayId) => {
    return new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM holidays WHERE holiday_id = ?",
        [holidayId],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({
            success: this.changes > 0,
          });
        }
      );
    });
  },

  // Attendance methods
  getAllAttendance: () => {
    return new Promise((resolve, reject) => {
      db.all(
        `
        SELECT a.*, e.display_name, e.unique_id 
        FROM attendance a
        JOIN employees e ON a.employee_id = e.employee_id
        ORDER BY a.date DESC, a.check_in DESC
      `,
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

  getAttendanceById: (attendanceId) => {
    return new Promise((resolve, reject) => {
      db.get(
        `
        SELECT a.*, e.display_name, e.unique_id 
        FROM attendance a
        JOIN employees e ON a.employee_id = e.employee_id
        WHERE a.attendance_id = ?
      `,
        [attendanceId],
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

  getAttendanceByEmployeeId: (employeeId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `
        SELECT a.*, e.display_name, e.unique_id 
        FROM attendance a
        JOIN employees e ON a.employee_id = e.employee_id
        WHERE a.employee_id = ?
        ORDER BY a.date DESC, a.check_in DESC
      `,
        [employeeId],
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

  getAttendanceByDate: (date) => {
    return new Promise((resolve, reject) => {
      db.all(
        `
        SELECT a.*, e.display_name, e.unique_id 
        FROM attendance a
        JOIN employees e ON a.employee_id = e.employee_id
        WHERE a.date = ?
        ORDER BY a.check_in ASC
      `,
        [date],
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

  getAttendanceByEmployeeAndDate: (employeeId, date) => {
    return new Promise((resolve, reject) => {
      db.all(
        `
        SELECT a.*, e.display_name, e.unique_id 
        FROM attendance a
        JOIN employees e ON a.employee_id = e.employee_id
        WHERE a.employee_id = ? AND a.date = ?
        ORDER BY a.check_in ASC
      `,
        [employeeId, date],
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

  createAttendance: (attendanceData) => {
    console.log(
      "database.createAttendance called with:",
      JSON.stringify(attendanceData)
    );

    // Get parameters, allowing for either employee_id or employeeId
    const employee_id = attendanceData.employee_id || attendanceData.employeeId;
    const date = attendanceData.date;
    const check_in = attendanceData.check_in;
    const status = attendanceData.status || "present";

    if (!employee_id) {
      console.error("No employee_id or employeeId provided");
      return Promise.resolve({
        success: false,
        message: "Employee ID is required",
      });
    }

    console.log("Normalized parameters:", {
      employee_id,
      date,
      check_in,
      status,
    });

    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();

      console.log(
        "Executing SQL insert with:",
        employee_id,
        date,
        check_in || now,
        status,
        now,
        now
      );

      db.run(
        `
        INSERT INTO attendance (
          employee_id, date, check_in, status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [employee_id, date, check_in || now, status, now, now],
        function (err) {
          if (err) {
            console.error("Database error in createAttendance:", err.message);
            reject(err);
            return;
          }

          console.log("Record inserted with ID:", this.lastID);

          // Get the newly created record
          db.get(
            `
            SELECT a.*, e.display_name, e.unique_id 
            FROM attendance a
            JOIN employees e ON a.employee_id = e.employee_id
            WHERE a.attendance_id = ?
          `,
            [this.lastID],
            (err, row) => {
              if (err) {
                console.error("Error retrieving inserted record:", err.message);
                reject(err);
                return;
              }

              console.log("Retrieved inserted record:", row);

              resolve({
                success: true,
                data: row,
                message: "Attendance record created successfully",
              });
            }
          );
        }
      );
    });
  },

  updateAttendance: (attendanceId, attendanceData) => {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();

      // Build the SQL query dynamically based on provided fields
      let setClause = [];
      let params = [];

      if (attendanceData.check_out) {
        setClause.push("check_out = ?");
        params.push(attendanceData.check_out);
      }

      if (attendanceData.status) {
        setClause.push("status = ?");
        params.push(attendanceData.status);
      }

      // Always update the updated_at field
      setClause.push("updated_at = ?");
      params.push(now);

      // Add the attendanceId to the parameters
      params.push(attendanceId);

      const sql = `
        UPDATE attendance
        SET ${setClause.join(", ")}
        WHERE attendance_id = ?
      `;

      db.run(sql, params, function (err) {
        if (err) {
          reject(err);
          return;
        }

        if (this.changes === 0) {
          resolve({
            success: false,
            message: "Attendance record not found or no changes made",
          });
          return;
        }

        // Get the updated record
        db.get(
          `
          SELECT a.*, e.display_name, e.unique_id 
          FROM attendance a
          JOIN employees e ON a.employee_id = e.employee_id
          WHERE a.attendance_id = ?
        `,
          [attendanceId],
          (err, row) => {
            if (err) {
              reject(err);
              return;
            }

            resolve({
              success: true,
              data: row,
              message: "Attendance record updated successfully",
            });
          }
        );
      });
    });
  },

  deleteAttendance: (attendanceId) => {
    return new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM attendance WHERE attendance_id = ?",
        [attendanceId],
        function (err) {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            success: this.changes > 0,
            message:
              this.changes > 0
                ? "Attendance record deleted successfully"
                : "Attendance record not found",
          });
        }
      );
    });
  },

  // Work schedule methods
  getEmployeeWorkSchedule: (employeeId) => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM work_schedule WHERE employee_id = ?",
        [employeeId],
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

  createWorkSchedule: (scheduleData) => {
    const {
      employee_id,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
    } = scheduleData;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO work_schedule (
          employee_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employee_id,
          monday ? 1 : 0,
          tuesday ? 1 : 0,
          wednesday ? 1 : 0,
          thursday ? 1 : 0,
          friday ? 1 : 0,
          saturday ? 1 : 0,
          sunday ? 1 : 0,
        ],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({
            schedule_id: this.lastID,
            employee_id,
            monday,
            tuesday,
            wednesday,
            thursday,
            friday,
            saturday,
            sunday,
            created_at: new Date().toISOString(),
          });
        }
      );
    });
  },

  updateWorkSchedule: (employeeId, scheduleData) => {
    const { monday, tuesday, wednesday, thursday, friday, saturday, sunday } =
      scheduleData;

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE work_schedule 
         SET monday = ?, tuesday = ?, wednesday = ?, thursday = ?, friday = ?, 
             saturday = ?, sunday = ?, updated_at = CURRENT_TIMESTAMP
         WHERE employee_id = ?`,
        [
          monday ? 1 : 0,
          tuesday ? 1 : 0,
          wednesday ? 1 : 0,
          thursday ? 1 : 0,
          friday ? 1 : 0,
          saturday ? 1 : 0,
          sunday ? 1 : 0,
          employeeId,
        ],
        function (err) {
          if (err) {
            reject(err);
            return;
          }

          if (this.changes === 0) {
            // If no rows were updated, create a new schedule
            dbMethods
              .createWorkSchedule({
                employee_id: employeeId,
                monday,
                tuesday,
                wednesday,
                thursday,
                friday,
                saturday,
                sunday,
              })
              .then((result) => resolve(result))
              .catch((err) => reject(err));
            return;
          }

          resolve({
            success: true,
            employee_id: employeeId,
            monday,
            tuesday,
            wednesday,
            thursday,
            friday,
            saturday,
            sunday,
            updated_at: new Date().toISOString(),
          });
        }
      );
    });
  },
};

// Add a function to create the Captain user if it doesn't exist
function ensureDefaultUsers() {
  return new Promise((resolve, reject) => {
    console.log("Checking for default users...");

    // First check if Admin has correct role
    db.get(
      "SELECT * FROM users WHERE username = 'Admin'",
      [],
      (adminErr, adminRow) => {
        if (adminErr) {
          console.error("Error checking for Admin user:", adminErr.message);
          reject(adminErr);
          return;
        }

        // If Admin exists but has wrong role, update it
        if (adminRow && (!adminRow.role || adminRow.role !== "admin")) {
          console.log(
            "Admin user exists but has incorrect role. Updating to 'admin'..."
          );
          db.run(
            `UPDATE users SET role = 'admin' WHERE username = 'Admin'`,
            function (err) {
              if (err) {
                console.error("Error updating Admin role:", err.message);
                // Don't reject, continue to Captain check
                console.log("Continuing despite error updating Admin role");
              } else {
                console.log("Updated Admin user role to 'admin'");
              }

              // Continue with Captain check
              checkCaptainUser(resolve, reject);
            }
          );
        } else {
          // Admin role is correct or user doesn't exist, continue to Captain check
          checkCaptainUser(resolve, reject);
        }
      }
    );
  });
}

// Helper function to check for Captain user
function checkCaptainUser(resolve, reject) {
  // Check if Captain exists
  db.get(
    "SELECT * FROM users WHERE LOWER(username) = LOWER(?)",
    ["Captain"],
    (err, row) => {
      if (err) {
        console.error("Error checking for Captain user:", err.message);
        reject(err);
        return;
      }

      if (!row) {
        console.log("Captain user not found, creating it now...");

        // Captain doesn't exist, create it
        db.run(
          `INSERT INTO users (username, password, display_name, role) 
           VALUES (?, ?, ?, ?)`,
          ["Captain", "Captain", "Captain", "captain"],
          function (err) {
            if (err) {
              console.error("Error creating Captain user:", err.message);
              reject(err);
              return;
            }
            console.log(
              "Captain user created successfully with ID:",
              this.lastID
            );
            resolve(true);
          }
        );
      } else {
        console.log("Captain user already exists with ID:", row.user_id);
        resolve(true);
      }
    }
  );
}

// Helper function to check if a column exists in a table
function columnExists(table, column) {
  return new Promise((resolve, reject) => {
    db.get(`PRAGMA table_info(${table})`, [], (err, rows) => {
      if (err) {
        console.error(
          `Error checking for column ${column} in table ${table}:`,
          err
        );
        reject(err);
        return;
      }

      // Check if column exists in the results
      const exists = rows && rows.name === column;
      console.log(`Column ${column} in table ${table} exists: ${exists}`);
      resolve(exists);
    });
  });
}

// Function to check and update user table schema as needed
function updateUserTableSchema() {
  return new Promise((resolve, reject) => {
    console.log("Checking user table schema...");

    // Check if we need to add new columns
    db.all(`PRAGMA table_info(users)`, [], (err, columns) => {
      if (err) {
        console.error("Error checking user table schema:", err.message);
        reject(err);
        return;
      }

      const columnNames = columns.map((col) => col.name);
      console.log("Found column info (array):", columns.length, "columns");
      console.log("Has role column:", columnNames.includes("role"));
      console.log("Has updated_at column:", columnNames.includes("updated_at"));

      // Build alter table statements for missing columns
      const missingColumns = [];

      if (!columnNames.includes("email")) missingColumns.push("email TEXT");
      if (!columnNames.includes("phone")) missingColumns.push("phone TEXT");
      if (!columnNames.includes("address")) missingColumns.push("address TEXT");
      if (!columnNames.includes("position"))
        missingColumns.push("position TEXT");
      if (!columnNames.includes("bio")) missingColumns.push("bio TEXT");
      if (!columnNames.includes("role")) missingColumns.push("role TEXT");
      // Use a simple TEXT column for updated_at instead of TIMESTAMP with DEFAULT
      if (!columnNames.includes("updated_at"))
        missingColumns.push("updated_at TEXT");

      if (missingColumns.length === 0) {
        console.log("User table schema is up to date");
        resolve();
        return;
      }

      console.log("Adding missing columns to users table:", missingColumns);

      // Add each missing column one by one
      const addColumn = (index) => {
        if (index >= missingColumns.length) {
          console.log("All missing columns added successfully");
          resolve();
          return;
        }

        const column = missingColumns[index];
        const columnName = column.split(" ")[0];

        db.run(`ALTER TABLE users ADD COLUMN ${column}`, (err) => {
          if (err) {
            // If column already exists, that's fine, continue
            if (err.message.includes("duplicate column name")) {
              console.log(`Column ${columnName} already exists, skipping`);
              addColumn(index + 1);
            } else {
              console.error(`Error adding column ${columnName}:`, err.message);
              reject(err);
            }
            return;
          }

          console.log(`Added column ${columnName} to users table`);
          addColumn(index + 1);
        });
      };

      // Start adding columns
      addColumn(0);
    });
  });
}

// Force an immediate update to the Admin user's role
function forceUpdateAdminRole() {
  console.log("Forcefully updating Admin user role to 'admin'...");

  db.run(
    `UPDATE users SET role = 'admin' WHERE username = 'Admin'`,
    function (err) {
      if (err) {
        console.error("Error updating Admin role:", err.message);
      } else {
        console.log(
          `Updated Admin user role to 'admin'. Rows affected: ${this.changes}`
        );
      }
    }
  );
}

// Call this function immediately to fix any existing issues
forceUpdateAdminRole();

// Export all database methods
module.exports = {
  initDatabase,
  db,
  // User methods
  getAllUsers: dbMethods.getAllUsers,
  getUserById: dbMethods.getUserById,
  getUserByUsername: dbMethods.getUserByUsername,
  createUser: dbMethods.createUser,
  updateUser: dbMethods.updateUser,
  updateUserPassword: dbMethods.updateUserPassword,
  deleteUser: dbMethods.deleteUser,
  authenticateUser: dbMethods.authenticateUser,
  closeDatabase: dbMethods.closeDatabase,

  // Employee methods
  getAllEmployees: dbMethods.getAllEmployees,
  getEmployeeById: dbMethods.getEmployeeById,
  getEmployeeByUniqueId: dbMethods.getEmployeeByUniqueId,
  createEmployee: dbMethods.createEmployee,
  updateEmployee: dbMethods.updateEmployee,
  deleteEmployee: dbMethods.deleteEmployee,
  searchEmployees: dbMethods.searchEmployees,

  // Department methods
  getAllDepartments: dbMethods.getAllDepartments,
  getDepartmentById: dbMethods.getDepartmentById,
  createDepartment: dbMethods.createDepartment,
  updateDepartment: dbMethods.updateDepartment,
  deleteDepartment: dbMethods.deleteDepartment,

  // Holiday methods
  getAllHolidays: dbMethods.getAllHolidays,
  getHolidayById: dbMethods.getHolidayById,
  createHoliday: dbMethods.createHoliday,
  updateHoliday: dbMethods.updateHoliday,
  deleteHoliday: dbMethods.deleteHoliday,

  // Attendance methods
  getAllAttendance: dbMethods.getAllAttendance,
  getAttendanceById: dbMethods.getAttendanceById,
  getAttendanceByEmployeeId: dbMethods.getAttendanceByEmployeeId,
  getAttendanceByDate: dbMethods.getAttendanceByDate,
  getAttendanceByEmployeeAndDate: dbMethods.getAttendanceByEmployeeAndDate,
  createAttendance: dbMethods.createAttendance,
  updateAttendance: dbMethods.updateAttendance,
  deleteAttendance: dbMethods.deleteAttendance,

  // Work schedule methods
  getEmployeeWorkSchedule: dbMethods.getEmployeeWorkSchedule,
  createWorkSchedule: dbMethods.createWorkSchedule,
  updateWorkSchedule: dbMethods.updateWorkSchedule,

  // New method to ensure default users
  ensureDefaultUsers,

  // New method to update user table schema
  updateUserTableSchema,

  // Force update admin role
  forceUpdateAdminRole,

  // Export the updateUserTableSchema function
  getDb: () => db,
};
