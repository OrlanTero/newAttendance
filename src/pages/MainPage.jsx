import React, { useState, useEffect } from "react";
import * as api from "../utils/api";
import Navbar from "../components/Navbar";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut, Line, Pie } from "react-chartjs-2";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Card,
  CardContent,
  CardActions,
  Tab,
  Tabs,
  CircularProgress,
  CardMedia,
  Divider,
} from "@mui/material";
import {
  People as PeopleIcon,
  CheckCircle,
  Cancel,
  AccessTime,
  TrendingUp,
  EventNote as EventNoteIcon,
  Work,
  CalendarMonth,
  Group,
  Business as BusinessIcon,
  Description,
  BarChart,
  DonutLarge,
  ShowChart,
  PieChart,
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  QueryBuilder as QueryBuilderIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
} from "@mui/icons-material";
import { format, subDays, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const MainPage = ({ user, onLogout, onNavigate }) => {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [chartTab, setChartTab] = useState(0);
  const [monthlyData, setMonthlyData] = useState({});
  const [weeklyData, setWeeklyData] = useState({});
  const [deptData, setDeptData] = useState({});
  const [dailyStats, setDailyStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    total: 0,
  });
  const [chartLoading, setChartLoading] = useState(false);
  const [summaryData, setSummaryData] = useState({});
  const [lineData, setLineData] = useState({
    labels: ["No Data"],
    datasets: [
      {
        label: "Present",
        data: [0],
        borderColor: "#4caf50",
        tension: 0.4,
        fill: false,
      },
      {
        label: "Late",
        data: [0],
        borderColor: "#ff9800",
        tension: 0.4,
        fill: false,
      },
      {
        label: "Absent",
        data: [0],
        borderColor: "#f44336",
        tension: 0.4,
        fill: false,
      },
    ],
  });

  const theme = useTheme();

  useEffect(() => {
    // Check API connection and fetch users if available
    const checkApiAndFetchUsers = async () => {
      try {
        setIsLoading(true);
        const connectionResult = await api.testConnection();
        setApiAvailable(connectionResult.success);

        if (connectionResult.success) {
          const usersResult = await api.getUsers();
          if (usersResult.success && usersResult.data) {
            setUsers(usersResult.data);
          }

          // Fetch employees
          try {
            const employeesResult = await api.getEmployees();
            if (Array.isArray(employeesResult)) {
              setEmployees(employeesResult);
            } else if (employeesResult && Array.isArray(employeesResult.data)) {
              setEmployees(employeesResult.data);
            }
          } catch (error) {
            console.error("Error fetching employees:", error);
          }

          // Fetch departments
          const deptsResult = await api.getDepartments();
          setDepartments(deptsResult);

          // Fetch attendance data
          await fetchAttendanceData();
        }
      } catch (error) {
        console.error("API error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkApiAndFetchUsers();
  }, []);

  // Fetch attendance data for the last 7 days
  const fetchWeeklyAttendanceData = async () => {
    try {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 6); // Get data for the last 7 days

      const endDateStr = today.toISOString().split("T")[0];
      const startDateStr = startDate.toISOString().split("T")[0];

      console.log(
        `Fetching attendance data from ${startDateStr} to ${endDateStr}`
      );

      const result = await api.getAttendanceByDateRange(
        startDateStr,
        endDateStr
      );

      if (result && Array.isArray(result.data)) {
        // Process the attendance data for the line chart
        processAttendanceData(result.data);
      } else {
        console.error("Failed to get attendance data for line chart", result);
        // Set empty data for the line chart
        processAttendanceData([]);
      }
    } catch (error) {
      console.error("Error fetching weekly attendance data:", error);
      processAttendanceData([]);
    }
  };

  // Update the fetchAttendanceData function to include weekly data
  const fetchAttendanceData = async () => {
    try {
      setChartLoading(true);
      // Get today's date
      const today = new Date();
      const todayDate = today.toISOString().split("T")[0];

      // Fetch today's data
      const todayResult = await api.getAttendanceByDate(todayDate);
      let todayData = [];
      if (todayResult && Array.isArray(todayResult.data)) {
        todayData = todayResult.data;
      }

      // Process current day stats
      processCurrentDayStats(todayData);

      // Fetch monthly data
      const currentMonth = (today.getMonth() + 1).toString().padStart(2, "0");
      const currentYear = today.getFullYear();
      const monthlyResult = await api.getAttendanceByMonth(
        currentYear,
        currentMonth
      );

      // Process department data from monthly attendance
      processDepartmentData(monthlyResult.data || []);

      // Fetch and process weekly attendance data for the line chart
      await fetchWeeklyAttendanceData();

      setChartLoading(false);
    } catch (error) {
      console.error("Error fetching attendance data for charts:", error);
      setChartLoading(false);
    }
  };

  // Process today's stats
  const processCurrentDayStats = (data) => {
    if (!Array.isArray(data)) {
      setDailyStats({
        present: 0,
        late: 0,
        absent: 0,
        total: 0,
      });
      return;
    }

    const present = data.filter((record) => record.status === "present").length;
    const late = data.filter((record) => record.status === "late").length;
    const absent = data.filter((record) => record.status === "absent").length;
    const total = present + late + absent;

    setDailyStats({
      present,
      late,
      absent,
      total,
    });
  };

  // Process monthly data for the trend chart
  const processMonthlyData = (data) => {
    if (!Array.isArray(data)) return;

    // Group by date
    const groupedByDate = data.reduce((acc, record) => {
      const date = record.date.split("T")[0];
      if (!acc[date]) {
        acc[date] = { present: 0, late: 0, absent: 0, total: 0 };
      }

      if (record.status === "present") acc[date].present++;
      else if (record.status === "late") acc[date].late++;
      else acc[date].absent++;

      acc[date].total++;
      return acc;
    }, {});

    // Convert to format for chart
    const sortedDates = Object.keys(groupedByDate).sort();

    const chartData = {
      labels: sortedDates.map((date) => format(parseISO(date), "MMM dd")),
      datasets: [
        {
          label: "Present",
          data: sortedDates.map((date) => groupedByDate[date].present),
          borderColor: "#4caf50",
          backgroundColor: "rgba(76, 175, 80, 0.5)",
          tension: 0.3,
        },
        {
          label: "Late",
          data: sortedDates.map((date) => groupedByDate[date].late),
          borderColor: "#ff9800",
          backgroundColor: "rgba(255, 152, 0, 0.5)",
          tension: 0.3,
        },
        {
          label: "Absent",
          data: sortedDates.map((date) => groupedByDate[date].absent),
          borderColor: "#f44336",
          backgroundColor: "rgba(244, 67, 54, 0.5)",
          tension: 0.3,
        },
      ],
    };

    setMonthlyData(chartData);
  };

  // Process weekly data for the bar chart
  const processWeeklyData = (data) => {
    if (!Array.isArray(data)) return;

    // Get last 7 days
    const today = new Date();
    const last7Days = Array(7)
      .fill()
      .map((_, i) => {
        const date = subDays(today, 6 - i);
        return format(date, "yyyy-MM-dd");
      });

    // Initialize counts for each day
    const dailyCounts = last7Days.reduce((acc, date) => {
      acc[date] = { present: 0, late: 0, absent: 0 };
      return acc;
    }, {});

    // Fill in actual data
    data.forEach((record) => {
      const recordDate = record.date.split("T")[0];
      if (dailyCounts[recordDate]) {
        if (record.status === "present") dailyCounts[recordDate].present++;
        else if (record.status === "late") dailyCounts[recordDate].late++;
        else dailyCounts[recordDate].absent++;
      }
    });

    // Create chart data
    const chartData = {
      labels: last7Days.map((date) => format(parseISO(date), "EEE dd")),
      datasets: [
        {
          label: "Present",
          data: last7Days.map((date) => dailyCounts[date].present),
          backgroundColor: "rgba(76, 175, 80, 0.7)",
        },
        {
          label: "Late",
          data: last7Days.map((date) => dailyCounts[date].late),
          backgroundColor: "rgba(255, 152, 0, 0.7)",
        },
        {
          label: "Absent",
          data: last7Days.map((date) => dailyCounts[date].absent),
          backgroundColor: "rgba(244, 67, 54, 0.7)",
        },
      ],
    };

    setWeeklyData(chartData);
  };

  // Process department data for the doughnut chart
  const processDepartmentData = (data) => {
    if (
      !Array.isArray(data) ||
      !Array.isArray(departments) ||
      departments.length === 0
    ) {
      // Set default empty chart data
      setDeptData({
        labels: ["No Department Data Available"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["#9e9e9e"],
            borderWidth: 1,
          },
        ],
      });
      return;
    }

    // Initialize department counts
    const deptCounts = departments.reduce((acc, dept) => {
      if (dept && dept.name) {
        acc[dept.name] = 0;
      }
      return acc;
    }, {});

    // Add unknown/unassigned department
    deptCounts["Unassigned"] = 0;

    // Get unique employee IDs from attendance data
    const employeeIds = [
      ...new Set(data.map((record) => record.employee_id)),
    ].filter((id) => id);

    // Fetch employee details if we have attendance records
    if (employeeIds.length > 0) {
      Promise.all(employeeIds.map((id) => api.getEmployee(id)))
        .then((employeeResults) => {
          // Create employee to department lookup
          const employeeDeptMap = {};

          employeeResults.forEach((result) => {
            if (result && result.employee_id) {
              employeeDeptMap[result.employee_id] = result.department_id;
            }
          });

          // Count attendance by department
          data.forEach((record) => {
            if (!record.employee_id) {
              deptCounts["Unassigned"]++;
              return;
            }

            const deptId = employeeDeptMap[record.employee_id];
            if (!deptId) {
              deptCounts["Unassigned"]++;
              return;
            }

            // Find department name from id
            const dept = departments.find((d) => d.department_id === deptId);
            if (dept && dept.name) {
              deptCounts[dept.name] = (deptCounts[dept.name] || 0) + 1;
            } else {
              deptCounts["Unassigned"]++;
            }
          });

          // Remove departments with no attendance records
          Object.keys(deptCounts).forEach((key) => {
            if (deptCounts[key] === 0) {
              delete deptCounts[key];
            }
          });

          // Generate colors
          const backgroundColors = [
            "#4caf50",
            "#2196f3",
            "#9c27b0",
            "#ff9800",
            "#f44336",
            "#009688",
            "#673ab7",
            "#3f51b5",
            "#e91e63",
            "#ffc107",
            "#795548",
            "#607d8b",
          ];

          // Create chart data
          const chartData = {
            labels: Object.keys(deptCounts),
            datasets: [
              {
                data: Object.values(deptCounts),
                backgroundColor: backgroundColors.slice(
                  0,
                  Object.keys(deptCounts).length
                ),
                borderWidth: 1,
              },
            ],
          };

          setDeptData(chartData);
        })
        .catch((error) => {
          console.error("Error processing department data:", error);
          // Fallback to a simple dataset
          setDeptData({
            labels: ["No Department Data Available"],
            datasets: [
              {
                data: [1],
                backgroundColor: ["#9e9e9e"],
                borderWidth: 1,
              },
            ],
          });
        });
    } else {
      // No employee data to process
      setDeptData({
        labels: ["No Attendance Data"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["#9e9e9e"],
            borderWidth: 1,
          },
        ],
      });
    }
  };

  // Process attendance data for overall summary pie chart
  const processSummaryData = (data) => {
    if (!Array.isArray(data)) return;

    // Count by status
    const statusCounts = {
      present: 0,
      late: 0,
      absent: 0,
      other: 0,
    };

    data.forEach((record) => {
      if (record.status === "present") statusCounts.present++;
      else if (record.status === "late") statusCounts.late++;
      else if (record.status === "absent") statusCounts.absent++;
      else statusCounts.other++;
    });

    // Create chart data
    const chartData = {
      labels: ["Present", "Late", "Absent", "Other"],
      datasets: [
        {
          data: [
            statusCounts.present,
            statusCounts.late,
            statusCounts.absent,
            statusCounts.other > 0 ? statusCounts.other : 0, // Only include if there are entries
          ],
          backgroundColor: [
            "rgba(76, 175, 80, 0.8)",
            "rgba(255, 152, 0, 0.8)",
            "rgba(244, 67, 54, 0.8)",
            "rgba(158, 158, 158, 0.8)",
          ],
          borderColor: [
            "rgb(76, 175, 80)",
            "rgb(255, 152, 0)",
            "rgb(244, 67, 54)",
            "rgb(158, 158, 158)",
          ],
          borderWidth: 1,
        },
      ],
    };

    // Remove "Other" if count is 0
    if (statusCounts.other === 0) {
      chartData.labels.pop();
      chartData.datasets[0].data.pop();
      chartData.datasets[0].backgroundColor.pop();
      chartData.datasets[0].borderColor.pop();
    }

    setSummaryData(chartData);
  };

  // Process attendance data for the line chart
  const processAttendanceData = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      // Set default empty chart data
      setLineData({
        labels: ["No Data"],
        datasets: [
          {
            label: "Present",
            data: [0],
            borderColor: "#4caf50",
            tension: 0.4,
            fill: false,
          },
          {
            label: "Late",
            data: [0],
            borderColor: "#ff9800",
            tension: 0.4,
            fill: false,
          },
          {
            label: "Absent",
            data: [0],
            borderColor: "#f44336",
            tension: 0.4,
            fill: false,
          },
        ],
      });
      return;
    }

    try {
      // Get the date range for the last 7 days
      const today = new Date();
      const dates = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date.toISOString().split("T")[0]);
      }

      // Initialize counts for each day
      const dailyCounts = dates.reduce((acc, date) => {
        acc[date] = { present: 0, late: 0, absent: 0 };
        return acc;
      }, {});

      // Get the total number of expected employees each day
      const totalEmployeesPerDay = employees.length || 0;

      // Process attendance data
      data.forEach((record) => {
        const recordDate = record.date
          ? new Date(record.date).toISOString().split("T")[0]
          : null;

        // Skip records outside our date range
        if (!recordDate || !dailyCounts[recordDate]) return;

        if (record.status === "present") {
          dailyCounts[recordDate].present++;
        } else if (record.status === "late") {
          dailyCounts[recordDate].late++;
        }
      });

      // Calculate absent as total employees minus present and late
      dates.forEach((date) => {
        const dayCount = dailyCounts[date];
        dayCount.absent = Math.max(
          0,
          totalEmployeesPerDay - dayCount.present - dayCount.late
        );
      });

      // Create the chart data
      const chartData = {
        labels: dates.map((date) => {
          const d = new Date(date);
          return d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
        }),
        datasets: [
          {
            label: "Present",
            data: dates.map((date) => dailyCounts[date].present),
            borderColor: "#4caf50",
            tension: 0.4,
            fill: false,
          },
          {
            label: "Late",
            data: dates.map((date) => dailyCounts[date].late),
            borderColor: "#ff9800",
            tension: 0.4,
            fill: false,
          },
          {
            label: "Absent",
            data: dates.map((date) => dailyCounts[date].absent),
            borderColor: "#f44336",
            tension: 0.4,
            fill: false,
          },
        ],
      };

      setLineData(chartData);
    } catch (error) {
      console.error("Error processing attendance data for line chart:", error);

      // Set fallback chart data
      setLineData({
        labels: ["No Data"],
        datasets: [
          {
            label: "Present",
            data: [0],
            borderColor: "#4caf50",
            tension: 0.4,
            fill: false,
          },
          {
            label: "Late",
            data: [0],
            borderColor: "#ff9800",
            tension: 0.4,
            fill: false,
          },
          {
            label: "Absent",
            data: [0],
            borderColor: "#f44336",
            tension: 0.4,
            fill: false,
          },
        ],
      });
    }
  };

  const handleChartTabChange = (event, newValue) => {
    setChartTab(newValue);
  };

  const stats = [
    {
      title: "Total Employees",
      value: employees.length || 0,
      icon: <PeopleIcon fontSize="large" />,
      color: "#4caf50",
      bgColor: "#e8f5e9",
    },
    {
      title: "Present Today",
      value: dailyStats.present,
      icon: <CheckCircle fontSize="large" />,
      color: "#2196f3",
      bgColor: "#e3f2fd",
    },
    {
      title: "Absent Today",
      value: dailyStats.absent,
      icon: <Cancel fontSize="large" />,
      color: "#f44336",
      bgColor: "#ffebee",
    },
    {
      title: "Late Today",
      value: dailyStats.late,
      icon: <AccessTime fontSize="large" />,
      color: "#ff9800",
      bgColor: "#fff3e0",
    },
  ];

  const navigationCards = [
    {
      title: "Employee Management",
      description: "Add, edit, or remove employees from the system",
      icon: <PeopleIcon fontSize="large" color="primary" />,
      action: () => onNavigate("employees"),
      color: "#2196f3",
    },
    {
      title: "Department Management",
      description: "Manage departments and organizational structure",
      icon: <Group fontSize="large" color="primary" />,
      action: () => onNavigate("departments"),
      color: "#4caf50",
    },
    {
      title: "Attendance Records",
      description: "View and manage detailed attendance history",
      icon: <EventNoteIcon fontSize="large" color="primary" />,
      action: () => onNavigate("attendance"),
      color: "#9c27b0",
    },
    {
      title: "Holiday Management",
      description: "Set up holidays and special non-working days",
      icon: <CalendarMonth fontSize="large" color="primary" />,
      action: () => onNavigate("holidays"),
      color: "#ff9800",
    },
    {
      title: "Attendance Reports",
      description: "Generate and export detailed attendance reports",
      icon: <Description fontSize="large" color="primary" />,
      action: () => onNavigate("reports"),
      color: "#e91e63",
    },
  ];

  // Chart options
  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: theme.palette.text.primary,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: "Attendance Trends (Last 7 Days)",
        color: theme.palette.text.primary,
        font: {
          size: 16,
          weight: "bold",
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    hover: {
      mode: "nearest",
      intersect: true,
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Day",
          color: theme.palette.text.primary,
        },
        ticks: {
          color: theme.palette.text.primary,
        },
        grid: {
          color: theme.palette.mode === "dark" ? "#555" : "#ddd",
        },
      },
      y: {
        title: {
          display: true,
          text: "Number of Employees",
          color: theme.palette.text.primary,
        },
        min: 0,
        ticks: {
          color: theme.palette.text.primary,
          precision: 0,
        },
        grid: {
          color: theme.palette.mode === "dark" ? "#555" : "#ddd",
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Weekly Attendance Summary",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
      },
      title: {
        display: true,
        text: "Attendance by Department",
      },
    },
  };

  // Add pie chart options
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
      },
      title: {
        display: true,
        text: "Overall Attendance Summary",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.formattedValue || "";
            const total = context.dataset.data.reduce(
              (acc, val) => acc + val,
              0
            );
            const percentage = Math.round((context.raw / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  // Chart tabs
  const chartTabs = [
    { label: "Today's Stats", icon: <TodayIcon /> },
    { label: "Weekly Trends", icon: <DateRangeIcon /> },
    { label: "Department Stats", icon: <BusinessIcon /> },
    { label: "Annual Summary", icon: <ShowChart /> },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pt: 8 }}>
      <Navbar user={user} onLogout={onLogout} />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: "bold" }}>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome to your attendance management dashboard. Here's an overview
            of today's attendance statistics.
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 6 }}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  height: "100%",
                }}
              >
                <Avatar
                  sx={{
                    width: 60,
                    height: 60,
                    mb: 2,
                    bgcolor: stat.bgColor,
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {stat.title}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Charts Section */}
        <Paper sx={{ p: 3, mb: 6 }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs
              value={chartTab}
              onChange={handleChartTabChange}
              aria-label="attendance charts tabs"
            >
              <Tab icon={<TodayIcon />} label="Today's Stats" />
              <Tab icon={<DateRangeIcon />} label="Weekly Trends" />
              <Tab icon={<BusinessIcon />} label="Department Stats" />
              <Tab icon={<ShowChart />} label="Annual Summary" />
            </Tabs>
          </Box>

          <Box sx={{ height: 400, position: "relative" }}>
            {chartLoading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <>
                {chartTab === 0 && Object.keys(weeklyData).length > 0 && (
                  <Bar options={barOptions} data={weeklyData} />
                )}
                {chartTab === 1 && Object.keys(monthlyData).length > 0 && (
                  <Line options={lineOptions} data={lineData} />
                )}
                {chartTab === 2 && Object.keys(deptData).length > 0 && (
                  <Box
                    sx={{
                      height: "100%",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Box sx={{ width: "70%", height: "100%" }}>
                      <Doughnut options={doughnutOptions} data={deptData} />
                    </Box>
                  </Box>
                )}
                {chartTab === 3 && Object.keys(summaryData).length > 0 && (
                  <Box
                    sx={{
                      height: "100%",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Box sx={{ width: "60%", height: "100%" }}>
                      <Pie options={pieOptions} data={summaryData} />
                    </Box>
                  </Box>
                )}
                {((chartTab === 0 && Object.keys(weeklyData).length === 0) ||
                  (chartTab === 1 && Object.keys(lineData).length === 0) ||
                  (chartTab === 2 && Object.keys(deptData).length === 0) ||
                  (chartTab === 3 &&
                    Object.keys(summaryData).length === 0)) && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      No data available for the selected chart.
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Paper>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
            Quick Access
          </Typography>
          <Grid container spacing={3}>
            {navigationCards.map((card, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card
                  elevation={2}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-5px)",
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        mb: 2,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 50,
                          height: 50,
                          bgcolor: `${card.color}20`,
                          color: card.color,
                        }}
                      >
                        {card.icon}
                      </Avatar>
                    </Box>
                    <Typography variant="h6" align="center" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      align="center"
                    >
                      {card.description}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={card.action}
                      sx={{ borderColor: card.color, color: card.color }}
                    >
                      Go to {card.title}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {apiAvailable && users.length > 0 && (
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Users
            </Typography>
            <List>
              {users.slice(0, 5).map((user) => (
                <ListItem key={user.user_id}>
                  <ListItemAvatar>
                    <Avatar>{user.display_name.charAt(0)}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.display_name}
                    secondary={`Username: ${user.username}`}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      size="small"
                      label={new Date(user.date_created).toLocaleDateString()}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default MainPage;
