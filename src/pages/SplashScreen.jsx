import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Fade,
  Grow,
  CircularProgress,
  LinearProgress,
  Chip,
  Grid,
} from "@mui/material";
import DataObjectIcon from "@mui/icons-material/DataObject";
import StorageIcon from "@mui/icons-material/Storage";
import SecurityIcon from "@mui/icons-material/Security";
import DnsIcon from "@mui/icons-material/Dns";
import logo from "../assets/logo.png";

const SplashScreen = () => {
  const navigate = useNavigate();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [serverStatus, setServerStatus] = useState([
    {
      name: "Database",
      icon: <StorageIcon />,
      status: "initializing",
      color: "warning",
    },
    {
      name: "API Services",
      icon: <DataObjectIcon />,
      status: "waiting",
      color: "default",
    },
    {
      name: "Security",
      icon: <SecurityIcon />,
      status: "waiting",
      color: "default",
    },
    { name: "Network", icon: <DnsIcon />, status: "waiting", color: "default" },
  ]);

  // Update server status indicators as loading progresses
  useEffect(() => {
    const updateServerStatus = () => {
      if (loadingProgress > 25) {
        setServerStatus((prev) =>
          prev.map((item, index) =>
            index === 0
              ? { ...item, status: "connected", color: "success" }
              : item
          )
        );
      }

      if (loadingProgress > 50) {
        setServerStatus((prev) =>
          prev.map((item, index) =>
            index === 1 ? { ...item, status: "ready", color: "success" } : item
          )
        );
      }

      if (loadingProgress > 75) {
        setServerStatus((prev) =>
          prev.map((item, index) =>
            index === 2
              ? { ...item, status: "enabled", color: "success" }
              : item
          )
        );
      }

      if (loadingProgress > 90) {
        setServerStatus((prev) =>
          prev.map((item, index) =>
            index === 3 ? { ...item, status: "online", color: "success" } : item
          )
        );
      }
    };

    updateServerStatus();
  }, [loadingProgress]);

  // Handle navigation after loading
  useEffect(() => {
    const loadingTimer = setInterval(() => {
      setLoadingProgress((oldProgress) => {
        const newProgress = Math.min(oldProgress + 4, 100);
        if (newProgress === 100) {
          // Begin fade out when loading is complete
          setTimeout(() => {
            setFadeIn(false);
            // Navigate after fade out animation
            setTimeout(() => {
              navigate("/login");
            }, 500);
          }, 800);
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
          background:
            "linear-gradient(135deg, #051937 0%, #082b5e 50%, #154088 100%)",
          padding: 0,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Animated background particles */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "hidden",
            zIndex: 0,
          }}
        >
          {[...Array(20)].map((_, i) => (
            <Box
              key={i}
              sx={{
                position: "absolute",
                width: Math.random() * 10 + 2,
                height: Math.random() * 10 + 2,
                backgroundColor: "rgba(255, 255, 255, 0.3)",
                borderRadius: "50%",
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `float-particle ${
                  Math.random() * 10 + 10
                }s linear infinite`,
                opacity: Math.random() * 0.5 + 0.1,
                "@keyframes float-particle": {
                  "0%": {
                    transform: "translateY(0) translateX(0)",
                    opacity: 0,
                  },
                  "50%": {
                    opacity: Math.random() * 0.5 + 0.2,
                  },
                  "100%": {
                    transform: `translateY(-${
                      Math.random() * 100 + 50
                    }px) translateX(${Math.random() * 100 - 50}px)`,
                    opacity: 0,
                  },
                },
              }}
            />
          ))}
        </Box>

        {/* Glowing accent */}
        <Box
          sx={{
            position: "absolute",
            top: "30%",
            left: "50%",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(33, 150, 243, 0.15) 0%, rgba(25, 118, 210, 0) 70%)",
            transform: "translate(-50%, -50%)",
            filter: "blur(40px)",
            animation: "pulse-glow 4s ease-in-out infinite",
            "@keyframes pulse-glow": {
              "0%": {
                opacity: 0.4,
                transform: "translate(-50%, -50%) scale(1)",
              },
              "50%": {
                opacity: 0.7,
                transform: "translate(-50%, -50%) scale(1.2)",
              },
              "100%": {
                opacity: 0.4,
                transform: "translate(-50%, -50%) scale(1)",
              },
            },
            zIndex: 0,
          }}
        />

        <Grow in={true} timeout={1000}>
          <Paper
            elevation={8}
            sx={{
              padding: { xs: 4, sm: 6 },
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderRadius: 4,
              maxWidth: 800,
              width: "90%",
              background: "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(20px)",
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.3), 0 0 30px rgba(25, 118, 210, 0.2)",
              position: "relative",
              overflow: "hidden",
              zIndex: 2,
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                height: "5px",
                background: "linear-gradient(90deg, #1976d2, #4fc3f7, #1976d2)",
                backgroundSize: "200% 100%",
                animation: "gradient-shift 3s ease infinite",
                "@keyframes gradient-shift": {
                  "0%": { backgroundPosition: "0% 50%" },
                  "50%": { backgroundPosition: "100% 50%" },
                  "100%": { backgroundPosition: "0% 50%" },
                },
              },
            }}
          >
            <Box
              sx={{
                mb: 5,
                position: "relative",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "150%",
                  height: "150%",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(33, 150, 243, 0.1) 0%, rgba(25, 118, 210, 0) 70%)",
                  transform: "translate(-50%, -50%)",
                  zIndex: -1,
                  animation: "pulse-logo 2s ease-in-out infinite",
                  "@keyframes pulse-logo": {
                    "0%": {
                      transform: "translate(-50%, -50%) scale(0.8)",
                      opacity: 0.5,
                    },
                    "50%": {
                      transform: "translate(-50%, -50%) scale(1)",
                      opacity: 0.8,
                    },
                    "100%": {
                      transform: "translate(-50%, -50%) scale(0.8)",
                      opacity: 0.5,
                    },
                  },
                },
              }}
            >
              <img
                src={logo}
                alt="Logo"
                style={{
                  height: 200,
                  width: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 10px 20px rgba(0, 0, 0, 0.2))",
                  animation: "float 3s ease-in-out infinite",
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
                mb: 2,
                background: "linear-gradient(135deg, #0d47a1 0%, #2196f3 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                textShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                letterSpacing: "-0.5px",
                fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
              }}
            >
              Attendance Management Server
            </Typography>

            <Typography
              variant="h6"
              sx={{
                textAlign: "center",
                color: "#455a64",
                mb: 4,
                maxWidth: "85%",
                fontWeight: 400,
              }}
            >
              Administrative Control Panel | Data & User Management
            </Typography>

            {/* Server status indicators */}
            <Grid container spacing={2} sx={{ width: "80%", mb: 4 }}>
              {serverStatus.map((item, index) => (
                <Grid item xs={6} sm={3} key={index}>
                  <Chip
                    icon={item.icon}
                    label={`${item.name}: ${item.status}`}
                    color={item.color}
                    variant={item.color === "success" ? "filled" : "outlined"}
                    sx={{
                      width: "100%",
                      justifyContent: "flex-start",
                      transition: "all 0.3s ease",
                      animation:
                        item.color === "success"
                          ? "success-pulse 2s ease"
                          : "none",
                      "@keyframes success-pulse": {
                        "0%": { transform: "scale(1)" },
                        "50%": { transform: "scale(1.05)" },
                        "100%": { transform: "scale(1)" },
                      },
                    }}
                  />
                </Grid>
              ))}
            </Grid>

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
              <Box sx={{ position: "relative", width: "80%", mb: 3 }}>
                <LinearProgress
                  variant="determinate"
                  value={loadingProgress}
                  sx={{
                    width: "100%",
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: "rgba(0, 0, 0, 0.05)",
                    "& .MuiLinearProgress-bar": {
                      background: "linear-gradient(90deg, #1976d2, #4fc3f7)",
                      borderRadius: 6,
                      transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      animation: "gradient-move 2s linear infinite",
                      "@keyframes gradient-move": {
                        "0%": { backgroundPosition: "0% 50%" },
                        "100%": { backgroundPosition: "100% 50%" },
                      },
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    position: "absolute",
                    right: 0,
                    top: -20,
                    color: "#455a64",
                    fontWeight: "bold",
                  }}
                >
                  {`${Math.round(loadingProgress)}%`}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                }}
              >
                {loadingProgress < 100 && (
                  <CircularProgress
                    size={24}
                    thickness={5}
                    sx={{
                      color: "#1976d2",
                    }}
                  />
                )}
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ fontWeight: 500 }}
                >
                  {loadingProgress === 100
                    ? "Server initialization complete"
                    : "Initializing server components..."}
                </Typography>
              </Box>
            </Box>

            <Typography
              variant="caption"
              sx={{
                position: "absolute",
                bottom: 12,
                right: 16,
                opacity: 0.7,
                color: "#455a64",
                fontWeight: "medium",
              }}
            >
              Server Version {appVersion}
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
            fontWeight: "medium",
            letterSpacing: 1,
            zIndex: 5,
          }}
        >
          © {new Date().getFullYear()} | ATTENDANCE MANAGEMENT SYSTEM | SERVER
          CONSOLE
        </Typography>
      </Box>
    </Fade>
  );
};

export default SplashScreen;
