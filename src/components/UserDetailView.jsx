import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Avatar,
  Paper,
  IconButton,
  Divider,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  PhotoCamera as CameraIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import * as api from "../utils/api";

const UserDetailView = ({ user, onUpdate, onClose }) => {
  // Add debug log to check what user data we're receiving
  console.log("UserDetailView received user data:", user);

  // Extract actual user data from potentially nested structure
  const userData = user.data || user;

  const [formData, setFormData] = useState({
    display_name: userData?.display_name || "",
    email: userData?.email || "",
    phone: userData?.phone || "",
    address: userData?.address || "",
    position: userData?.position || "",
    bio: userData?.bio || "",
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(userData?.image || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Update form data when user data changes
  useEffect(() => {
    if (userData) {
      setFormData({
        display_name: userData.display_name || "",
        email: userData.email || "",
        phone: userData.phone || "",
        address: userData.address || "",
        position: userData.position || "",
        bio: userData.bio || "",
      });
      setAvatarPreview(userData.image || null);
    }
  }, [userData]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle avatar selection
  const handleAvatarChange = (e) => {
    console.warn("Avatar upload is not supported by the current API");
    // Leave the code in place but it won't actually do anything
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);

      // Create a preview URL (this will only show locally, not persist)
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger file input click
  const handleSelectAvatar = () => {
    // Inform user that this feature is disabled
    setError("Avatar upload is not supported in this version.");
    // Don't trigger the file input
    // fileInputRef.current.click();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Check if we have a valid user_id
      const userId = user.user_id || (user.data && user.data.user_id);
      if (!userId) {
        setError("Cannot update user: Missing user ID");
        console.error("Missing user_id in user object:", user);
        setIsSubmitting(false);
        return;
      }

      // Ensure all string fields have values (empty string instead of null/undefined)
      const cleanedFormData = {
        display_name: formData.display_name || "",
        email: formData.email || "",
        phone: formData.phone || "",
        address: formData.address || "",
        position: formData.position || "",
        bio: formData.bio || "",
      };

      // Skip avatar upload functionality as it's not supported by the API
      // Update user details directly
      console.log("Submitting update for user:", userId, cleanedFormData);
      const response = await api.updateUser(userId, {
        ...cleanedFormData,
        // Don't modify the image if we don't have avatar upload functionality
        image: userData?.image || null,
      });

      console.log("Update response:", response);

      if (response.success) {
        // Ensure we have the complete user data with role
        const updatedUserData = response.user || {
          ...userData,
          ...cleanedFormData,
          image: userData?.image || null,
        };

        // Make sure to preserve the role from the response if it exists
        if (response.user && response.user.role) {
          console.log(`Received role from API: ${response.user.role}`);
          updatedUserData.role = response.user.role;
        } else {
          // If no role in response, preserve the original role
          console.log(`Using original role: ${userData.role}`);
          updatedUserData.role = userData.role;
        }

        console.log("Complete updated user data:", updatedUserData);

        // Notify parent component of the update
        onUpdate(updatedUserData);
      } else {
        setError(response.message || "Failed to update user details");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      setError("An error occurred while updating user details");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component={Paper} p={3} elevation={3}>
      <Typography variant="h5" gutterBottom>
        User Details
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Avatar Section */}
          <Grid item xs={12} md={4} sx={{ textAlign: "center" }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Avatar
                src={avatarPreview}
                alt={formData.display_name}
                sx={{
                  width: 120,
                  height: 120,
                  mb: 2,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                {formData.display_name
                  ? formData.display_name[0].toUpperCase()
                  : "U"}
              </Avatar>
              <input
                ref={fileInputRef}
                accept="image/*"
                type="file"
                hidden
                onChange={handleAvatarChange}
              />
              <Button
                variant="outlined"
                component="span"
                startIcon={<CameraIcon />}
                onClick={handleSelectAvatar}
                size="small"
              >
                Change Avatar
              </Button>
            </Box>

            <Box sx={{ textAlign: "left", mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Account Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Username:</strong> {userData?.username || "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Role:</strong> {userData?.role || "Standard User"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Created:</strong>{" "}
                {userData?.date_created
                  ? new Date(userData.date_created).toLocaleDateString()
                  : "N/A"}
              </Typography>
            </Box>
          </Grid>

          {/* User Detail Fields */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Display Name"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Position/Title"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  placeholder="Add a short bio or description..."
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Error Message */}
          {error && (
            <Grid item xs={12}>
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            </Grid>
          )}

          {/* Action Buttons */}
          <Grid
            item
            xs={12}
            sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}
          >
            <Button
              variant="outlined"
              color="secondary"
              onClick={onClose}
              sx={{ mr: 2 }}
              startIcon={<CancelIcon />}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={
                isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />
              }
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default UserDetailView;
