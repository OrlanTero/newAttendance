// Script to create default users if they don't exist
const database = require("./database");

console.log("Starting user creation script...");

// Connect to database directly to make schema changes
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./data/attendance.db", (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
    process.exit(1);
  }
  console.log("Connected to the SQLite database");

  // First check if role column exists
  db.all("PRAGMA table_info(users)", [], (err, columns) => {
    if (err) {
      console.error("Error checking table schema:", err.message);
      process.exit(1);
    }

    console.log("Table schema:", columns);

    // Check if role column exists
    const hasRoleColumn = columns.some((col) => col.name === "role");

    if (!hasRoleColumn) {
      console.log("Adding role column to users table...");

      // Add role column
      db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'", (err) => {
        if (err) {
          console.error("Error adding role column:", err.message);
          process.exit(1);
        }

        console.log("Role column added successfully");
        createDefaultUsers();
      });
    } else {
      console.log("Role column already exists");
      createDefaultUsers();
    }
  });
});

// Function to create default users
function createDefaultUsers() {
  console.log("Creating default users...");

  // Create Admin user if not exists
  db.get(
    "SELECT * FROM users WHERE LOWER(username) = LOWER(?)",
    ["Admin"],
    (err, row) => {
      if (err) {
        console.error("Error checking for Admin user:", err.message);
        process.exit(1);
      }

      if (!row) {
        console.log("Admin user not found, creating...");
        db.run(
          "INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)",
          ["Admin", "Admin", "Administrator", "admin"],
          function (err) {
            if (err) {
              console.error("Error creating Admin user:", err.message);
            } else {
              console.log("Admin user created successfully");
            }
            createCaptainUser();
          }
        );
      } else {
        console.log("Admin user already exists");
        // Update Admin with role if it doesn't have one
        if (!row.role) {
          db.run(
            "UPDATE users SET role = 'admin' WHERE LOWER(username) = LOWER(?)",
            ["Admin"],
            function (err) {
              if (err) {
                console.error("Error updating Admin role:", err.message);
              } else {
                console.log("Admin user role updated");
              }
              createCaptainUser();
            }
          );
        } else {
          createCaptainUser();
        }
      }
    }
  );
}

// Function to create Captain user
function createCaptainUser() {
  console.log("Checking for Captain user...");

  db.get(
    "SELECT * FROM users WHERE LOWER(username) = LOWER(?)",
    ["Captain"],
    (err, row) => {
      if (err) {
        console.error("Error checking for Captain user:", err.message);
        process.exit(1);
      }

      if (!row) {
        console.log("Captain user not found, creating...");
        db.run(
          "INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)",
          ["Captain", "Captain", "Captain", "captain"],
          function (err) {
            if (err) {
              console.error("Error creating Captain user:", err.message);
            } else {
              console.log("Captain user created successfully");
            }
            createSecretaryUser();
          }
        );
      } else {
        console.log("Captain user already exists");
        createSecretaryUser();
      }
    }
  );
}

// Function to create Secretary user
function createSecretaryUser() {
  console.log("Checking for Secretary user...");

  db.get(
    "SELECT * FROM users WHERE LOWER(username) = LOWER(?)",
    ["Secretary"],
    (err, row) => {
      if (err) {
        console.error("Error checking for Secretary user:", err.message);
        process.exit(1);
      }

      if (!row) {
        console.log("Secretary user not found, creating...");
        db.run(
          "INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)",
          ["Secretary", "Secretary", "Secretary", "secretary"],
          function (err) {
            if (err) {
              console.error("Error creating Secretary user:", err.message);
            } else {
              console.log("Secretary user created successfully");
            }
            finishScript();
          }
        );
      } else {
        console.log("Secretary user already exists");
        finishScript();
      }
    }
  );
}

// Function to finish script
function finishScript() {
  console.log("Listing all users:");
  db.all(
    "SELECT user_id, username, display_name, role FROM users",
    [],
    (err, rows) => {
      if (err) {
        console.error("Error getting users:", err.message);
      } else {
        console.log("Users in database:");
        rows.forEach((row) => {
          console.log(
            ` - ID: ${row.user_id}, Username: ${row.username}, Display Name: ${
              row.display_name
            }, Role: ${row.role || "none"}`
          );
        });
      }

      // Close database
      db.close((err) => {
        if (err) {
          console.error("Error closing database:", err.message);
        } else {
          console.log("Database connection closed");
        }
        console.log("Script completed");
        process.exit(0);
      });
    }
  );
}
