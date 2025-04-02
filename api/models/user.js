const db = require("../database");

class User {
  // Get all users
  static async getAll() {
    try {
      return await db.getAllUsers();
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }

  // Get user by ID
  static async getById(userId) {
    try {
      return await db.getUserById(userId);
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return null;
    }
  }

  // Get user by username
  static async getByUsername(username) {
    try {
      return await db.getUserByUsername(username);
    } catch (error) {
      console.error("Error getting user by username:", error);
      return null;
    }
  }

  // Create a new user
  static async create(userData) {
    try {
      return await db.createUser(userData);
    } catch (error) {
      console.error("Error creating user:", error);
      return { success: false, message: error.message };
    }
  }

  // Update user
  static async update(userId, userData) {
    try {
      return await db.updateUser(userId, userData);
    } catch (error) {
      console.error("Error updating user:", error);
      return { success: false, message: error.message };
    }
  }

  // Delete user
  static async delete(userId) {
    try {
      return await db.deleteUser(userId);
    } catch (error) {
      console.error("Error deleting user:", error);
      return { success: false, message: error.message };
    }
  }

  // Authenticate user
  static async authenticate(username, password) {
    console.log(`User model: authenticating user ${username}`);
    try {
      // Handle Admin user specially
      const isAdmin = username.toLowerCase() === "admin";
      if (isAdmin) {
        console.log("Admin authentication special handling activated");
      }

      const result = await db.authenticateUser(username, password);
      console.log(
        `Authentication result from database: ${
          result.success ? "Success" : "Failed"
        }`
      );

      if (result.success) {
        console.log(`Successfully authenticated user: ${username}`);
        // Generate a simple token for API authentication
        const timestamp = new Date().getTime();
        const token = Buffer.from(`${username}:${timestamp}`).toString(
          "base64"
        );

        return {
          success: true,
          message: "Authentication successful",
          user: result.user,
          token: token,
        };
      } else {
        console.log(
          `Failed to authenticate user: ${username} - ${result.message}`
        );
        return {
          success: false,
          message: result.message || "Authentication failed",
        };
      }
    } catch (error) {
      console.error(`Error in User.authenticate: ${error.message}`, error);
      return { success: false, message: "Authentication error" };
    }
  }

  // Verify password for a specific user
  static async verifyPassword(userId, password) {
    try {
      const user = await db.getUserById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }

      // For admin users, perform case-insensitive comparison
      const isAdmin = user.username.toLowerCase() === "admin";
      const passwordMatches = isAdmin
        ? user.password.toLowerCase() === password.toLowerCase()
        : user.password === password;

      return {
        success: passwordMatches,
        message: passwordMatches
          ? "Password verified"
          : "Password does not match",
      };
    } catch (error) {
      console.error("Error verifying password:", error);
      return { success: false, message: "Password verification error" };
    }
  }

  // Change user password
  static async changePassword(userId, newPassword) {
    try {
      return await db.updateUserPassword(userId, newPassword);
    } catch (error) {
      console.error("Error changing password:", error);
      return { success: false, message: "Password change error" };
    }
  }
}

module.exports = User;
