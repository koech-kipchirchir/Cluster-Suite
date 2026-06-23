const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dbAsync = require("./utils/db-async"); 

const router = express.Router();
const authMiddleware = require("./middleware/authMiddleware");

const JWT_SECRET = process.env.JWT_SECRET || "cluster_secret_key";

// Removed console.log("🔥 authRoutes LOADED");

// =======================
// REGISTER
// =======================
router.post("/register", async (req, res) => {
  // console.log("🔥 REGISTER HIT:", req.body); // Removed for production readiness

  try {
    const { username, password, country, currency, email, phone } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
      // Default to Kenya/KES if not provided
      const userCountry = country || "Kenya";
      const userCurrency = currency || "KES";

      await dbAsync.run(
        "INSERT INTO users (username, password, country, currency, email, phone) VALUES (?, ?, ?, ?, ?, ?)",
        [username, hashedPassword, userCountry, userCurrency, email || null, phone || null]
      );
      // console.log("✅ USER CREATED:", username); // Removed for production readiness
      return res.json({ message: "User registered successfully" });
    } catch (err) {
      // console.log("❌ DB ERROR REGISTER:", err.message); // Removed for production readiness
      if (err.code === "SQLITE_CONSTRAINT") {
        return res.status(409).json({ message: "Username already exists" });
      }
      throw err; // Caught by outer catch
    }
  } catch (error) {
    console.error("❌ REGISTER ERROR:", error);
    res.status(500).json({ message: "Server error during register", error: error.message });
  }
});

// =======================
// LOGIN
// =======================
router.post("/login", async (req, res) => {
  // console.log("🔥 LOGIN HIT:", req.body); // Removed for production readiness

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  try {
    const user = await dbAsync.get("SELECT * FROM users WHERE username = ?", [username]);

    if (!user) {
      // console.log("❌ USER NOT FOUND"); // Removed for production readiness
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    // console.log("🔐 PASSWORD MATCH:", isMatch); // Removed for production readiness

      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: "1d" }
      );

    // console.log("✅ LOGIN SUCCESS:", username); // Removed for production readiness

      return res.json({ token });
  } catch (err) {
    console.error("❌ LOGIN ERROR:", err); // Re-enable logging for debugging
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
});

// =======================
// GET PROFILE
// =======================
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await dbAsync.get("SELECT id, username, country, currency, email, phone FROM users WHERE id = ?", [req.user.id]);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("❌ PROFILE GET ERROR:", err);
    res.status(500).json({ message: "Error fetching profile", error: err.message });
  }
});

// =======================
// UPDATE PROFILE
// =======================
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { country, currency, email, phone } = req.body;
    await dbAsync.run("UPDATE users SET country = ?, currency = ?, email = ?, phone = ? WHERE id = ?", [country, currency, email || null, phone || null, req.user.id]);
    const updated = await dbAsync.get("SELECT id, username, country, currency, email, phone FROM users WHERE id = ?", [req.user.id]);
    res.json({ message: "Profile updated", profile: updated });
  } catch (err) {
    console.error("❌ PROFILE UPDATE ERROR:", err);
    res.status(500).json({ message: "Error updating profile", error: err.message });
  }
});

module.exports = router;