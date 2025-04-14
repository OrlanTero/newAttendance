const express = require("express");
const router = express.Router();
const path = require("path");
const backup = require("../utils/backup");
const fs = require("fs");

// Middleware to check if backup directory exists
router.use((req, res, next) => {
  const backupDir = path.join(__dirname, "..", "data", "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  next();
});

/**
 * @route GET /api/backup
 * @desc Get all available backups
 * @access Private
 */
router.get("/", async (req, res) => {
  try {
    console.log("API: Backup retrieval request received");
    console.log(
      "API: Backup directory path:",
      path.join(__dirname, "..", "data", "backups")
    );

    const backups = await backup.getBackups();
    console.log("API: Backups retrieved:", backups);

    res.json({ success: true, data: backups });
  } catch (error) {
    console.error("Error getting backups:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get backups",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/backup
 * @desc Create a new backup
 * @access Private
 */
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    const result = await backup.createBackup(name);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("Error creating backup:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create backup",
      error: error.message,
    });
  }
});

/**
 * @route DELETE /api/backup/:filename
 * @desc Delete a backup file
 * @access Private
 */
router.delete("/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const result = await backup.deleteBackup(filename);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Error deleting backup:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete backup",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/backup/restore/:filename
 * @desc Restore database from backup
 * @access Private
 */
router.post("/restore/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const result = await backup.restoreBackup(filename);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("Error restoring backup:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restore backup",
      error: error.message,
    });
  }
});

/**
 * @route GET /api/backup/download/:filename
 * @desc Download a backup file
 * @access Private
 */
router.get("/download/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const backupDir = path.join(__dirname, "..", "data", "backups");
    const filePath = path.join(backupDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Backup file not found",
      });
    }

    res.download(filePath);
  } catch (error) {
    console.error("Error downloading backup:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download backup",
      error: error.message,
    });
  }
});

/**
 * @route GET /api/backup/scheduled/status
 * @desc Check if scheduled backups are running
 * @access Private
 */
router.get("/scheduled/status", (req, res) => {
  try {
    // Check if scheduled backup job is running
    const isRunning = !!backup.scheduledBackupJob;

    res.json({
      success: true,
      isRunning,
    });
  } catch (error) {
    console.error("Error checking scheduled backup status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check scheduled backup status",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/backup/scheduled/start
 * @desc Start scheduled backups
 * @access Private
 */
router.post("/scheduled/start", (req, res) => {
  try {
    // Get schedule from request or use default
    const { schedule } = req.body;
    const result = backup.startScheduledBackup(schedule);

    res.json({
      success: result,
      message: result
        ? "Scheduled backups started successfully"
        : "Failed to start scheduled backups",
    });
  } catch (error) {
    console.error("Error starting scheduled backups:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start scheduled backups",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/backup/scheduled/stop
 * @desc Stop scheduled backups
 * @access Private
 */
router.post("/scheduled/stop", (req, res) => {
  try {
    const result = backup.stopScheduledBackup();

    res.json({
      success: true,
      message: result
        ? "Scheduled backups stopped successfully"
        : "No scheduled backups were running",
    });
  } catch (error) {
    console.error("Error stopping scheduled backups:", error);
    res.status(500).json({
      success: false,
      message: "Failed to stop scheduled backups",
      error: error.message,
    });
  }
});

module.exports = router;
