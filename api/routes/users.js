const express = require("express");
const router = express.Router();
const User = require("../models/user");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "..", "uploads");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "user-avatar-" +
        req.params.id +
        "-" +
        uniqueSuffix +
        path.extname(file.originalname)
    );
  },
});

// Set up upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.getAll();
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const user = await User.getById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new user
router.post("/", async (req, res) => {
  try {
    const { username, password, display_name, biometric_data, image } =
      req.body;

    if (!username || !password || !display_name) {
      return res.status(400).json({
        success: false,
        message: "Username, password, and display name are required",
      });
    }

    const result = await User.create({
      username,
      password,
      display_name,
      biometric_data,
      image,
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user
router.put("/:id", async (req, res) => {
  try {
    const {
      display_name,
      email,
      phone,
      address,
      position,
      bio,
      biometric_data,
      image,
    } = req.body;

    if (!display_name) {
      return res.status(400).json({
        success: false,
        message: "Display name is required",
      });
    }

    const result = await User.update(req.params.id, {
      display_name,
      email,
      phone,
      address,
      position,
      bio,
      biometric_data,
      image,
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Change password
router.put("/:id/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.params.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    // First, get the user to verify the current password
    const user = await User.getById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify the current password
    const verifyResult = await User.verifyPassword(userId, currentPassword);
    if (!verifyResult.success) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update the password
    const result = await User.changePassword(userId, newPassword);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete user
router.delete("/:id", async (req, res) => {
  try {
    const result = await User.delete(req.params.id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Avatar upload route
router.post("/:id/avatar", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const userId = req.params.id;
    const imageUrl = `/api/uploads/${req.file.filename}`;

    // Update the user with the new image URL
    const result = await User.update(userId, { image: imageUrl });

    if (result.success) {
      res.json({
        success: true,
        message: "Avatar uploaded successfully",
        imageUrl: imageUrl,
      });
    } else {
      // Delete the uploaded file if the user update fails
      fs.unlinkSync(req.file.path);
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error uploading avatar:", error);
    if (req.file) {
      // Delete the uploaded file if an error occurs
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
