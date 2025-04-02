const express = require("express");
const router = express.Router();
const User = require("../models/user");

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
    const { display_name, biometric_data, image } = req.body;

    if (!display_name) {
      return res.status(400).json({
        success: false,
        message: "Display name is required",
      });
    }

    const result = await User.update(req.params.id, {
      display_name,
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

module.exports = router;
