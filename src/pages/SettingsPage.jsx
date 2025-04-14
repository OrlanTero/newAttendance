import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Divider,
  IconButton,
  Paper,
} from "@mui/material";
import {
  Backup as BackupIcon,
  Security as SecurityIcon,
  AccountCircle as AccountIcon,
  BrightnessAuto as DisplayIcon,
  Language as LanguageIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

const SettingsPage = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const settingsOptions = [
    {
      title: "Backup & Restore",
      description: "Manage database backups and restore options",
      icon: <BackupIcon sx={{ fontSize: 60, color: "#1976d2" }} />,
      action: () => navigate("/backup"),
    },
    {
      title: "Account Settings",
      description: "Update your account information",
      icon: <AccountIcon sx={{ fontSize: 60, color: "#4caf50" }} />,
      action: () => navigate("/profile"),
    },
    {
      title: "Security",
      description: "Change password and security options",
      icon: <SecurityIcon sx={{ fontSize: 60, color: "#ff9800" }} />,
      action: () => navigate("/change-password"),
    },
    {
      title: "Display Settings",
      description: "Customize application appearance and theme",
      icon: <DisplayIcon sx={{ fontSize: 60, color: "#9c27b0" }} />,
      action: () => alert("Display settings are not yet implemented"),
    },
    {
      title: "Language",
      description: "Change the application language",
      icon: <LanguageIcon sx={{ fontSize: 60, color: "#e91e63" }} />,
      action: () => alert("Language settings are not yet implemented"),
    },
    {
      title: "Notifications",
      description: "Configure notification settings",
      icon: <NotificationsIcon sx={{ fontSize: 60, color: "#607d8b" }} />,
      action: () => alert("Notification settings are not yet implemented"),
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pt: 8 }}>
      <Navbar user={user} onLogout={onLogout} />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: "bold" }}>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure application settings and preferences
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {settingsOptions.map((option, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-5px)",
                    boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                  },
                }}
              >
                <CardActionArea
                  onClick={option.action}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    height: "100%",
                    p: 2,
                  }}
                >
                  <Box sx={{ p: 2 }}>{option.icon}</Box>
                  <CardContent
                    sx={{ textAlign: "center", flexGrow: 1, width: "100%" }}
                  >
                    <Typography gutterBottom variant="h5" component="div">
                      {option.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default SettingsPage;
