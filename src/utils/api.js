// API utility for the renderer process

// Initialize with a default IP address that will be updated
let IPADDRESS = "127.0.0.1";
let API_URL = `http://${IPADDRESS}:3000/api`;
let SOCKET_API_URL = `http://${IPADDRESS}:3005`;

// Set up listener for IP address updates from main process
if (typeof window !== "undefined" && window.ipConfig) {
  // Request IP from main process
  window.ipConfig
    .getLocalIp()
    .then((ip) => {
      IPADDRESS = ip;
      API_URL = `http://${IPADDRESS}:3000/api`;
      SOCKET_API_URL = `http://${IPADDRESS}:3005`;
      console.log(`Updated IP address from main process: ${IPADDRESS}`);
    })
    .catch((err) => {
      console.error(
        "Failed to get IP from main process, using fallback address:",
        err
      );
      // Keep using the default IP address
    });

  // Listen for IP address updates
  window.ipConfig.onIpUpdate((ip) => {
    IPADDRESS = ip;
    API_URL = `http://${IPADDRESS}:3000/api`;
    SOCKET_API_URL = `http://${IPADDRESS}:3005`;
    console.log(`IP address updated via IPC: ${IPADDRESS}`);
  });
}

// Export variables so they can be updated
export { IPADDRESS, API_URL, SOCKET_API_URL };

// Helper function to format dates consistently
function formatDateForAPI(date) {
  if (!date) return "";

  // If it's already a string in YYYY-MM-DD format, return as is
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // Otherwise convert to YYYY-MM-DD format
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Generic fetch function with error handling
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: options.headers || {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "API request failed");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// Test API connection
export async function testConnection() {
  try {
    return await fetchAPI("/auth/test");
  } catch (error) {
    console.error("API connection test failed:", error);
    return { success: false, message: "API connection failed" };
  }
}

// Authentication
export async function login(username, password) {
  try {
    // Log the actual credential values for debugging
    console.log(
      `DEBUG - Actual credentials used: username="${username}", password="${password}"`
    );

    // Special handling for Admin user with case-insensitive matching
    // If username is any variation of "admin", use the exact "Admin"/"Admin" credentials
    const isAdminUser = username.toLowerCase() === "admin";

    // Always use the exact Admin/Admin credentials for admin user, regardless of input case
    const payloadUsername = isAdminUser ? "Admin" : username;
    const payloadPassword = isAdminUser ? "Admin" : password;

    console.log(
      `Attempting API login for user: ${payloadUsername} to ${API_URL}/auth/login`
    );
    console.log(
      `DEBUG - Sending payload: username="${payloadUsername}", password="${payloadPassword}"`
    );

    // Make the direct API call without using fetchAPI helper to have more control
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: payloadUsername,
        password: payloadPassword,
      }),
    });

    const data = await response.json();
    console.log(`DEBUG - API login response:`, data);

    if (!response.ok) {
      console.error("API login failed:", data.message);

      // For admin users always try IPC as fallback by returning success:false
      if (isAdminUser) {
        console.log(
          "DEBUG - Admin user detected, will try IPC login as fallback"
        );
        return {
          success: false,
          message: "Will try local authentication",
        };
      }

      return {
        success: false,
        message: data.message || "Authentication failed",
      };
    }

    console.log("API login successful");
    return data;
  } catch (error) {
    console.error("Login failed:", error);
    return {
      success: false,
      message: error.message || "Connection error",
    };
  }
}

// Users
export async function getUsers() {
  return await fetchAPI("/users");
}

export async function getTemplates() {
  return await fetchAPI("/employees/templates");
}

export async function getUser(id) {
  try {
    const response = await fetchAPI(`/users/${id}`);

    // If response contains the user object directly, wrap it with success flag
    if (response && response.user_id) {
      return {
        success: true,
        user: response,
      };
    }

    // If response already has success flag and a user property, return as-is
    if (response.success && response.user) {
      return response;
    }

    // Handle cases where the response might have a different structure
    if (response && typeof response === "object") {
      // Return a standardized format with the data we have
      return {
        success: true,
        data: response,
      };
    }

    // If we reach here, something is wrong with the response
    console.warn("Unexpected API response format in getUser:", response);
    return {
      success: false,
      message: "Unexpected API response format",
    };
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    return {
      success: false,
      message: error.message || "Failed to fetch user details",
    };
  }
}

export async function createUser(userData) {
  return await fetchAPI("/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export async function updateUser(id, userData) {
  console.log(`Updating user ${id} with data:`, JSON.stringify(userData));

  // Make sure all string fields have valid values (not null or undefined)
  const normalizedUserData = {
    ...userData,
    display_name: userData.display_name || "",
    email: userData.email || "",
    phone: userData.phone || "",
    address: userData.address || "",
    position: userData.position || "",
    bio: userData.bio || "",
  };

  return await fetchAPI(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(normalizedUserData),
  });
}

export async function changePassword(id, currentPassword, newPassword) {
  try {
    return await fetchAPI(`/users/${id}/change-password`, {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  } catch (error) {
    console.error("Password change failed:", error);
    return {
      success: false,
      message: error.message || "Failed to change password",
    };
  }
}

export async function deleteUser(id) {
  return await fetchAPI(`/users/${id}`, {
    method: "DELETE",
  });
}

// Employees
export async function getEmployees(searchTerm = "") {
  const endpoint = searchTerm
    ? `/employees?search=${encodeURIComponent(searchTerm)}`
    : "/employees";
  return await fetchAPI(endpoint);
}

export async function getEmployee(id) {
  return await fetchAPI(`/employees/${id}`);
}

export async function createEmployee(employeeData) {
  // Handle file uploads with FormData
  const formData = new FormData();

  // Add all text fields
  Object.keys(employeeData).forEach((key) => {
    if (key === "image") {
      if (employeeData[key] instanceof File) {
        formData.append("image", employeeData[key]);
      }
    } else if (employeeData[key] !== null && employeeData[key] !== undefined) {
      formData.append(key, employeeData[key].toString());
    }
  });

  return await fetch(`${API_URL}/employees`, {
    method: "POST",
    body: formData,
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to create employee");
    }
    return data;
  });
}

export async function updateEmployee(id, employeeData) {
  // Handle file uploads with FormData
  const formData = new FormData();

  // Add all text fields
  Object.keys(employeeData).forEach((key) => {
    if (key === "image") {
      if (employeeData[key] instanceof File) {
        formData.append("image", employeeData[key]);
      }
    } else if (employeeData[key] !== null && employeeData[key] !== undefined) {
      formData.append(key, employeeData[key].toString());
    }
  });

  return await fetch(`${API_URL}/employees/${id}`, {
    method: "PUT",
    body: formData,
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to update employee");
    }
    return data;
  });
}

export async function deleteEmployee(id) {
  return await fetchAPI(`/employees/${id}`, {
    method: "DELETE",
  });
}

// Department APIs
export const getDepartments = async (searchTerm = "") => {
  try {
    const queryString = searchTerm
      ? `?search=${encodeURIComponent(searchTerm)}`
      : "";
    const response = await fetch(`${API_URL}/departments${queryString}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Department API error:", errorData);
      return [];
    }

    const data = await response.json();

    // Check if we received an array directly or if we need to extract the data property
    if (Array.isArray(data)) {
      return data;
    } else if (data.success && Array.isArray(data.data)) {
      return data.data;
    } else {
      console.warn("Department data format unexpected:", data);
      return [];
    }
  } catch (error) {
    console.error("Error in getDepartments:", error);
    return [];
  }
};

export const getDepartment = async (departmentId) => {
  try {
    const response = await fetchAPI(`/departments/${departmentId}`);
    return response.data || null;
  } catch (error) {
    console.error("Error in getDepartment:", error);
    return null;
  }
};

export const createDepartment = async (departmentData) => {
  try {
    return await fetchAPI("/departments", {
      method: "POST",
      body: JSON.stringify(departmentData),
    });
  } catch (error) {
    console.error("Error in createDepartment:", error);
    return {
      success: false,
      message: error.message || "Failed to create department",
    };
  }
};

export const updateDepartment = async (departmentId, departmentData) => {
  try {
    return await fetchAPI(`/departments/${departmentId}`, {
      method: "PUT",
      body: JSON.stringify(departmentData),
    });
  } catch (error) {
    console.error("Error in updateDepartment:", error);
    return {
      success: false,
      message: error.message || "Failed to update department",
    };
  }
};

export const deleteDepartment = async (departmentId) => {
  try {
    return await fetchAPI(`/departments/${departmentId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Error in deleteDepartment:", error);
    return {
      success: false,
      message: error.message || "Failed to delete department",
    };
  }
};

// Holiday APIs
export const getHolidays = async (searchTerm = "") => {
  try {
    console.log("Fetching holidays with search term:", searchTerm);
    const response = await fetchAPI(
      `/holidays${
        searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ""
      }`
    );
    console.log("Holidays API response:", response);
    return response.data || [];
  } catch (error) {
    console.error("Error in getHolidays:", error);
    return [];
  }
};

export const getHoliday = async (holidayId) => {
  try {
    const response = await fetchAPI(`/holidays/${holidayId}`);
    return response.data || null;
  } catch (error) {
    console.error("Error in getHoliday:", error);
    return null;
  }
};

export const createHoliday = async (holidayData) => {
  try {
    return await fetchAPI("/holidays", {
      method: "POST",
      body: JSON.stringify(holidayData),
    });
  } catch (error) {
    console.error("Error in createHoliday:", error);
    return {
      success: false,
      message: error.message || "Failed to create holiday",
    };
  }
};

export const updateHoliday = async (holidayId, holidayData) => {
  try {
    return await fetchAPI(`/holidays/${holidayId}`, {
      method: "PUT",
      body: JSON.stringify(holidayData),
    });
  } catch (error) {
    console.error("Error in updateHoliday:", error);
    return {
      success: false,
      message: error.message || "Failed to update holiday",
    };
  }
};

export const deleteHoliday = async (holidayId) => {
  try {
    return await fetchAPI(`/holidays/${holidayId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Error in deleteHoliday:", error);
    return {
      success: false,
      message: error.message || "Failed to delete holiday",
    };
  }
};

// Event APIs
export async function getEvents() {
  try {
    const response = await fetchAPI("/events");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

export async function getUpcomingEvents(limit = 5) {
  try {
    const response = await fetchAPI(`/events/upcoming?limit=${limit}`);
    return response.data || [];
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    return [];
  }
}

export async function getEvent(eventId) {
  try {
    const response = await fetchAPI(`/events/${eventId}`);
    return response.data || null;
  } catch (error) {
    console.error(`Error fetching event ${eventId}:`, error);
    return null;
  }
}

export async function createEvent(eventData) {
  try {
    return await fetchAPI("/events", {
      method: "POST",
      body: JSON.stringify(eventData),
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return { success: false, message: "Failed to create event" };
  }
}

export async function updateEvent(eventId, eventData) {
  try {
    return await fetchAPI(`/events/${eventId}`, {
      method: "PUT",
      body: JSON.stringify(eventData),
    });
  } catch (error) {
    console.error(`Error updating event ${eventId}:`, error);
    return { success: false, message: "Failed to update event" };
  }
}

export async function deleteEvent(eventId) {
  try {
    return await fetchAPI(`/events/${eventId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error(`Error deleting event ${eventId}:`, error);
    return { success: false, message: "Failed to delete event" };
  }
}

// Get upcoming holidays based on the current date
export async function getUpcomingHolidays(limit = 3) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const response = await fetchAPI(
      `/holidays/upcoming?date=${today}&limit=${limit}`
    );
    return response.data || [];
  } catch (error) {
    console.error("Error fetching upcoming holidays:", error);
    return [];
  }
}

// Get counts of employees, departments, and holidays
export async function getDashboardStats() {
  try {
    const response = await fetchAPI("/dashboard/stats");
    return (
      response.data || {
        employeesCount: 0,
        departmentsCount: 0,
        holidaysCount: 0,
        upcomingHoliday: null,
        upcomingEvents: [],
      }
    );
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      employeesCount: 0,
      departmentsCount: 0,
      holidaysCount: 0,
      upcomingHoliday: null,
      upcomingEvents: [],
    };
  }
}

// Attendance APIs
export const getAttendanceByDate = async (date) => {
  try {
    const formattedDate = formatDateForAPI(date);
    console.log("Getting attendance for date:", formattedDate);
    const response = await fetchAPI(`/attendance?date=${formattedDate}`);
    return response.data || [];
  } catch (error) {
    console.error("Error in getAttendanceByDate:", error);
    return [];
  }
};

export const getAttendanceByDateRange = async (startDate, endDate) => {
  try {
    const formattedStartDate = formatDateForAPI(startDate);
    const formattedEndDate = formatDateForAPI(endDate);
    console.log(
      `Getting attendance from ${formattedStartDate} to ${formattedEndDate}`
    );

    // Build query parameters
    const params = new URLSearchParams();
    params.append("startDate", formattedStartDate);
    params.append("endDate", formattedEndDate);

    const response = await fetchAPI(`/attendance?${params.toString()}`);
    return response;
  } catch (error) {
    console.error("Error in getAttendanceByDateRange:", error);
    return {
      success: false,
      message: "Failed to fetch attendance records",
      data: [],
    };
  }
};

export const getAttendanceByMonth = async (year, month) => {
  try {
    // Validate inputs
    if (!year || !month) {
      console.error("Missing required parameters: year and month");
      return {
        success: false,
        message: "Missing required parameters",
        data: [],
      };
    }

    // Calculate start and end dates for the month
    const startDate = `${year}-${month}-01`;

    // Calculate the last day of the month
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    console.log(
      `Getting attendance for month: ${month}/${year} (${startDate} to ${endDate})`
    );

    // Build query parameters
    const params = new URLSearchParams();
    params.append("startDate", startDate);
    params.append("endDate", endDate);

    const response = await fetchAPI(`/attendance?${params.toString()}`);
    return response;
  } catch (error) {
    console.error("Error in getAttendanceByMonth:", error);
    return {
      success: false,
      message: "Failed to fetch monthly attendance records",
      data: [],
    };
  }
};

export async function getAttendanceByEmployee(employeeId) {
  try {
    const response = await fetchAPI(`/attendance?employeeId=${employeeId}`);
    return response;
  } catch (error) {
    console.error("Error in getAttendanceByEmployee:", error);
    return { success: false, message: "Failed to fetch attendance records" };
  }
}

export const getAttendanceByEmployeeAndDate = async (employeeId, date) => {
  try {
    const formattedDate = formatDateForAPI(date);
    console.log(
      "Getting attendance for employee ID:",
      employeeId,
      "and date:",
      formattedDate
    );
    const response = await fetchAPI(
      `/attendance?employeeId=${employeeId}&date=${formattedDate}`
    );
    return response.data || [];
  } catch (error) {
    console.error("Error in getAttendanceByEmployeeAndDate:", error);
    return [];
  }
};

export const fetchAttendanceWithPagination = async (endpoint) => {
  try {
    console.log("Fetching attendance with pagination:", endpoint);
    const response = await fetchAPI(endpoint);
    return response;
  } catch (error) {
    console.error("Error in fetchAttendanceWithPagination:", error);
    return { success: false, message: "Failed to fetch attendance records" };
  }
};

export async function checkInEmployee(employeeId) {
  try {
    const today = formatDateForAPI(new Date());
    console.log(
      "Checking in employee with ID:",
      employeeId,
      "for date:",
      today
    );

    return await fetchAPI("/attendance/check-in", {
      method: "POST",
      body: JSON.stringify({ employeeId, date: today }),
    });
  } catch (error) {
    console.error("Error in checkInEmployee:", error);
    return {
      success: false,
      message: error.message || "Failed to check in employee",
    };
  }
}

export async function checkOutEmployee(attendanceId) {
  try {
    return await fetchAPI(`/attendance/check-out/${attendanceId}`, {
      method: "PUT",
    });
  } catch (error) {
    console.error("Error in checkOutEmployee:", error);
    return {
      success: false,
      message: error.message || "Failed to check out employee",
    };
  }
}

// Report-specific APIs
export const getAttendanceReport = async (
  startDate,
  endDate,
  employeeId = null,
  status = null,
  departmentId = null
) => {
  try {
    // Format dates
    const formattedStartDate = formatDateForAPI(startDate);
    const formattedEndDate = formatDateForAPI(endDate);

    console.log("Generating attendance report with parameters:", {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      employeeId,
      status,
      departmentId,
    });

    // Build query parameters
    let endpoint = "/attendance?";
    const params = new URLSearchParams();

    params.append("startDate", formattedStartDate);
    params.append("endDate", formattedEndDate);
    params.append("limit", "1000"); // Get a large number of records for reports

    if (employeeId) {
      params.append("employeeId", employeeId);
    }

    if (status) {
      params.append("status", status);
    }

    if (departmentId) {
      params.append("departmentId", departmentId);
    }

    endpoint += params.toString();
    console.log("Request endpoint:", `${API_URL}${endpoint}`);

    // Fetch data
    const response = await fetchAPI(endpoint);
    return response;
  } catch (error) {
    console.error("Error in getAttendanceReport:", error);
    return {
      success: false,
      message: error.message || "Failed to generate attendance report",
      data: [],
    };
  }
};

// Work Schedule APIs
export const getEmployeeWorkSchedule = async (employeeId) => {
  try {
    const response = await fetchAPI(`/work-schedule/${employeeId}`);
    return response;
  } catch (error) {
    console.error("Error in getEmployeeWorkSchedule:", error);
    return {
      success: false,
      message: "Failed to fetch work schedule",
      data: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
    };
  }
};

export const updateEmployeeWorkSchedule = async (employeeId, scheduleData) => {
  try {
    return await fetchAPI(`/work-schedule/${employeeId}`, {
      method: "PUT",
      body: JSON.stringify(scheduleData),
    });
  } catch (error) {
    console.error("Error in updateEmployeeWorkSchedule:", error);
    return {
      success: false,
      message: "Failed to update work schedule",
    };
  }
};

// Backup API functions
export const getBackups = async () => {
  try {
    return await fetchAPI("/backup");
  } catch (error) {
    console.error("Error getting backups:", error);
    return { success: false, message: "Failed to retrieve backups" };
  }
};

export const createBackup = async (name = "") => {
  try {
    return await fetchAPI("/backup", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    return { success: false, message: "Failed to create backup" };
  }
};

export const deleteBackup = async (fileName) => {
  try {
    return await fetchAPI(`/backup/${fileName}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Error deleting backup:", error);
    return { success: false, message: "Failed to delete backup" };
  }
};

export const restoreBackup = async (fileName) => {
  try {
    return await fetchAPI(`/backup/restore/${fileName}`, {
      method: "POST",
    });
  } catch (error) {
    console.error("Error restoring backup:", error);
    return { success: false, message: "Failed to restore backup" };
  }
};

export const getScheduledBackupStatus = async () => {
  try {
    return await fetchAPI("/backup/scheduled/status");
  } catch (error) {
    console.error("Error getting scheduled backup status:", error);
    return { success: false, isRunning: false };
  }
};

export const startScheduledBackup = async (schedule) => {
  try {
    return await fetchAPI("/backup/scheduled/start", {
      method: "POST",
      body: JSON.stringify({ schedule }),
    });
  } catch (error) {
    console.error("Error starting scheduled backup:", error);
    return { success: false, message: "Failed to start scheduled backup" };
  }
};

export const stopScheduledBackup = async () => {
  try {
    return await fetchAPI("/backup/scheduled/stop", {
      method: "POST",
    });
  } catch (error) {
    console.error("Error stopping scheduled backup:", error);
    return { success: false, message: "Failed to stop scheduled backup" };
  }
};

export const getBackupDownloadUrl = (fileName) => {
  return `${API_URL}/backup/download/${fileName}`;
};

// Attendance-related functions
export const getAttendance = async (
  date = null,
  employeeId = null,
  status = null,
  excludeStatus = null
) => {
  try {
    // Build query parameters
    let endpoint = "/attendance";
    const params = new URLSearchParams();

    if (date) {
      params.append("date", formatDateForAPI(date));
    }

    if (employeeId) {
      params.append("employeeId", employeeId);
    }

    if (status) {
      params.append("status", status);
    }

    if (excludeStatus) {
      params.append("excludeStatus", excludeStatus);
    }

    // Add params to endpoint if any
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    // Fetch data
    const response = await fetchAPI(endpoint);
    return response;
  } catch (error) {
    console.error("Error in getAttendance:", error);
    return {
      success: false,
      message: "Failed to get attendance records",
      data: [],
    };
  }
};

// Update attendance record
export const updateAttendance = async (attendanceId, updateData) => {
  try {
    if (!attendanceId) {
      return { success: false, message: "Attendance ID is required" };
    }

    const response = await fetchAPI(`/attendance/${attendanceId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
    return response;
  } catch (error) {
    console.error("Error in updateAttendance:", error);
    return {
      success: false,
      message: "Failed to update attendance record",
    };
  }
};

// Create manual attendance log (Admin only)
export const createManualAttendance = async (attendanceData) => {
  try {
    // Convert time fields to ISO format if they exist
    const formattedData = { ...attendanceData };

    if (formattedData.date && formattedData.check_in) {
      // Combine date with time for check_in
      const [hours, minutes] = formattedData.check_in.split(":");
      const checkInDate = new Date(formattedData.date);
      checkInDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      formattedData.check_in = checkInDate.toISOString();
    } else {
      formattedData.check_in = null;
    }

    if (formattedData.date && formattedData.check_out) {
      // Combine date with time for check_out
      const [hours, minutes] = formattedData.check_out.split(":");
      const checkOutDate = new Date(formattedData.date);
      checkOutDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      formattedData.check_out = checkOutDate.toISOString();
    } else {
      formattedData.check_out = null;
    }

    const response = await fetchAPI("/attendance/manual", {
      method: "POST",
      body: JSON.stringify(formattedData),
    });
    return response;
  } catch (error) {
    console.error("Error in createManualAttendance:", error);
    return {
      success: false,
      message: "Failed to create manual attendance log",
    };
  }
};

// Make sure dynamic values are properly accessed
export default {
  testConnection,
  login,
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getHolidays,
  getHoliday,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getEvents,
  getUpcomingEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getUpcomingHolidays,
  getDashboardStats,
  getAttendanceByDate,
  getAttendanceByDateRange,
  getAttendanceByMonth,
  getAttendanceByEmployee,
  getAttendanceByEmployeeAndDate,
  fetchAttendanceWithPagination,
  checkInEmployee,
  checkOutEmployee,
  getAttendanceReport,
  getEmployeeWorkSchedule,
  updateEmployeeWorkSchedule,
  getBackups,
  createBackup,
  deleteBackup,
  restoreBackup,
  getScheduledBackupStatus,
  startScheduledBackup,
  stopScheduledBackup,
  getBackupDownloadUrl,
  // Include IP address and API URLs that will be dynamically updated
  get IPADDRESS() {
    return IPADDRESS;
  },
  get API_URL() {
    return API_URL;
  },
  get SOCKET_API_URL() {
    return SOCKET_API_URL;
  },
};
