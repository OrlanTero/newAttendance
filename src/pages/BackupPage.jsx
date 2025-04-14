import React, { useState, useEffect } from "react";
import * as api from "../utils/api";
import Navbar from "../components/Navbar";
import {
  Box,
  Container,
  Typography,
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
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Grid,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  Switch,
  FormControlLabel,
  FormGroup,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Backup as BackupIcon,
  RestorePage as RestoreIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  Create as CreateIcon,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";

const BackupPage = ({ user, onLogout }) => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [createDialog, setCreateDialog] = useState(false);
  const [backupName, setBackupName] = useState("");
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scheduledBackupEnabled, setScheduledBackupEnabled] = useState(false);
  const [scheduledBackupDialog, setScheduledBackupDialog] = useState(false);
  const [scheduleOption, setScheduleOption] = useState("weekly");
  const [customSchedule, setCustomSchedule] = useState("0 1 * * 0");
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);

  useEffect(() => {
    fetchBackups();
    fetchScheduledBackupStatus();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await api.getBackups();
      if (response.success && response.data) {
        setBackups(response.data);
      } else {
        setError("Failed to fetch backups");
        showSnackbar("Failed to load backups", "error");
      }
    } catch (error) {
      console.error("Error fetching backups:", error);
      setError("Failed to fetch backups");
      showSnackbar("Error loading backups", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledBackupStatus = async () => {
    try {
      const response = await api.getScheduledBackupStatus();
      if (response.success) {
        setScheduledBackupEnabled(response.isRunning);
      }
    } catch (error) {
      console.error("Error fetching scheduled backup status:", error);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      setCreateDialog(false);

      showSnackbar("Creating backup...", "info");

      const response = await api.createBackup(backupName);

      if (response.success) {
        showSnackbar("Backup created successfully", "success");
        fetchBackups();
      } else {
        showSnackbar(`Failed to create backup: ${response.message}`, "error");
      }
    } catch (error) {
      console.error("Error creating backup:", error);
      showSnackbar("Error creating backup", "error");
    } finally {
      setLoading(false);
      setBackupName("");
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    try {
      setIsRestoringBackup(true);
      setRestoreDialog(false);

      showSnackbar("Restoring backup...", "info");

      const response = await api.restoreBackup(selectedBackup.fileName);

      if (response.success) {
        showSnackbar(
          "Backup restored successfully. The application will restart.",
          "success"
        );

        // Give some time for the user to see the message before restarting
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        showSnackbar(`Failed to restore backup: ${response.message}`, "error");
      }
    } catch (error) {
      console.error("Error restoring backup:", error);
      showSnackbar("Error restoring backup", "error");
    } finally {
      setIsRestoringBackup(false);
      setSelectedBackup(null);
    }
  };

  const handleDeleteBackup = async () => {
    if (!selectedBackup) return;

    try {
      setLoading(true);
      setConfirmDelete(false);

      const response = await api.deleteBackup(selectedBackup.fileName);

      if (response.success) {
        showSnackbar("Backup deleted successfully", "success");
        fetchBackups();
      } else {
        showSnackbar(`Failed to delete backup: ${response.message}`, "error");
      }
    } catch (error) {
      console.error("Error deleting backup:", error);
      showSnackbar("Error deleting backup", "error");
    } finally {
      setLoading(false);
      setSelectedBackup(null);
    }
  };

  const handleToggleScheduledBackup = async (enabled) => {
    try {
      setLoading(true);

      let response;
      if (enabled) {
        response = await api.startScheduledBackup();
      } else {
        response = await api.stopScheduledBackup();
      }

      if (response.success) {
        setScheduledBackupEnabled(enabled);
        showSnackbar(
          enabled ? "Scheduled backups enabled" : "Scheduled backups disabled",
          "success"
        );
      } else {
        showSnackbar(
          `Failed to ${enabled ? "enable" : "disable"} scheduled backups`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error toggling scheduled backup:", error);
      showSnackbar(
        `Error ${enabled ? "enabling" : "disabling"} scheduled backups`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    let schedule = customSchedule;

    // If using preset options, convert to cron expression
    if (scheduleOption === "weekly") {
      schedule = "0 1 * * 0"; // At 1:00 AM every Sunday
    } else if (scheduleOption === "daily") {
      schedule = "0 1 * * *"; // At 1:00 AM every day
    } else if (scheduleOption === "monthly") {
      schedule = "0 1 1 * *"; // At 1:00 AM on the 1st of every month
    }

    try {
      setLoading(true);
      setScheduledBackupDialog(false);

      const response = await api.startScheduledBackup(schedule);

      if (response.success) {
        setScheduledBackupEnabled(true);
        showSnackbar("Backup schedule updated successfully", "success");
      } else {
        showSnackbar("Failed to update backup schedule", "error");
      }
    } catch (error) {
      console.error("Error updating backup schedule:", error);
      showSnackbar("Error updating backup schedule", "error");
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return (
        date.toLocaleString() +
        ` (${formatDistanceToNow(date, { addSuffix: true })})`
      );
    } catch (error) {
      return dateString;
    }
  };

  const downloadBackup = (backup) => {
    const downloadUrl = api.getBackupDownloadUrl(backup.fileName);
    window.open(downloadUrl, "_blank");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pt: 8 }}>
      <Navbar user={user} onLogout={onLogout} />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box
          sx={{
            mb: 4,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: "bold" }}>
              Database Backup & Restore
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage database backups, create new backups, or restore from a
              backup.
            </Typography>
          </div>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<BackupIcon />}
              onClick={() => setCreateDialog(true)}
              disabled={loading}
            >
              Create Backup
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchBackups}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Scheduled Backup Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <ScheduleIcon
                    fontSize="large"
                    color="primary"
                    sx={{ mr: 2 }}
                  />
                  <Typography variant="h6">Scheduled Backups</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Configure automatic backups to run on a schedule.
                </Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={scheduledBackupEnabled}
                        onChange={(e) =>
                          handleToggleScheduledBackup(e.target.checked)
                        }
                        disabled={loading}
                      />
                    }
                    label={scheduledBackupEnabled ? "Enabled" : "Disabled"}
                  />
                </FormGroup>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<SettingsIcon />}
                  disabled={loading}
                  onClick={() => setScheduledBackupDialog(true)}
                >
                  Configure Schedule
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* Manual Backup Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <CreateIcon fontSize="large" color="primary" sx={{ mr: 2 }} />
                  <Typography variant="h6">Manual Backup</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Create a backup manually with a custom name.
                </Typography>
                <Typography variant="body2">
                  This will save a complete snapshot of your database.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<BackupIcon />}
                  disabled={loading}
                  onClick={() => setCreateDialog(true)}
                >
                  Create Backup
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* Restore Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <RestoreIcon
                    fontSize="large"
                    color="primary"
                    sx={{ mr: 2 }}
                  />
                  <Typography variant="h6">Restore Database</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Restore the database from a previously created backup.
                </Typography>
                <Typography variant="body2" color="error">
                  Warning: This will replace all current data!
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<RestoreIcon />}
                  disabled={loading || backups.length === 0}
                  onClick={() => {
                    if (backups.length > 0) {
                      setSelectedBackup(backups[0]);
                      setRestoreDialog(true);
                    } else {
                      showSnackbar(
                        "No backups available to restore",
                        "warning"
                      );
                    }
                  }}
                >
                  Restore Backup
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Available Backups
          </Typography>

          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Date Created</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <CircularProgress size={40} />
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        Loading backups...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : backups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <Typography variant="body1">
                        No backups available
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        Create a backup to protect your data
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  backups.map((backup) => (
                    <TableRow key={backup.fileName} hover>
                      <TableCell>{backup.name}</TableCell>
                      <TableCell>{formatDate(backup.date)}</TableCell>
                      <TableCell>{formatFileSize(backup.size)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Download Backup">
                          <IconButton
                            onClick={() => downloadBackup(backup)}
                            disabled={loading}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Restore from Backup">
                          <IconButton
                            onClick={() => {
                              setSelectedBackup(backup);
                              setRestoreDialog(true);
                            }}
                            disabled={loading || isRestoringBackup}
                          >
                            <RestoreIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Backup">
                          <IconButton
                            onClick={() => {
                              setSelectedBackup(backup);
                              setConfirmDelete(true);
                            }}
                            disabled={loading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Container>

      {/* Create Backup Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)}>
        <DialogTitle>Create New Backup</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter a name for this backup to help you identify it later.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Backup Name"
            fullWidth
            variant="outlined"
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
            helperText="Leave blank for auto-generated name"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateBackup} variant="contained">
            Create Backup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Backup Dialog */}
      <Dialog open={restoreDialog} onClose={() => setRestoreDialog(false)}>
        <DialogTitle>Restore Database from Backup</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "error.main", mb: 2 }}>
            WARNING: This will replace your current database with the selected
            backup. All changes made since this backup was created will be lost!
          </DialogContentText>
          {selectedBackup && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1">
                <strong>Backup:</strong> {selectedBackup.name}
              </Typography>
              <Typography variant="body2">
                <strong>Created:</strong> {formatDate(selectedBackup.date)}
              </Typography>
              <Typography variant="body2">
                <strong>Size:</strong> {formatFileSize(selectedBackup.size)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog(false)}>Cancel</Button>
          <Button
            onClick={handleRestoreBackup}
            variant="contained"
            color="error"
          >
            Restore Backup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete Backup</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this backup? This action cannot be
            undone.
          </DialogContentText>
          {selectedBackup && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1">
                <strong>Backup:</strong> {selectedBackup.name}
              </Typography>
              <Typography variant="body2">
                <strong>Created:</strong> {formatDate(selectedBackup.date)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteBackup}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scheduled Backup Dialog */}
      <Dialog
        open={scheduledBackupDialog}
        onClose={() => setScheduledBackupDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Configure Backup Schedule</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Choose how often the system should create automated backups.
          </DialogContentText>

          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend">Schedule Type</FormLabel>
            <RadioGroup
              value={scheduleOption}
              onChange={(e) => setScheduleOption(e.target.value)}
            >
              <FormControlLabel
                value="weekly"
                control={<Radio />}
                label="Weekly (Every Sunday at 1:00 AM)"
              />
              <FormControlLabel
                value="daily"
                control={<Radio />}
                label="Daily (Every day at 1:00 AM)"
              />
              <FormControlLabel
                value="monthly"
                control={<Radio />}
                label="Monthly (1st day of each month at 1:00 AM)"
              />
              <FormControlLabel
                value="custom"
                control={<Radio />}
                label="Custom (Advanced)"
              />
            </RadioGroup>
          </FormControl>

          {scheduleOption === "custom" && (
            <TextField
              margin="dense"
              label="Cron Expression"
              fullWidth
              variant="outlined"
              value={customSchedule}
              onChange={(e) => setCustomSchedule(e.target.value)}
              helperText="For advanced users: Enter a valid cron expression (e.g., '0 1 * * 0' for weekly)"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduledBackupDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveSchedule} variant="contained">
            Save Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Blocking restore dialog */}
      {isRestoringBackup && (
        <Dialog open={true} disableEscapeKeyDown>
          <DialogContent sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Restoring Database
            </Typography>
            <Typography variant="body1">
              Please wait while the database is being restored...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              The application will restart automatically once complete.
            </Typography>
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};

export default BackupPage;
