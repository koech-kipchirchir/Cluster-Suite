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
});