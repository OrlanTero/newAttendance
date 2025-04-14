import React, { useState, useEffect, useRef } from "react";
import * as api from "../utils/api";
import Navbar from "../components/Navbar";
import { PDFExport } from "@progress/kendo-react-pdf";
import "../utils/kendoLicense";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Stack,
  InputAdornment,
  Card,
  CardContent,
} from "@mui/material";
import {
  CalendarMonth,
  Person,
  Description,
  Download,
  Print,
  FilterAlt,
  CheckCircle,
  Cancel,
  AccessTime,
  Event,
  ClearAll as ClearAllIcon,
} from "@mui/icons-material";
import {
  format,
  parseISO,
  differenceInMinutes,
  isWeekend,
  isWithinInterval,
} from "date-fns";

const ReportPage = ({ user, onLogout }) => {
  // References for PDF export
  const pdfExportComponent = useRef(null);

  // State for date range and employee selection
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().setDate(1)), "yyyy-MM-dd")
  ); // First day of current month
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd")); // Today
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Status options for the filter
  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "present", label: "Present" },
    { value: "late", label: "Late" },
    { value: "absent", label: "Absent" },
    { value: "undertime", label: "Undertime" },
  ];

  // State for holidays and report data
  const [holidays, setHolidays] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [reportSummary, setReportSummary] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    undertimeDays: 0,
    totalHoursWorked: 0,
    avgHoursPerDay: 0,
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [excludeHolidays, setExcludeHolidays] = useState(true);

  // Fetch employees and holidays on component mount
  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchHolidays();
  }, []);

  // Generate report when parameters change
  useEffect(() => {
    if (startDate && endDate) {
      generateReport();
    }
  }, [
    startDate,
    endDate,
    selectedEmployeeId,
    selectedDepartmentId,
    selectedStatus,
    excludeWeekends,
    excludeHolidays,
  ]);

  const fetchEmployees = async () => {
    try {
      const result = await api.getEmployees();
      if (result.success) {
        setEmployees(result.data || []);
      } else {
        setError("Failed to fetch employees");
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setError("Failed to fetch employees");
    }
  };

  const fetchDepartments = async () => {
    try {
      const result = await api.getDepartments();
      console.log("Department data received:", result);
      if (Array.isArray(result)) {
        setDepartments(result);
      } else {
        console.error("Unexpected department data format:", result);
        setError("Failed to fetch departments");
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      setError("Failed to fetch departments");
    }
  };

  const fetchHolidays = async () => {
    try {
      const result = await api.getHolidays();
      setHolidays(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      setError("Failed to fetch holidays");
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("Generating report with filters:", {
        startDate,
        endDate,
        employeeId: selectedEmployeeId || null,
        status: selectedStatus || null,
        departmentId: selectedDepartmentId || null,
      });

      // Use the API function for reports
      const reportResult = await api.getAttendanceReport(
        startDate,
        endDate,
        selectedEmployeeId || null,
        selectedStatus || null,
        selectedDepartmentId || null
      );

      console.log("Report API response:", reportResult);

      if (reportResult.success) {
        let records = reportResult.data || [];
        console.log(`Retrieved ${records.length} records before filtering`);

        // Filter out weekends if selected
        if (excludeWeekends) {
          records = records.filter((record) => {
            const date = new Date(record.date);
            return !isWeekend(date);
          });
          console.log(`${records.length} records after weekend filtering`);
        }

        // Filter out holidays if selected
        if (excludeHolidays && holidays.length > 0) {
          records = records.filter((record) => {
            return !holidays.some((holiday) => holiday.date === record.date);
          });
          console.log(`${records.length} records after holiday filtering`);
        }

        // Process data to calculate hours worked
        const processedRecords = records.map((record) => {
          let hoursWorked = 0;
          if (record.check_in && record.check_out) {
            const checkInTime = new Date(record.check_in);
            const checkOutTime = new Date(record.check_out);
            const minutesWorked = differenceInMinutes(
              checkOutTime,
              checkInTime
            );
            hoursWorked = Math.round((minutesWorked / 60) * 100) / 100; // Round to 2 decimal places
          }

          return {
            ...record,
            hoursWorked,
          };
        });

        // Calculate summary statistics
        const totalHoursWorked = processedRecords.reduce(
          (sum, record) => sum + record.hoursWorked,
          0
        );
        const presentDays = processedRecords.filter(
          (r) => r.check_in && r.check_out && r.status === "present"
        ).length;
        const lateDays = processedRecords.filter(
          (r) => r.status === "late"
        ).length;
        const undertimeDays = processedRecords.filter(
          (r) => r.status === "undertime"
        ).length;
        const workingDays = getWorkingDaysInRange(
          startDate,
          endDate,
          excludeWeekends,
          excludeHolidays ? holidays : []
        );

        setAttendanceData(processedRecords);
        setReportSummary({
          totalDays: workingDays,
          presentDays,
          absentDays: workingDays - presentDays - lateDays - undertimeDays,
          lateDays,
          undertimeDays,
          totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
          avgHoursPerDay:
            presentDays > 0
              ? Math.round((totalHoursWorked / presentDays) * 100) / 100
              : 0,
        });
      } else {
        console.error("API error in report generation:", reportResult);
        setError(
          "Failed to fetch attendance data: " +
            (reportResult.message || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Error generating report:", error);
      setError("Failed to generate report: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to count working days in a date range
  const getWorkingDaysInRange = (start, end, excludeWeekends, holidays) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    let count = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Skip weekends if excludeWeekends is true
      if (excludeWeekends && isWeekend(currentDate)) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Skip holidays if any
      const isHoliday = holidays.some((holiday) => {
        const holidayDate = new Date(holiday.date);
        return (
          holidayDate.getDate() === currentDate.getDate() &&
          holidayDate.getMonth() === currentDate.getMonth() &&
          holidayDate.getFullYear() === currentDate.getFullYear()
        );
      });

      if (isHoliday) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      count++;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
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
        return "#4caf50";
      case "late":
        return "#ff9800";
      case "absent":
        return "#f44336";
      case "undertime":
        return "#9c27b0";
      default:
        return "#9e9e9e";
    }
  };

  const handleExportPDF = () => {
    if (pdfExportComponent.current) {
      pdfExportComponent.current.save();
    }
  };

  const handleClearFilters = () => {
    setStartDate(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
    setSelectedEmployeeId("");
    setSelectedDepartmentId("");
    setSelectedStatus("");
    setExcludeWeekends(true);
    setExcludeHolidays(true);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <Navbar user={user} onLogout={onLogout} title="Attendance Reports" />

      <Container
        maxWidth="xl"
        sx={{ mt: 4, mb: 4, flexGrow: 1, overflow: "auto" }}
      >
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Generate Attendance Report
          </Typography>

          {/* Report Filters */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={12}>
              <Typography variant="subtitle1" gutterBottom>
                Filter Options
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonth />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonth />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="employee-select-label">Employee</InputLabel>
                <Select
                  labelId="employee-select-label"
                  id="employee-select"
                  value={selectedEmployeeId}
                  label="Employee"
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <Person />
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

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="department-select-label">Department</InputLabel>
                <Select
                  labelId="department-select-label"
                  id="department-select"
                  value={selectedDepartmentId}
                  label="Department"
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <Description />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map((department) => (
                    <MenuItem
                      key={department.department_id}
                      value={department.department_id}
                    >
                      {department.name || department.department_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="status-select-label">Status</InputLabel>
                <Select
                  labelId="status-select-label"
                  id="status-select"
                  value={selectedStatus}
                  label="Status"
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <CheckCircle />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={handleExportPDF}
                  startIcon={<Download />}
                  sx={{ flex: 1 }}
                >
                  Export PDF
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => window.print()}
                  startIcon={<Print />}
                >
                  Print
                </Button>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={generateReport}
                startIcon={<FilterAlt />}
              >
                Generate Report
              </Button>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleClearFilters}
                startIcon={<ClearAllIcon />}
              >
                Clear Filters
              </Button>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Stack direction="row" spacing={2}>
                <Button
                  variant={excludeWeekends ? "contained" : "outlined"}
                  color={excludeWeekends ? "primary" : "inherit"}
                  onClick={() => setExcludeWeekends(!excludeWeekends)}
                  startIcon={<Event />}
                >
                  {excludeWeekends ? "Excluding Weekends" : "Include Weekends"}
                </Button>
                <Button
                  variant={excludeHolidays ? "contained" : "outlined"}
                  color={excludeHolidays ? "primary" : "inherit"}
                  onClick={() => setExcludeHolidays(!excludeHolidays)}
                  startIcon={<Event />}
                >
                  {excludeHolidays ? "Excluding Holidays" : "Include Holidays"}
                </Button>
              </Stack>
            </Grid>
          </Grid>

          {/* Error message */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Loading indicator */}
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Report Preview */}
          <Box
            id="report-container"
            sx={{
              mb: 3,
              p: 3,
              bgcolor: "white",
              "@media print": {
                p: 0,
                m: 0,
                boxShadow: "none",
              },
            }}
          >
            <PDFExport
              ref={pdfExportComponent}
              paperSize="A4"
              margin={{ top: 20, left: 20, right: 20, bottom: 20 }}
              fileName={`Attendance_Report_${startDate}_to_${endDate}.pdf`}
              author="Attendance System"
              scale={0.7}
            >
              {/* Report Header */}
              <Box sx={{ mb: 4, textAlign: "center" }}>
                <Typography variant="h5" gutterBottom>
                  Attendance Report
                </Typography>
                <Typography variant="subtitle1">
                  Period: {formatDate(startDate)} to {formatDate(endDate)}
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 1,
                  }}
                >
                  {selectedEmployeeId ? (
                    <span>
                      Employee:{" "}
                      {employees.find(
                        (e) => e.employee_id === parseInt(selectedEmployeeId)
                      )?.display_name || "Selected Employee"}
                    </span>
                  ) : (
                    <span>All Employees</span>
                  )}

                  {selectedDepartmentId && (
                    <span>
                      | Department:{" "}
                      {departments.find(
                        (d) =>
                          d.department_id === parseInt(selectedDepartmentId)
                      )?.name ||
                        departments.find(
                          (d) =>
                            d.department_id === parseInt(selectedDepartmentId)
                        )?.department_name ||
                        "Selected Department"}
                    </span>
                  )}

                  {selectedStatus && (
                    <span>
                      | Status:{" "}
                      {statusOptions.find((s) => s.value === selectedStatus)
                        ?.label || selectedStatus}
                    </span>
                  )}
                </Typography>
              </Box>

              {/* Report Summary */}
              <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={2}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography color="textSecondary" gutterBottom>
                        Working Days
                      </Typography>
                      <Typography variant="h4">
                        {reportSummary.totalDays}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography color="textSecondary" gutterBottom>
                        Present
                      </Typography>
                      <Typography variant="h4" sx={{ color: "#4caf50" }}>
                        {reportSummary.presentDays}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography color="textSecondary" gutterBottom>
                        Absent
                      </Typography>
                      <Typography variant="h4" sx={{ color: "#f44336" }}>
                        {reportSummary.absentDays}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography color="textSecondary" gutterBottom>
                        Late
                      </Typography>
                      <Typography variant="h4" sx={{ color: "#ff9800" }}>
                        {reportSummary.lateDays}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography color="textSecondary" gutterBottom>
                        Under Time
                      </Typography>
                      <Typography variant="h4" sx={{ color: "#9c27b0" }}>
                        {reportSummary.undertimeDays}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography color="textSecondary" gutterBottom>
                        Total Hours
                      </Typography>
                      <Typography variant="h4">
                        {reportSummary.totalHoursWorked}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={12}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography color="textSecondary" gutterBottom>
                        Avg Hours/Day
                      </Typography>
                      <Typography variant="h4">
                        {reportSummary.avgHoursPerDay}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Report Data Table */}
              <Typography variant="h6" gutterBottom>
                Detailed Attendance Records
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      {!selectedEmployeeId && <TableCell>Employee</TableCell>}
                      {!selectedEmployeeId && <TableCell>Department</TableCell>}
                      <TableCell>Check In</TableCell>
                      <TableCell>Check Out</TableCell>
                      <TableCell>Hours Worked</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendanceData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={selectedEmployeeId ? 6 : 8}
                          align="center"
                        >
                          No attendance records found for the selected period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendanceData.map((record) => (
                        <TableRow key={record.attendance_id}>
                          <TableCell>{formatDate(record.date)}</TableCell>
                          {!selectedEmployeeId && (
                            <TableCell>{record.display_name}</TableCell>
                          )}
                          {!selectedEmployeeId && (
                            <TableCell>
                              {record.department_name || "—"}
                            </TableCell>
                          )}
                          <TableCell>{formatTime(record.check_in)}</TableCell>
                          <TableCell>{formatTime(record.check_out)}</TableCell>
                          <TableCell>{record.hoursWorked.toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip
                              label={record.status}
                              size="small"
                              sx={{
                                backgroundColor: getStatusColor(record.status),
                                color: "white",
                                fontWeight: "bold",
                              }}
                            />
                          </TableCell>
                          <TableCell>{record.remarks || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </PDFExport>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ReportPage;
