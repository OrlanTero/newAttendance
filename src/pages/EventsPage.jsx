import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import * as api from "../utils/api";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Add as AddIcon,
  Event as EventIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth,
  LocationOn,
  Person,
  MoreVert,
  ArrowBack,
  EventNote,
  DateRange,
  Description,
} from "@mui/icons-material";
import { format, parseISO, formatDistance } from "date-fns";
import { useNavigate } from "react-router-dom";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

const EventsPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("add"); // "add" or "edit"
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    start_date: new Date(),
    end_date: null,
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const eventsData = await api.getEvents();
      if (Array.isArray(eventsData)) {
        setEvents(eventsData);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      setSnackbar({
        open: true,
        message: "Failed to load events",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode = "add", event = null) => {
    setDialogMode(mode);
    if (mode === "edit" && event) {
      setSelectedEvent(event);
      setFormData({
        title: event.title,
        description: event.description || "",
        location: event.location || "",
        start_date: new Date(event.start_date),
        end_date: event.end_date ? new Date(event.end_date) : null,
      });
    } else {
      setSelectedEvent(null);
      setFormData({
        title: "",
        description: "",
        location: "",
        start_date: new Date(),
        end_date: null,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleDateChange = (name, newValue) => {
    setFormData({
      ...formData,
      [name]: newValue,
    });
  };

  const handleSubmit = async () => {
    try {
      // Validation
      if (!formData.title.trim()) {
        setSnackbar({
          open: true,
          message: "Event title is required",
          severity: "error",
        });
        return;
      }

      if (!formData.start_date) {
        setSnackbar({
          open: true,
          message: "Start date is required",
          severity: "error",
        });
        return;
      }

      // Format dates for API
      const eventData = {
        ...formData,
        created_by: user.user_id,
        start_date: formData.start_date.toISOString(),
        end_date: formData.end_date ? formData.end_date.toISOString() : null,
      };

      let result;
      if (dialogMode === "add") {
        result = await api.createEvent(eventData);
      } else {
        result = await api.updateEvent(selectedEvent.event_id, eventData);
      }

      if (result && result.success) {
        setSnackbar({
          open: true,
          message: `Event ${
            dialogMode === "add" ? "created" : "updated"
          } successfully`,
          severity: "success",
        });
        fetchEvents();
        handleCloseDialog();
      } else {
        throw new Error(result?.message || "Operation failed");
      }
    } catch (error) {
      console.error("Error submitting event:", error);
      setSnackbar({
        open: true,
        message: `Failed to ${dialogMode} event: ${error.message}`,
        severity: "error",
      });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event?")) {
      return;
    }

    try {
      const result = await api.deleteEvent(eventId);
      if (result && result.success) {
        setSnackbar({
          open: true,
          message: "Event deleted successfully",
          severity: "success",
        });
        fetchEvents();
      } else {
        throw new Error(result?.message || "Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      setSnackbar({
        open: true,
        message: `Failed to delete event: ${error.message}`,
        severity: "error",
      });
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return "Not specified";
    return format(new Date(dateString), "PPP p"); // Format: Apr 29, 2022, 9:30 AM
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pt: 8 }}>
      <Navbar user={user} onLogout={onLogout} />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            mb: 4,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: "bold" }}>
              Event Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create and manage events, important dates, and activities
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog("add")}
          >
            Add New Event
          </Button>
        </Box>

        <Paper sx={{ p: 3, mb: 4 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : events.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <EventIcon
                sx={{ fontSize: 60, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No events found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first event to get started.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog("add")}
              >
                Add Event
              </Button>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Start Date</TableCell>
                      <TableCell>End Date</TableCell>
                      <TableCell>Created By</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events
                      .slice(
                        page * rowsPerPage,
                        page * rowsPerPage + rowsPerPage
                      )
                      .map((event) => (
                        <TableRow key={event.event_id}>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <EventIcon
                                sx={{ mr: 1, color: "primary.main" }}
                              />
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: "medium" }}
                              >
                                {event.title}
                              </Typography>
                            </Box>
                            {event.description && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  mt: 0.5,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {event.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {event.location ? (
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <LocationOn
                                  fontSize="small"
                                  sx={{ mr: 0.5, color: "text.secondary" }}
                                />
                                <Typography variant="body2">
                                  {event.location}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Not specified
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDateDisplay(event.start_date)}
                            </Typography>
                            <Chip
                              size="small"
                              label={formatDistance(
                                new Date(event.start_date),
                                new Date(),
                                {
                                  addSuffix: true,
                                }
                              )}
                              color={
                                new Date(event.start_date) < new Date()
                                  ? "error"
                                  : "primary"
                              }
                              sx={{ mt: 0.5 }}
                            />
                          </TableCell>
                          <TableCell>
                            {event.end_date
                              ? formatDateDisplay(event.end_date)
                              : "Not specified"}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Person
                                fontSize="small"
                                sx={{ mr: 0.5, color: "text.secondary" }}
                              />
                              <Typography variant="body2">
                                {event.creator_name || "Admin"}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton
                                color="primary"
                                onClick={() => handleOpenDialog("edit", event)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                color="error"
                                onClick={() =>
                                  handleDeleteEvent(event.event_id)
                                }
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={events.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </Paper>
      </Container>

      {/* Add/Edit Event Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === "add" ? "Add New Event" : "Edit Event"}
        </DialogTitle>
        <DialogContent dividers>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Event Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  variant="outlined"
                  margin="normal"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  variant="outlined"
                  margin="normal"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  variant="outlined"
                  margin="normal"
                  placeholder="e.g., Conference Room A, Virtual Meeting, etc."
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Start Date & Time"
                  value={formData.start_date}
                  onChange={(newValue) =>
                    handleDateChange("start_date", newValue)
                  }
                  slotProps={{
                    textField: { fullWidth: true, margin: "normal" },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="End Date & Time (Optional)"
                  value={formData.end_date}
                  onChange={(newValue) =>
                    handleDateChange("end_date", newValue)
                  }
                  slotProps={{
                    textField: { fullWidth: true, margin: "normal" },
                  }}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            {dialogMode === "add" ? "Create Event" : "Update Event"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EventsPage;
