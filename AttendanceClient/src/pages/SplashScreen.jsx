import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Fade,
  Grow,
  LinearProgress,
} from "@mui/material";
import logo from "../assets/logo.png";

const SplashScreen = () => {
  const navigate = useNavigate();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  // Handle navigation after loading
  useEffect(() => {
    const loadingTimer = setInterval(() => {
      setLoadingProgress((oldProgress) => {
        const newProgress = Math.min(oldProgress + 5, 100);
        if (newProgress === 100) {
          // Begin fade out when loading is complete
          setTimeout(() => {
            setFadeIn(false);
            // Navigate after fade out animation
            setTimeout(() => {
              navigate("/attendance");
            }, 500);
          }, 500);
          clearInterval(loadingTimer);
        }
        return newProgress;
      });
    }, 80); // Adjust this value to make loading faster or slower

    return () => {
      clearInterval(loadingTimer);
    };
  }, [navigate]);

  const appVersion = "1.0.0"; // You can pull this from package.json if needed

  return (
    <Fade in={fadeIn} timeout={800}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100vw",
          backgroundColor: "#070B34", // Darker blue background
          background: "linear-gradient(135deg, #070B34 0%, #1A2342 100%)", // Gradient background
          padding: 0,
          overflow: "hidden",
        }}
      >
        <Grow in={true} timeout={1000}>
          <Paper
            elevation={6}
            sx={{
              padding: { xs: 4, sm: 6 },
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderRadius: 4,
              maxWidth: 800,
              width: "90%",
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
              position: "relative",
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "4px",
                background: "linear-gradient(90deg, #1976d2, #9c27b0)",
              },
            }}
          >
            <Box
              sx={{
                mb: 5,
                animation: "pulse 2s infinite",
                "@keyframes pulse": {
                  "0%": { transform: "scale(1)" },
                  "50%": { transform: "scale(1.05)" },
                  "100%": { transform: "scale(1)" },
                },
              }}
            >
              <img
                src={logo}
                alt="Logo"
                style={{
                  height: 160,
                  width: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))",
                }}
              />
            </Box>

            <Typography
              variant="h2"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 800,
                textAlign: "center",
                mb: 3,
                color: "#1565C0",
                textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                letterSpacing: "-0.5px",
                fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
              }}
            >
              Attendance Management System
            </Typography>

            <Typography
              variant="h6"
              sx={{
                textAlign: "center",
                color: "#546e7a",
                mb: 5,
                maxWidth: "80%",
                fontWeight: 400,
              }}
            >
              Streamlined employee attendance tracking with fingerprint
              biometrics
            </Typography>

            <Box
              sx={{
                width: "100%",
                mt: 2,
                mb: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <LinearProgress
                variant="determinate"
                value={loadingProgress}
                sx={{
                  width: "80%",
                  height: 8,
                  borderRadius: 4,
                  mb: 2,
                  "& .MuiLinearProgress-bar": {
                    background: "linear-gradient(90deg, #1976d2, #9c27b0)",
                  },
                }}
              />

              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                {loadingProgress === 100 ? "Ready!" : "Loading application..."}
              </Typography>
            </Box>

            <Typography
              variant="caption"
              sx={{
                position: "absolute",
                bottom: 12,
                right: 12,
                opacity: 0.7,
                color: "#546e7a",
              }}
            >
              Version {appVersion}
            </Typography>
          </Paper>
        </Grow>

        <Typography
          variant="caption"
          sx={{
            color: "rgba(255,255,255,0.7)",
            position: "absolute",
            bottom: 16,
            left: 0,
            right: 0,
            textAlign: "center",
          }}
        >
          © {new Date().getFullYear()} Attendance Management System
        </Typography>
      </Box>
    </Fade>
  );
};

export default SplashScreen;
