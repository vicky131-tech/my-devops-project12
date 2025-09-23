// core modules
const http = require("http");
const url = require("url");

// environment configuration
const PORT = process.env.PORT || 3000;
const ENVIRONMENT = process.env.NODE_ENV || "development";

let requestCount = 0;

// helper: send JSON responses
function sendJSON(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data, null, 2));
}

// helper: send HTML responses
function sendHTML(res, statusCode, content) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "text/html");
  res.end(content);
}

// helper: send Prometheus metrics
function sendMetrics(res) {
  const mem = process.memoryUsage();
  const metrics = `
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total ${requestCount}

# HELP app_uptime_seconds Application uptime in seconds
# TYPE app_uptime_seconds gauge
app_uptime_seconds ${process.uptime()}

# HELP nodejs_memory_usage_bytes Node.js memory usage
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} ${mem.rss}
nodejs_memory_usage_bytes{type="heapUsed"} ${mem.heapUsed}
nodejs_memory_usage_bytes{type="heapTotal"} ${mem.heapTotal}
nodejs_memory_usage_bytes{type="external"} ${mem.external}
`;
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end(metrics);
}

// main server
const server = http.createServer((req, res) => {
  requestCount++;
  const timestamp = new Date().toISOString();
  const { pathname } = url.parse(req.url, true);

  // logging
  console.log(
    `${timestamp} - ${req.method} ${pathname} - ${
      req.headers["user-agent"] || "Unknown"
    }`
  );

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // route handling
  switch (pathname) {
    case "/":
      sendHTML(
        res,
        200,
        `
<!DOCTYPE html>
<html>
<head>
  <title>My DevOps Lab 2025</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
    .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DevOps Lab 2025</h1>
    <p>Modern Node.js application with CI/CD pipeline</p>
    <p>version 1.0.01</p>

  </div>
  <h2>Available Endpoints:</h2>
  <div class="endpoint"><strong>GET /</strong> - This welcome page</div>
  <div class="endpoint"><strong>GET /health</strong> - Health check (JSON)</div>
  <div class="endpoint"><strong>GET /info</strong> - System information</div>
  <div class="endpoint"><strong>GET /metrics</strong> - Prometheus metrics</div>
  <p>Environment: <strong>${ENVIRONMENT}</strong></p>
  <p>Server time: <strong>${timestamp}</strong></p>
  <p>Requests served: <strong>${requestCount}</strong></p>
</body>
</html>`
      );
      break;

    case "/health":
      sendJSON(res, 200, {
        status: "healthy",
        timestamp,
        uptime: process.uptime(),
        environment: ENVIRONMENT,
        version: "1.0.0",
        node_version: process.version,
        requests_served: requestCount,
      });
      break;

    case "/info":
      sendJSON(res, 200, {
        platform: process.platform,
        architecture: process.arch,
        node_version: process.version,
        memory_usage: process.memoryUsage(),
        environment: ENVIRONMENT,
        pid: process.pid,
        uptime: process.uptime(),
      });
      break;

    case "/metrics":
      sendMetrics(res);
      break;

    default:
      sendJSON(res, 404, {
        error: "Not Found",
        message: `Route ${pathname} not found`,
        timestamp,
      });
  }
});

// graceful shutdown
function shutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// start server
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/`);
  console.log(`Environment: ${ENVIRONMENT}`);
  console.log(`Node.js version: ${process.version}`);
});

// export for testing
module.exports = server;