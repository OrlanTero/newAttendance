import React, { useState, useEffect } from "react";
import * as api from "../utils/api";
import Navbar from "../components/Navbar";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Tab,
  Tabs,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ClearAll as ClearAllIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  AccessTime as AccessTimeIcon,
  EventBusy as EventBusyIcon,
  AddCircle as AddCircleIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  HourglassBottom as HourglassBottomIcon,
} from "@mui/icons-material";
import {
  format,
  parseISO,
  differenceInHours,
  differenceInMinutes,
} from "date-fns";

const AttendancePage = ({ user, onLogout }) => {
  // States for attendance data and UI
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // States for filters
  const [dateFilter, setDateFilter] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [employees, setEmployees] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedStatus, setEditedStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [manualAttendanceData, setManualAttendanceData] = useState({
    employee_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    check_in: "",
    check_out: "",
    status: "present",
    remarks: "",
  });
  const [currentTab, setCurrentTab] = useState(0);

  const statuses = [
    { value: "", label: "All" },
    { value: "present", label: "Present" },
    { value: "late", label: "Late" },
    { value: "absent", label: "Absent" },
    { value: "undertime", label: "Undertime" },
  ];

  const statusOptions = [
    { value: "present", label: "Present" },
    { value: "late", label: "Late" },
    { value: "absent", label: "Absent" },
    { value: "undertime", label: "Undertime" },
  ];

  const tabs = [
    { label: "Status Issues", value: "" },
    { label: "Late", value: "late" },
    { label: "Undertime", value: "undertime" },
    { label: "Absent", value: "absent" },
    { label: "Present", value: "present" },
  ];

  // Fetch attendance records with filters and pagination
  useEffect(() => {
    fetchAttendanceRecords();
  }, [page, rowsPerPage, dateFilter, employeeFilter, statusFilter, currentTab]);

  // Fetch employees for filter dropdown
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const result = await api.getEmployees();
      if (result.success) {
        setEmployees(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      setError("");

      // Format date for API call - dateFilter is already in YYYY-MM-DD format
      const formattedDate = dateFilter;

      // Build query parameters
      const params = new URLSearchParams();
      if (formattedDate) params.append("date", formattedDate);
      if (employeeFilter) params.append("employeeId", employeeFilter);

      // Use tab-based status filter if a tab is selected
      const effectiveStatusFilter =
        currentTab > 0 ? tabs[currentTab].value : statusFilter;

      // Handle the "All Status Issues" case (exclude present if no specific status selected)
      if (effectiveStatusFilter === "" && currentTab === 0) {
        // For the "All Status Issues" tab/filter, exclude present records
        params.append("excludeStatus", "present");
      } else if (effectiveStatusFilter) {
        // For specific status filters
        params.append("status", effectiveStatusFilter);
      }

      params.append("page", page + 1); // API uses 1-based indexing
      params.append("limit", rowsPerPage);

      // Make API call
      const endpoint = `/attendance?${params.toString()}`;
      const result = await api.fetchAttendanceWithPagination(endpoint);

      if (result.success) {
        setAttendanceRecords(result.data || []);
        setTotalRecords(result.total || 0);
      } else {
        setError("Failed to fetch attendance records");
      }
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      setError("Failed to fetch attendance records");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDateChange = (event) => {
    setDateFilter(event.target.value);
    setPage(0);
  };

  const handleEmployeeChange = (event) => {
    setEmployeeFilter(event.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleTabChange = (event, newTab) => {
    setCurrentTab(newTab);
    // Reset manual filter when changing tabs
    setStatusFilter("");
    setPage(0);
  };

  const handleClearFilters = () => {
    setDateFilter(format(new Date(), "yyyy-MM-dd"));
    setEmployeeFilter("");
    setStatusFilter("");
    setCurrentTab(0);
    setPage(0);
  };

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setEditedStatus(record.status || "");
    setRemarks(record.remarks || "");
    setEditMode(false);
    setOpenDetailDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDetailDialog(false);
    setEditMode(false);
  };

  const handleOpenAddDialog = () => {
    // Reset manual attendance form
    setManualAttendanceData({
      employee_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      check_in: "",
      check_out: "",
      status: "present",
      remarks: "",
    });
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
    // Reset form values when entering edit mode
    if (!editMode) {
      setEditedStatus(selectedRecord.status || "");
      setRemarks(selectedRecord.remarks || "");
    }
  };

  const handleEditStatusChange = (event) => {
    setEditedStatus(event.target.value);
  };

  const handleRemarksChange = (event) => {
    setRemarks(event.target.value);
  };

  const handleSaveChanges = async () => {
    try {
      // Validate if check-in time exists before updating
      if (!selectedRecord.check_in) {
        setError("Cannot update record without check-in time");
        return;
      }

      const updatedRecord = {
        status: editedStatus,
        remarks: remarks,
      };

      const result = await api.updateAttendance(
        selectedRecord.attendance_id,
        updatedRecord
      );

      if (result.success) {
        // Update local state
        setSelectedRecord({
          ...selectedRecord,
          status: editedStatus,
          remarks: remarks,
        });

        // Refresh the attendance list
        fetchAttendanceRecords();

        // Exit edit mode
        setEditMode(false);
      } else {
        setError("Failed to update record: " + result.message);
      }
    } catch (error) {
      console.error("Error updating record:", error);
      setError("Failed to update record");
    }
  };

  const handleManualInputChange = (field) => (event) => {
    setManualAttendanceData({
      ...manualAttendanceData,
      [field]: event.target.value,
    });
  };

  const handleSubmitManualAttendance = async () => {
    try {
      // Validate required fields
      if (!manualAttendanceData.employee_id || !manualAttendanceData.date) {
        setError("Employee and date are required fields");
        return;
      }

      // API call to create manual attendance
      const result = await api.createManualAttendance(manualAttendanceData);

      if (result.success) {
        // Close dialog and refresh data
        setOpenAddDialog(false);
        fetchAttendanceRecords();
      } else {
        setError("Failed to create manual attendance: " + result.message);
      }
    } catch (error) {
      console.error("Error creating manual attendance:", error);
      setError("Failed to create manual attendance");
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "—";
    try {
      return format(parseISO(timeString), "hh:mm a");
    } catch (e) {
      return timeString;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return format(parseISO(dateString), "MMM dd, yyyy");
    } catch (e) {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "present":
        return "#4caf50"; // Green
      case "late":
        return "#ff9800"; // Orange
      case "absent":
        return "#f44336"; // Red
      case "undertime":
        return "#9c27b0"; // Purple
      default:
        return "#9e9e9e"; // Grey
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "present":
        return <CheckIcon fontSize="small" />;
      case "late":
        return <AccessTimeIcon fontSize="small" />;
      case "absent":
        return <EventBusyIcon fontSize="small" />;
      case "undertime":
        return <HourglassBottomIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const calculateHoursWorked = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "N/A";

    try {
      const checkInTime = new Date(checkIn);
      const checkOutTime = new Date(checkOut);

      const minutes = differenceInMinutes(checkOutTime, checkInTime);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      return `${hours}h ${remainingMinutes}m`;
    } catch (e) {
      return "Error";
    }
  };

  // Check if a record meets the 4-hour rule
  const meetsMinimumHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return false;

    try {
      const checkInTime = new Date(checkIn);
      const checkOutTime = new Date(checkOut);
      const hours = differenceInHours(checkOutTime, checkInTime);

      return hours >= 4;
    } catch (e) {
      return false;
    }
  };

  // Is Admin check
  const isAdmin = user?.role === "admin";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pt: 8 }}>
      <Navbar user={user} onLogout={onLogout} />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: "bold" }}>
            Attendance Records
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View, filter, and manage employee attendance records.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ mb: 4, p: 2, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2.5}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={dateFilter}
                onChange={handleDateChange}
                InputLabelProps={{ shrink: true }}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Employee</InputLabel>
                <Select
                  value={employeeFilter}
                  onChange={handleEmployeeChange}
                  label="Employee"
                  startAdornment={
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="">All Employees</MenuItem>
                  {employees.map((employee) => (
                    <MenuItem
                      key={employee.employee_id}
                      value={employee.employee_id}
                    >
                      {employee.display_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  label="Status"
                  disabled={currentTab > 0}
                  startAdornment={
                    <InputAdornment position="start">
                      <FilterListIcon fontSize="small" />
                    </InputAdornment>
                  }
                >
                  {statuses.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={1.75}>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                onClick={handleClearFilters}
                startIcon={<ClearAllIcon />}
              >
                Clear
              </Button>
            </Grid>
            <Grid item xs={6} md={1.75}>
              {isAdmin && (
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleOpenAddDialog}
                  startIcon={<AddCircleIcon />}
                >
                  Manual Log
                </Button>
              )}
            </Grid>
          </Grid>

          <Box sx={{ borderBottom: 1, borderColor: "divider", mt: 2 }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
            >
              {tabs.map((tab, index) => (
                <Tab key={index} label={tab.label} />
              ))}
            </Tabs>
          </Box>
        </Paper>

        <Paper sx={{ mb: 4, overflow: "hidden", borderRadius: 2 }}>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                py: 4,
              }}
            >
              <CircularProgress />
            </Box>
          ) : attendanceRecords.length === 0 ? (
            <Box
              sx={{
                py: 4,
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              <Typography variant="h6">No records found</Typography>
              <Typography variant="body2">
                Try adjusting your filters or date range
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: "60vh", overflowY: "auto" }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Check In</TableCell>
                      <TableCell>Check Out</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Hours Worked</TableCell>
                      <TableCell>Remarks</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record.attendance_id}>
                        <TableCell>{record.unique_id || "N/A"}</TableCell>
                        <TableCell>{record.display_name}</TableCell>
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell>{formatTime(record.check_in)}</TableCell>
                        <TableCell>{formatTime(record.check_out)}</TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(record.status)}
                            label={record.status}
                            size="small"
                            sx={{
                              backgroundColor: getStatusColor(record.status),
                              color: "white",
                              fontWeight: "bold",
                              textTransform: "uppercase",
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {calculateHoursWorked(
                            record.check_in,
                            record.check_out
                          )}
                          {record.check_in &&
                            record.check_out &&
                            !meetsMinimumHours(
                              record.check_in,
                              record.check_out
                            ) && (
                              <Tooltip title="Less than 4 hours worked">
                                <IconButton size="small" color="warning">
                                  <WarningIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                        </TableCell>
                        <TableCell>{record.remarks || "—"}</TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(record);
                              }}
                            >
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={totalRecords}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </Paper>

        {/* Detail Dialog */}
        <Dialog
          open={openDetailDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Attendance Details
            <IconButton
              aria-label="close"
              onClick={handleCloseDialog}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
            {isAdmin && (
              <IconButton
                aria-label="edit"
                onClick={handleEditToggle}
                sx={{ position: "absolute", right: 48, top: 8 }}
                color={editMode ? "secondary" : "primary"}
              >
                {editMode ? <CloseIcon /> : <EditIcon />}
              </IconButton>
            )}
          </DialogTitle>
          <DialogContent dividers>
            {selectedRecord && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    {selectedRecord.display_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Employee ID: {selectedRecord.unique_id}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Date
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatDate(selectedRecord.date)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  {editMode ? (
                    <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                      <Select
                        value={editedStatus}
                        onChange={handleEditStatusChange}
                      >
                        {statusOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <Chip
                      label={selectedRecord.status}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(selectedRecord.status),
                        color: "white",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                    />
                  )}
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Check In Time
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatTime(selectedRecord.check_in)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Check Out Time
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatTime(selectedRecord.check_out) ||
                      "Not checked out yet"}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Hours Worked
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedRecord.check_in && selectedRecord.check_out
                      ? calculateHoursWorked(
                          selectedRecord.check_in,
                          selectedRecord.check_out
                        )
                      : "N/A"}
                    {selectedRecord.check_in &&
                      selectedRecord.check_out &&
                      !meetsMinimumHours(
                        selectedRecord.check_in,
                        selectedRecord.check_out
                      ) && (
                        <Chip
                          label="Below 4 hours"
                          size="small"
                          color="warning"
                          sx={{ ml: 1 }}
                        />
                      )}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Remarks
                  </Typography>
                  {editMode ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={remarks}
                      onChange={handleRemarksChange}
                      placeholder="Add remarks here..."
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  ) : (
                    <Typography variant="body1" gutterBottom>
                      {selectedRecord.remarks || "No remarks"}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            )}
          </DialogContent>
          {editMode && (
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveChanges}
              >
                Save Changes
              </Button>
            </DialogActions>
          )}
        </Dialog>

        {/* Manual Attendance Dialog */}
        <Dialog
          open={openAddDialog}
          onClose={handleCloseAddDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Add Manual Attendance Log
            <IconButton
              aria-label="close"
              onClick={handleCloseAddDialog}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Employee</InputLabel>
                  <Select
                    value={manualAttendanceData.employee_id}
                    onChange={handleManualInputChange("employee_id")}
                    label="Employee"
                  >
                    <MenuItem value="">Select Employee</MenuItem>
                    {employees.map((employee) => (
                      <MenuItem
                        key={employee.employee_id}
                        value={employee.employee_id}
                      >
                        {employee.display_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date"
                  type="date"
                  value={manualAttendanceData.date}
                  onChange={handleManualInputChange("date")}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={manualAttendanceData.status}
                    onChange={handleManualInputChange("status")}
                    label="Status"
                  >
                    {statusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Check In Time"
                  type="time"
                  value={manualAttendanceData.check_in}
                  onChange={handleManualInputChange("check_in")}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Check Out Time"
                  type="time"
                  value={manualAttendanceData.check_out}
                  onChange={handleManualInputChange("check_out")}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Remarks"
                  multiline
                  rows={3}
                  value={manualAttendanceData.remarks}
                  onChange={handleManualInputChange("remarks")}
                  placeholder="Add remarks here..."
                  size="small"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAddDialog}>Cancel</Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmitManualAttendance}
            >
              Save Attendance
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AttendancePage;
