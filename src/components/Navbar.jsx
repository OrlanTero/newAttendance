import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Box,
  Button,
} from "@mui/material";
import {
  Dashboard,
  People,
  EventNote,
  Assessment,
  Settings,
  AccountCircle,
  Lock,
  ExitToApp,
  People as PeopleIcon,
  Business as BusinessIcon,
  Event as EventIcon,
  Fingerprint as FingerprintIcon,
  Celebration as CelebrationIcon,
} from "@mui/icons-material";
import logo from "../assets/logo.png";

const Navbar = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const menuItems = [
    {
      path: "/main",
      name: "Dashboard",
      icon: <Dashboard />,
      roles: ["admin", "captain", "secretary"],
    },
    {
      path: "/employees",
      name: "Employees",
      icon: <PeopleIcon />,
      roles: ["admin"],
    },
    {
      path: "/departments",
      name: "Departments",
      icon: <BusinessIcon />,
      roles: ["admin"],
    },
    {
      path: "/holidays",
      name: "Holidays",
      icon: <CelebrationIcon />,
      roles: ["admin"],
    },
    {
      path: "/events",
      name: "Events",
      icon: <EventIcon />,
      roles: ["admin", "captain", "secretary"],
    },
    {
      path: "/attendance",
      name: "Attendance",
      icon: <EventNote />,
      roles: ["admin", "captain"],
    },
    {
      path: "/reports",
      name: "Reports",
      icon: <Assessment />,
      roles: ["admin", "captain", "secretary"],
    },
    {
      path: "/settings",
      name: "Settings",
      icon: <Settings />,
      roles: ["admin"],
    },
  ];

  const getFilteredMenuItems = () => {
    if (!user || !user.role) {
      return menuItems.filter((item) => item.path === "/main");
    }

    if (user.role === "admin") {
      return menuItems;
    }

    return menuItems.filter((item) => item.roles.includes(user.role));
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    navigate("/profile");
    handleMenuClose();
  };

  const handleChangePasswordClick = () => {
    navigate("/change-password");
    handleMenuClose();
  };

  const isActive = (path) => location.pathname === path;

  return (
    <AppBar position="fixed" color="default" elevation={1}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <img
            src={logo}
            alt="Logo"
            style={{ width: 40, height: 40, objectFit: "contain" }}
          />
          <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
            Attendance System
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          {getFilteredMenuItems().map((item) => (
            <Button
              key={item.path}
              component={Link}
              to={item.path}
              color={isActive(item.path) ? "primary" : "inherit"}
              variant={isActive(item.path) ? "contained" : "text"}
              startIcon={item.icon}
              sx={{
                textTransform: "none",
                px: 2,
              }}
            >
              {item.name}
            </Button>
          ))}
        </Box>

        <Box>
          <IconButton
            size="large"
            onClick={handleMenuOpen}
            color="inherit"
            sx={{
              gap: 1,
              border: (theme) =>
                anchorEl ? `1px solid ${theme.palette.primary.main}` : "none",
              borderRadius: 2,
              px: 2,
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: (theme) => theme.palette.primary.main,
              }}
            >
              {user?.display_name?.[0] || user?.username?.[0] || "U"}
            </Avatar>
            <Typography
              variant="subtitle2"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              {user?.display_name || user?.username}
            </Typography>
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              width: 250,
              mt: 1.5,
            },
          }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: (theme) => theme.palette.primary.main,
                }}
              >
                {user?.display_name?.[0] || user?.username?.[0] || "U"}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {user?.display_name || user?.username}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.role
                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                    : "User"}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider />

          <MenuItem onClick={handleProfileClick}>
            <ListItemIcon>
              <AccountCircle fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>

          <MenuItem onClick={handleChangePasswordClick}>
            <ListItemIcon>
              <Lock fontSize="small" />
            </ListItemIcon>
            Change Password
          </MenuItem>

          <Divider />

          <MenuItem onClick={onLogout} sx={{ color: "error.main" }}>
            <ListItemIcon>
              <ExitToApp fontSize="small" color="error" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
