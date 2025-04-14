// Simple script to test server connection
const http = require("http");
const os = require("os");

// Get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  let ipAddress = "127.0.0.1"; // Default fallback

  // Loop through network interfaces
  Object.keys(interfaces).forEach((ifname) => {
    interfaces[ifname].forEach((iface) => {
      // Skip over non-IPv4 and internal/loopback interfaces
      if (iface.family === "IPv4" && !iface.internal) {
        ipAddress = iface.address;
      }
    });
  });

  return ipAddress;
}

// IP address to test
const ipAddress = process.argv[2] || getLocalIpAddress();
const port = 3000;
const path = "/api/auth/test";

console.log(`Testing connection to http://${ipAddress}:${port}${path}`);

// Create a simple HTTP request
const options = {
  hostname: ipAddress,
  port: port,
  path: path,
  method: "GET",
  timeout: 3000, // 3 second timeout
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("RESPONSE DATA:", data);
    try {
      const jsonData = JSON.parse(data);
      console.log("Connection successful:", jsonData);
    } catch (e) {
      console.error("Error parsing JSON response:", e.message);
    }
  });
});

req.on("error", (e) => {
  console.error(`Connection failed: ${e.message}`);
  console.log(
    "Make sure your server is running and accessible at the correct IP address"
  );
});

req.on("timeout", () => {
  console.error("Connection timed out");
  req.destroy();
});

// End the request
req.end();
