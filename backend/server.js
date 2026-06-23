require("dotenv").config();
const express = require("express");
const cors = require("cors");
require("./db");

const authRoutes = require("./authRoutes");
const tasksRoutes = require("./tasks");
const plannerRoutes = require("./planner");

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// console.log("🔥 SERVER STARTING..."); // Removed for production readiness

const app = express();

// Startup diagnostic for environment configuration
console.log("🔍 Checking Environment Config...");
console.log(`- PORT: ${PORT}`);
console.log(`- GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? "Detected ✅" : "Missing ❌ (AI features disabled)"}`);
console.log(`- MPESA_CONSUMER_KEY: ${process.env.MPESA_CONSUMER_KEY ? "Detected ✅" : "Missing ❌"}`);
console.log(`- MPESA_CONSUMER_SECRET: ${process.env.MPESA_CONSUMER_SECRET ? "Detected ✅" : "Missing ❌"}`);
console.log(`- MPESA_SHORTCODE: ${process.env.MPESA_SHORTCODE ? "Detected ✅" : "Missing ❌"}`);
console.log(`- MPESA_PASSKEY: ${process.env.MPESA_PASSKEY ? "Detected ✅" : "Missing ❌"}`);
console.log(`- CALLBACK_URL: ${process.env.CALLBACK_URL ? "Detected ✅" : "Missing ❌ (default will be used)"}`);

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// =======================
// AUTH ROUTES
// =======================
app.use("/api/auth", authRoutes);

// =======================
// TASK ROUTES
// =======================
app.use("/api/tasks", tasksRoutes);

// =======================
// PLANNER ROUTES
// =======================
app.use("/api/planner", plannerRoutes);

// =======================
// TEST ROUTE
// =======================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Cluster Suite API Running",
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err); // Log the error for debugging

  // Default to 500 Internal Server Error if no status is set
  const statusCode = err.statusCode || err.response?.status || 500;
  const message = err.message || "An unexpected error occurred.";

  res.status(statusCode).json({ error: message });
});

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);

  // ─────────────────────────────────────────────
  // Event Due-Date Notification Scheduler
  // Fires once shortly after startup, then every 24 h
  // ─────────────────────────────────────────────
  const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'cluster-internal';
  const SCHEDULER_BASE_URL = `http://localhost:${PORT}`;

  const runDueEventCheck = async () => {
    try {
      const axios = require('axios');
      const res = await axios.post(
        `${SCHEDULER_BASE_URL}/api/planner/notify-due-events`,
        {},
        { headers: { 'x-internal-secret': INTERNAL_SECRET } }
      );
      console.log(`[Scheduler] Due-event check complete — ${res.data.processed} alert(s) sent.`);
    } catch (err) {
      console.error('[Scheduler] Due-event check failed:', err.message);
    }
  };

  // Run 5 seconds after startup (avoids race with DB migrations)
  setTimeout(runDueEventCheck, 5000);

  // Then run once every 24 hours
  setInterval(runDueEventCheck, 24 * 60 * 60 * 1000);
});
// Reload trigger 3