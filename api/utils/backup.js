const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { promisify } = require("util");
const AdmZip = require("adm-zip");
const cron = require("node-cron");

// Convert fs functions to promise-based
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);
const readdir = promisify(fs.readdir);

// Database paths
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "attendance.db");

// Backup directory
const backupDir = path.join(dataDir, "backups");

// Make sure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

/**
 * Create a backup of the database
 * @param {string} backupName - Optional name for the backup
 * @returns {Promise<Object>} - Result object with success status and file path
 */
async function createBackup(backupName = "") {
  try {
    // Make sure the database exists
    if (!fs.existsSync(dbPath)) {
      throw new Error("Database file does not exist");
    }

    // Create timestamp for the backup file name
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = backupName
      ? `${backupName}_${timestamp}.zip`
      : `backup_${timestamp}.zip`;
    const backupPath = path.join(backupDir, fileName);

    // Create a temporary directory for the backup
    const tempDir = path.join(backupDir, "temp");
    if (!fs.existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Make a copy of the database file
    const tempDbPath = path.join(tempDir, "attendance.db");
    await copyFile(dbPath, tempDbPath);

    // Create a zip file with the database
    const zip = new AdmZip();
    zip.addLocalFile(tempDbPath);

    // Add metadata file with information about the backup
    const metadata = {
      date: new Date().toISOString(),
      name: backupName || "Auto Backup",
      version: "1.0",
      dbSize: fs.statSync(dbPath).size,
    };

    zip.addFile(
      "metadata.json",
      Buffer.from(JSON.stringify(metadata, null, 2))
    );
    zip.writeZip(backupPath);

    // Clean up temp directory
    fs.unlinkSync(tempDbPath);
    fs.rmdirSync(tempDir);

    console.log(`Backup created: ${backupPath}`);
    return {
      success: true,
      message: "Backup created successfully",
      path: backupPath,
      fileName,
      date: new Date().toISOString(),
      name: backupName || "Auto Backup",
      size: fs.statSync(backupPath).size,
    };
  } catch (error) {
    console.error("Error creating backup:", error);
    return {
      success: false,
      message: `Backup failed: ${error.message}`,
      error,
    };
  }
}

/**
 * Restore database from backup
 * @param {string} backupFileName - Name of the backup file to restore
 * @returns {Promise<Object>} - Result object with success status
 */
async function restoreBackup(backupFileName) {
  try {
    // Close existing database connections
    let db = new sqlite3.Database(dbPath);
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const backupPath = path.join(backupDir, backupFileName);

    // Check if backup file exists
    if (!fs.existsSync(backupPath)) {
      throw new Error("Backup file does not exist");
    }

    // Create a temporary directory for restoration
    const tempDir = path.join(backupDir, "temp_restore");
    if (!fs.existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Extract backup
    const zip = new AdmZip(backupPath);
    zip.extractAllTo(tempDir, true);

    // Check if database file exists in the extracted backup
    const extractedDbPath = path.join(tempDir, "attendance.db");
    if (!fs.existsSync(extractedDbPath)) {
      throw new Error("Invalid backup file: Database not found in backup");
    }

    // Create a backup of the current database before restoring
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const preRestoreBackupPath = path.join(
      backupDir,
      `pre_restore_${timestamp}.zip`
    );

    if (fs.existsSync(dbPath)) {
      const preRestoreZip = new AdmZip();
      preRestoreZip.addLocalFile(dbPath);
      preRestoreZip.writeZip(preRestoreBackupPath);
    }

    // Replace the current database with the backup
    await copyFile(extractedDbPath, dbPath);

    // Clean up temp directory
    fs.unlinkSync(extractedDbPath);
    if (fs.existsSync(path.join(tempDir, "metadata.json"))) {
      fs.unlinkSync(path.join(tempDir, "metadata.json"));
    }
    fs.rmdirSync(tempDir);

    console.log(`Database restored from backup: ${backupPath}`);
    return {
      success: true,
      message: "Database restored successfully",
      preRestoreBackup: preRestoreBackupPath,
    };
  } catch (error) {
    console.error("Error restoring backup:", error);
    return {
      success: false,
      message: `Restore failed: ${error.message}`,
      error,
    };
  }
}

/**
 * Get list of available backups
 * @returns {Promise<Array>} - Array of backup objects with file info
 */
async function getBackups() {
  try {
    console.log("Getting backups from:", backupDir);
    const files = await readdir(backupDir);
    console.log("Files in backup directory:", files);

    // Filter only zip files
    const backupFiles = files.filter((file) => path.extname(file) === ".zip");
    console.log("Zip files found:", backupFiles);

    // Get details for each backup
    const backups = [];

    for (const file of backupFiles) {
      try {
        const filePath = path.join(backupDir, file);
        console.log("Processing backup file:", filePath);
        const stats = fs.statSync(filePath);

        // Try to extract metadata
        let metadata = { name: "Unknown" };
        try {
          const zip = new AdmZip(filePath);
          const metadataEntry = zip.getEntry("metadata.json");
          if (metadataEntry) {
            metadata = JSON.parse(zip.readAsText(metadataEntry));
            console.log("Extracted metadata:", metadata);
          } else {
            console.log("No metadata.json found in zip file");
          }
        } catch (e) {
          // If metadata extraction fails, use filename info
          console.log(`Couldn't extract metadata from ${file}:`, e.message);
        }

        // Parse date from filename more safely or use file creation date as fallback
        let date;
        try {
          const dateMatch = file.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
          if (dateMatch) {
            // Replace all hyphens that appear after T with colons, and replace T with space
            let dateStr = dateMatch[1]
              .replace(/T/, " ")
              .replace(/-(\d{2})-(\d{2})$/, ":$1:$2");
            date = new Date(dateStr).toISOString();
          } else if (metadata.date) {
            // Use metadata date if available
            date = new Date(metadata.date).toISOString();
          } else {
            // Fall back to file stats
            date = stats.birthtime.toISOString();
          }
        } catch (dateError) {
          console.error("Error parsing date for file", file, dateError);
          // Use a safe fallback if date parsing fails
          date = new Date().toISOString();
        }

        backups.push({
          fileName: file,
          path: filePath,
          size: stats.size,
          date: date,
          name: metadata.name || file.split("_")[0] || "Backup",
        });
      } catch (fileError) {
        console.error("Error processing backup file", file, fileError);
        // Continue to next file if one fails
      }
    }

    // Sort by date (newest first)
    return backups.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error("Error getting backups:", error);
    return [];
  }
}

/**
 * Delete a backup file
 * @param {string} backupFileName - Name of the backup file to delete
 * @returns {Promise<Object>} - Result object with success status
 */
async function deleteBackup(backupFileName) {
  try {
    const backupPath = path.join(backupDir, backupFileName);

    // Check if file exists
    if (!fs.existsSync(backupPath)) {
      throw new Error("Backup file does not exist");
    }

    // Delete the file
    fs.unlinkSync(backupPath);

    return {
      success: true,
      message: "Backup deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting backup:", error);
    return {
      success: false,
      message: `Delete failed: ${error.message}`,
      error,
    };
  }
}

// Setup scheduled backup
let scheduledBackupJob = null;

/**
 * Start scheduled backup job
 * @param {string} schedule - Cron schedule expression (default: weekly on Sunday at 1am)
 */
function startScheduledBackup(schedule = "0 1 * * 0") {
  try {
    // Stop any existing job first
    if (scheduledBackupJob) {
      scheduledBackupJob.stop();
    }

    // Start a new job
    scheduledBackupJob = cron.schedule(schedule, async () => {
      console.log("Running scheduled database backup...");
      const result = await createBackup("Scheduled");
      if (result.success) {
        console.log("Scheduled backup completed successfully");

        // Clean up old backups - keep only the last 10 scheduled backups
        try {
          const backups = await getBackups();
          const scheduledBackups = backups.filter((b) =>
            b.name.includes("Scheduled")
          );

          if (scheduledBackups.length > 10) {
            // Delete the oldest scheduled backups
            for (let i = 10; i < scheduledBackups.length; i++) {
              await deleteBackup(scheduledBackups[i].fileName);
              console.log(
                `Deleted old scheduled backup: ${scheduledBackups[i].fileName}`
              );
            }
          }
        } catch (error) {
          console.error("Error during old backup cleanup:", error);
        }
      } else {
        console.error("Scheduled backup failed:", result.message);
      }
    });

    console.log(`Scheduled backup job started with schedule: ${schedule}`);
    return true;
  } catch (error) {
    console.error("Error starting scheduled backup:", error);
    return false;
  }
}

/**
 * Stop scheduled backup job
 */
function stopScheduledBackup() {
  if (scheduledBackupJob) {
    scheduledBackupJob.stop();
    scheduledBackupJob = null;
    console.log("Scheduled backup job stopped");
    return true;
  }
  return false;
}

module.exports = {
  createBackup,
  restoreBackup,
  getBackups,
  deleteBackup,
  startScheduledBackup,
  stopScheduledBackup,
};
