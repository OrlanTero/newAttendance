// API utility for the renderer process

// Initialize with a default IP address that will be updated
let IPADDRESS = "192.168.1.19"; // Updated to match the actual server IP
let API_URL = `http://${IPADDRESS}:3000/api`;
let SOCKET_API_URL = `http://${IPADDRESS}:3006`;

// Update IP address from localStorage if available
if (typeof window !== "undefined" && window.localStorage) {
  const savedIp = localStorage.getItem("serverIpAddress");
  if (savedIp) {
    IPADDRESS = savedIp;
    API_URL = `http://${IPADDRESS}:3000/api`;
    SOCKET_API_URL = `http://${IPADDRESS}:3005`;
    console.log(`Loaded IP address from localStorage: ${IPADDRESS}`);
  }
}

// Set up listener for IP address updates from main process
if (typeof window !== "undefined" && window.ipConfig) {
  // Request IP from main process
  window.ipConfig
    .getLocalIp()
    .then((ip) => {
      // Only update if we don't have a localStorage IP (localStorage takes precedence)
      if (!localStorage.getItem("serverIpAddress")) {
        IPADDRESS = ip;
        API_URL = `http://${IPADDRESS}:3000/api`;
        SOCKET_API_URL = `http://${IPADDRESS}:3006`;
        console.log(`Updated IP address from main process: ${IPADDRESS}`);
      }
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
    // Only update if we don't have a localStorage IP (localStorage takes precedence)
    if (!localStorage.getItem("serverIpAddress")) {
      IPADDRESS = ip;
      API_URL = `http://${IPADDRESS}:3000/api`;
      SOCKET_API_URL = `http://${IPADDRESS}:3006`;
      console.log(`IP address updated via IPC: ${IPADDRESS}`);
    }
  });
}

// Utility function to update server IP address dynamically
export function updateServerIp(ipAddress) {
  IPADDRESS = ipAddress;
  API_URL = `http://${IPADDRESS}:3000/api`;
  SOCKET_API_URL = `http://${IPADDRESS}:3006`;
  console.log(`Manually updated server IP address to: ${IPADDRESS}`);
  return { API_URL, SOCKET_API_URL };
}

// Export variables so they can be updated
export { IPADDRESS, API_URL, SOCKET_API_URL };

// Helper function to format dates consistently in the local timezone
function formatDateForAPI(date) {
  if (!date) return "";

  // If it's already a string in YYYY-MM-DD format, return as is
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // Convert the date to local time and extract the date parts
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  // Format as YYYY-MM-DD
  return `${year}-${month}-${day}`;
}

// Helper function to get today's date string in YYYY-MM-DD format in local timezone
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper function to check if date is a working day
export async function isWorkingDay(date, employeeId) {
  try {
    // Format the date properly
    const formattedDate = formatDateForAPI(date);
    const dateObj = new Date(formattedDate);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Step 1: Check if it's a holiday
    const holidays = await getHolidays();
    const isHoliday = holidays.some(
      (holiday) => formatDateForAPI(holiday.date) === formattedDate
    );

    if (isHoliday) {
      console.log(`${formattedDate} is a holiday`);
      return {
        isWorkingDay: false,
        reason: "holiday",
      };
    }

    // Step 2: Check employee's work schedule
    if (employeeId) {
      const workSchedule = await getEmployeeWorkSchedule(employeeId);

      if (workSchedule.success && workSchedule.data) {
        // Map day of week to schedule property
        const dayMapping = {
          0: "sunday",
          1: "monday",
          2: "tuesday",
          3: "wednesday",
          4: "thursday",
          5: "friday",
          6: "saturday",
        };

        const isScheduledWorkDay = !!workSchedule.data[dayMapping[dayOfWeek]];

        if (!isScheduledWorkDay) {
          console.log(
            `${formattedDate} is a rest day for employee ${employeeId}`
          );
          return {
            isWorkingDay: false,
            reason: "rest day",
          };
        }
      }
    }

    // If we get here, it's a working day
    return {
      isWorkingDay: true,
    };
  } catch (error) {
    console.error("Error in isWorkingDay:", error);
    // Default to true in case of error
    return {
      isWorkingDay: true,
      error: error.message,
    };
  }
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
  console.log(`Testing connection to API server at ${API_URL}/auth/test`);
  try {
    // Use a timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Increase timeout to 5 seconds

    console.log(`Sending request to ${API_URL}/auth/test`);

    const response = await fetch(`${API_URL}/auth/test`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `API connection test failed with status: ${response.status}, statusText: ${response.statusText}`
      );
      return {
        success: false,
        message: `Server returned status ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log("API connection test succeeded:", data);
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("API connection test timed out");
      return { success: false, message: "Connection timed out" };
    }
    console.error("API connection test failed:", error);
    return {
      success: false,
      message: error.message || "Connection failed",
      details: error.toString(),
    };
  }
}

// Authentication
export async function login(username, password) {
  try {
    return await fetchAPI("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  } catch (error) {
    console.error("Login failed:", error);
    return { success: false, message: "Login failed" };
  }
}

// Users
export async function getUsers() {
  return await fetchAPI("/users");
}

export async function getUser(id) {
  return await fetchAPI(`/users/${id}`);
}

export async function createUser(userData) {
  return await fetchAPI("/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export async function updateUser(id, userData) {
  return await fetchAPI(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(userData),
  });
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

export async function getTemplates() {
  let employees = await getEmployees();

  return employees;
  // if (!Array.isArray(employees)) {
  //   employees = JSON.parse(employees);
  // }

  // return employees.map((employee) => {
  //   return {
  //     user_id: employee.user_id,
  //     biometric_data: employee.biometric_data,
  //   };
  // });
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
    const response = await fetchAPI(
      `/departments${
        searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ""
      }`
    );
    return response.data || [];
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

export const getAttendanceByEmployee = async (employeeId) => {
  try {
    const response = await fetchAPI(`/attendance?employeeId=${employeeId}`);
    return response.data || [];
  } catch (error) {
    console.error("Error in getAttendanceByEmployee:", error);
    return [];
  }
};

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

export const checkInEmployee = async (employeeId) => {
  try {
    console.log("checkInEmployee called with employeeId:", employeeId);
    const today = getTodayDateString();
    console.log("Using date:", today);

    // Ensure employeeId is a number if it's stored as a string in the employee object
    const empId = parseInt(employeeId, 10) || employeeId;
    console.log("Sending to API:", { employeeId: empId, date: today });

    const response = await fetchAPI("/attendance/check-in", {
      method: "POST",
      body: JSON.stringify({ employeeId: empId, date: today }),
    });
    console.log("Check-in API response:", response);
    return response;
  } catch (error) {
    console.error("Error in checkInEmployee:", error);
    return {
      success: false,
      message: error.message || "Failed to check in employee",
    };
  }
};

export const checkOutEmployee = async (attendanceId) => {
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
};

export const getEmployeeWorkSchedule = async (employeeId) => {
  // Implementation of getEmployeeWorkSchedule function
  // This is a placeholder and should be implemented based on your actual API
  return {
    success: false,
    message: "getEmployeeWorkSchedule function not implemented",
  };
};

export const updateEmployeeWorkSchedule = async (employeeId, scheduleData) => {
  // Implementation of updateEmployeeWorkSchedule function
  // This is a placeholder and should be implemented based on your actual API
  return {
    success: false,
    message: "updateEmployeeWorkSchedule function not implemented",
  };
};

export const getAttendanceReport = async (employeeId, date) => {
  // Implementation of getAttendanceReport function
  // This is a placeholder and should be implemented based on your actual API
  return {
    success: false,
    message: "getAttendanceReport function not implemented",
  };
};

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
  getAttendanceByDate,
  getAttendanceByEmployee,
  getAttendanceByEmployeeAndDate,
  checkInEmployee,
  checkOutEmployee,
  getTemplates,
  getEmployeeWorkSchedule,
  updateEmployeeWorkSchedule,
  getAttendanceReport,
  isWorkingDay,
  API_URL,
  SOCKET_API_URL,
  IPADDRESS,
};
