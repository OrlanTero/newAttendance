import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import * as api from "../utils/api";
import UserDetailView from "../components/UserDetailView";
import Navbar from "../components/Navbar";

const ProfilePage = ({ user: initialUser, onLogout }) => {
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState(null);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Add debug log
  console.log("ProfilePage initialUser:", initialUser);
  console.log("ProfilePage currentUser:", currentUser);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!currentUser || !currentUser.user_id) {
        console.error("No valid user_id in currentUser:", currentUser);
        setError("Unable to load profile: Missing user ID");
        setLoading(false);
        return;
      }

      console.log("Fetching user details for user_id:", currentUser.user_id);

      try {
        setLoading(true);
        const response = await api.getUser(currentUser.user_id);
        console.log("API getUser response:", response);

        // Handle different API response formats
        if (response.success && response.user) {
          // If the response has a user property, use that
          console.log("Setting userDetails from response.user");
          setUserDetails(response.user);
        } else if (
          response.success &&
          response.data &&
          typeof response.data === "object"
        ) {
          // If the response has a success flag and data property
          console.log(
            "Setting userDetails from response.data with success flag"
          );
          // Save the entire response to preserve the structure
          setUserDetails(response);
        } else if (response.data && typeof response.data === "object") {
          // If the response has just a data property
          console.log("Setting userDetails from response.data");
          // Save the entire response to preserve the structure
          setUserDetails(response);
        } else if (response.user_id || response.username) {
          // If the response itself is the user object
          console.log("Setting userDetails from direct response");
          setUserDetails(response);
        } else {
          console.error("Unexpected API response format:", response);
          setError("Failed to load user details");
          console.warn("Unexpected API response format:", response);
        }
      } catch (err) {
        console.error("Error fetching user details:", err);
        setError("An error occurred while loading user details");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [currentUser]);

  const handleUserUpdate = (updatedUser) => {
    console.log("Profile updated with new data:", updatedUser);

    // Keep the complete user data structure with data property if it exists
    setUserDetails((prevDetails) => {
      if (prevDetails && prevDetails.data) {
        return {
          ...prevDetails,
          data: {
            ...prevDetails.data,
            ...updatedUser,
          },
        };
      }
      return updatedUser;
    });

    // Update the current user state, ensuring we preserve the user_id and role
    setCurrentUser((prevUser) => ({
      ...prevUser,
      user_id: updatedUser.user_id || prevUser.user_id, // Preserve user_id
      display_name: updatedUser.display_name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      address: updatedUser.address,
      position: updatedUser.position,
      bio: updatedUser.bio,
      image: updatedUser.image,
      role: updatedUser.role || prevUser.role, // Preserve role
    }));

    console.log(
      "Updated current user state with role and user_id:",
      updatedUser.role || currentUser.role,
      updatedUser.user_id || currentUser.user_id
    );

    // Force a refresh of the user details
    setLoading(true);
    setTimeout(() => {
      // Make sure we still have a valid user_id
      if (!currentUser.user_id) {
        console.error("Missing user_id when refreshing user data");
        setLoading(false);
        setError("Failed to refresh user data: Missing user ID");
        return;
      }

      api
        .getUser(currentUser.user_id)
        .then((response) => {
          console.log("Refreshed user data response:", response);

          if (response.success && response.user) {
            console.log("Refreshed user data from response.user");
            setUserDetails(response);
          } else if (response.success && response.data) {
            console.log(
              "Refreshed user data from response.data with success flag"
            );
            setUserDetails(response);
          } else if (response.data) {
            console.log("Refreshed user data from response.data");
            setUserDetails(response);
          } else if (response.user_id || response.username) {
            console.log("Refreshed user data from direct response");
            setUserDetails(response);
          }

          setLoading(false);
        })
        .catch((err) => {
          console.error("Error refreshing user data:", err);
          setLoading(false);
        });
    }, 500); // Small delay to ensure database update is complete

    setNotification({
      open: true,
      message: "Profile updated successfully!",
      severity: "success",
    });
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false,
    });
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "calc(100vh - 64px)",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography color="error" variant="h6">
            {error}
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pt: 8 }}>
      <Navbar user={currentUser} onLogout={onLogout} />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Profile
        </Typography>

        {userDetails && (
          <UserDetailView
            user={{
              // Properly extract user data from nested structure if it exists
              ...(userDetails.data || userDetails),
              // Always ensure user_id is present, fallback to currentUser's id if needed
              user_id:
                userDetails.user_id ||
                (userDetails.data && userDetails.data.user_id) ||
                currentUser?.user_id ||
                1,
            }}
            onUpdate={handleUserUpdate}
            onClose={() => {}} // No close action in profile page
          />
        )}

        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
            sx={{ width: "100%" }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default ProfilePage;
