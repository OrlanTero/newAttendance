import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
  Tab,
  Tabs,
  Drawer,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import Navbar from "../components/Navbar";
import UserDetailView from "../components/UserDetailView";
import * as api from "../utils/api";

const UserManagementPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [dialogMode, setDialogMode] = useState("add"); // "add" or "edit"
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [currentUserDetail, setCurrentUserDetail] = useState(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    display_name: "",
    email: "",
    phone: "",
    position: "",
    role: "secretary", // Default to secretary
  });

  // Check if current user is allowed to manage users
  const canManageUsers = user?.role === "admin" || user?.role === "captain";

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.getUsers();
      if (response.success) {
        setUsers(response.data);
      } else {
        setError("Failed to load users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Error loading users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDialogOpen = (mode, userData = null) => {
    if (mode === "add") {
      setFormData({
        username: "",
        password: "",
        display_name: "",
        email: "",
        phone: "",
        position: "",
        role: "secretary", // Default role
      });
      setDialogMode("add");
    } else if (mode === "edit" && userData) {
      setFormData({
        username: userData.username,
        display_name: userData.display_name,
        email: userData.email || "",
        phone: userData.phone || "",
        position: userData.position || "",
        role: userData.role || "secretary",
        password: "", // Don't include password for edit
      });
      setSelectedUser(userData);
      setDialogMode("edit");
    }
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setSelectedUser(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleFormSubmit = async () => {
    // Basic validation
    if (
      !formData.username ||
      !formData.display_name ||
      (dialogMode === "add" && !formData.password)
    ) {
      showSnackbar("Please fill all required fields", "error");
      return;
    }

    try {
      let response;

      if (dialogMode === "add") {
        response = await api.createUser({
          username: formData.username,
          password: formData.password,
          display_name: formData.display_name,
          email: formData.email,
          phone: formData.phone,
          position: formData.position,
          role: formData.role,
        });
      } else {
        // Edit mode
        response = await api.updateUser(selectedUser.user_id, {
          display_name: formData.display_name,
          email: formData.email,
          phone: formData.phone,
          position: formData.position,
          // Don't update password in edit mode through this form
        });
      }

      if (response.success) {
        showSnackbar(
          `User ${dialogMode === "add" ? "created" : "updated"} successfully`,
          "success"
        );
        handleDialogClose();
        fetchUsers(); // Refresh the user list
      } else {
        showSnackbar(response.message || "Operation failed", "error");
      }
    } catch (error) {
      console.error(
        `Error ${dialogMode === "add" ? "creating" : "updating"} user:`,
        error
      );
      showSnackbar(
        `Failed to ${
          dialogMode === "add" ? "create" : "update"
        } user. Please try again.`,
        "error"
      );
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      const response = await api.deleteUser(userId);
      if (response.success) {
        showSnackbar("User deleted successfully", "success");
        fetchUsers(); // Refresh the user list
      } else {
        showSnackbar(response.message || "Failed to delete user", "error");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      showSnackbar("Error deleting user. Please try again.", "error");
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  };

  const handleSnackbarClose = () => {
    setOpenSnackbar(false);
  };

  // Determine which roles the current user can create
  const getAllowedRolesToCreate = () => {
    if (user?.role === "admin") {
      return ["admin", "secretary"];
    } else if (user?.role === "captain") {
      return ["admin", "secretary"];
    }
    return [];
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "primary";
      case "captain":
        return "secondary";
      case "secretary":
        return "success";
      default:
        return "default";
    }
  };

  // Handle opening the user detail drawer
  const handleViewUserDetails = (userData) => {
    setCurrentUserDetail(userData);
    setDetailDrawerOpen(true);
  };

  // Handle closing the user detail drawer
  const handleCloseUserDetails = () => {
    setDetailDrawerOpen(false);
    setCurrentUserDetail(null);
  };

  // Handle user details update
  const handleUserDetailUpdate = (updatedUser) => {
    showSnackbar("User details updated successfully", "success");
    fetchUsers(); // Refresh the user list
    setDetailDrawerOpen(false);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pt: 8 }}>
      <Navbar user={user} onLogout={onLogout} />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
          <IconButton
            onClick={() => navigate("/settings")}
            sx={{ mr: 2 }}
            aria-label="back"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>
            User Management
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {canManageUsers
            ? "Manage user accounts. You can add new Admin and Secretary accounts and manage user details."
            : "You don't have permission to manage users."}
        </Typography>

        {canManageUsers && (
          <Box sx={{ mb: 4 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleDialogOpen("add")}
            >
              Add New User
            </Button>
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        ) : (
          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "primary.main" }}>
                  <TableCell sx={{ color: "white" }}>Username</TableCell>
                  <TableCell sx={{ color: "white" }}>Display Name</TableCell>
                  <TableCell sx={{ color: "white" }}>Email/Phone</TableCell>
                  <TableCell sx={{ color: "white" }}>Position</TableCell>
                  <TableCell sx={{ color: "white" }}>Role</TableCell>
                  <TableCell sx={{ color: "white" }}>Created</TableCell>
                  {canManageUsers && (
                    <TableCell sx={{ color: "white" }}>Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManageUsers ? 7 : 6} align="center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((userItem) => (
                    <TableRow key={userItem.user_id}>
                      <TableCell>{userItem.username}</TableCell>
                      <TableCell>{userItem.display_name}</TableCell>
                      <TableCell>
                        {userItem.email ? (
                          <Typography variant="body2">
                            {userItem.email}
                          </Typography>
                        ) : null}
                        {userItem.phone ? (
                          <Typography variant="body2" color="text.secondary">
                            {userItem.phone}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>{userItem.position || "-"}</TableCell>
                      <TableCell>
                        <Chip
                          label={userItem.role || "User"}
                          color={getRoleColor(userItem.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(userItem.date_created).toLocaleDateString()}
                      </TableCell>
                      {canManageUsers && (
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => handleViewUserDetails(userItem)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Basic Info">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleDialogOpen("edit", userItem)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteUser(userItem.user_id)}
                              // Prevent deleting admin users unless current user is admin
                              disabled={
                                userItem.role === "admin" &&
                                user?.role !== "admin"
                              }
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* User Create/Edit Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleDialogClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {dialogMode === "add" ? "Add New User" : "Edit User"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={dialogMode === "edit"} // Username cannot be changed
                  required
                />
              </Grid>
              {dialogMode === "add" && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
              )}
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
                  label="Position/Title"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                />
              </Grid>
              {dialogMode === "add" && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="role-select-label">Role</InputLabel>
                    <Select
                      labelId="role-select-label"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      label="Role"
                    >
                      {getAllowedRolesToCreate().map((role) => (
                        <MenuItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button
              onClick={handleFormSubmit}
              variant="contained"
              color="primary"
            >
              {dialogMode === "add" ? "Add User" : "Update User"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* User Detail Drawer */}
        <Drawer
          anchor="right"
          open={detailDrawerOpen}
          onClose={handleCloseUserDetails}
          PaperProps={{
            sx: { width: { xs: "100%", sm: "80%", md: "50%" }, p: 2 },
          }}
        >
          {currentUserDetail && (
            <UserDetailView
              user={currentUserDetail}
              onUpdate={handleUserDetailUpdate}
              onClose={handleCloseUserDetails}
            />
          )}
        </Drawer>

        {/* Snackbar for notifications */}
        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbarSeverity}
            sx={{ width: "100%" }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default UserManagementPage;
