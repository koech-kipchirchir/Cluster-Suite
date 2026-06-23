import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

const countryToCurrency = {
  Kenya: "KES",
  Uganda: "UGX",
  Tanzania: "TZS",
};

const localeToCountry = {
  KE: "Kenya",
  UG: "Uganda",
  TZ: "Tanzania",
};

function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("Kenya");
  const [currency, setCurrency] = useState("KES");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    try {
      const locale = window.navigator.language?.split("-")[1]?.toUpperCase();
      const autoCountry = localeToCountry[locale];
      if (autoCountry) {
        setCountry(autoCountry);
        setCurrency(countryToCurrency[autoCountry]);
      }
    } catch (err) {
      console.warn("Unable to auto-detect country", err);
    }
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/register", {
        username: username.trim(),
        password,
        country,
        currency,
      });

      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Registration failed. Please try a different username."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      background: "#f8fafc",
      fontFamily: "Inter, system-ui, sans-serif"
    }}>
      <div style={{
        maxWidth: "400px",
        width: "95%",
        padding: "40px",
        background: "white",
        borderRadius: "16px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h2 style={{ fontSize: "26px", fontWeight: "800", color: "#1e293b", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>Create Account</h2>
          <p style={{ color: "#64748b", margin: 0, fontSize: "15px" }}>Get started with your Cluster Suite workspace</p>
        </div>

        {error && (
          <div style={{ 
            background: "#fef2f2", 
            color: "#991b1b", 
            padding: "12px", 
            borderRadius: "8px", 
            marginBottom: "20px", 
            fontSize: "14px",
            border: "1px solid #fee2e2"
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            background: "#ecfdf5", 
            color: "#065f46", 
            padding: "12px", 
            borderRadius: "8px", 
            marginBottom: "20px", 
            fontSize: "14px",
            border: "1px solid #d1fae5"
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="username" style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: "#475569" }}>Username</label>
            <input
              id="username"
              type="text"
              placeholder="Pick a unique username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="password" style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: "#475569" }}>Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label htmlFor="confirmPassword" style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: "#475569" }}>Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="country" style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: "#475569" }}>Country</label>
            <select
              id="country"
              value={country}
              onChange={(e) => {
                const newCountry = e.target.value;
                setCountry(newCountry);
                setCurrency(countryToCurrency[newCountry] || "KES");
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
            >
              <option value="Kenya">Kenya (KES)</option>
              <option value="Uganda">Uganda (UGX)</option>
              <option value="Tanzania">Tanzania (TZS)</option>
            </select>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label htmlFor="currency" style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: "#475569" }}>Currency</label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
            >
              <option value="KES">KES</option>
              <option value="UGX">UGX</option>
              <option value="TZS">TZS</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 10px rgba(99, 102, 241, 0.2)",
              transition: "transform 0.1s, opacity 0.2s"
            }}
          >
            {loading ? "Registering..." : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", color: "#64748b", fontSize: "14px" }}>
          Already have an account?{" "}
          <Link to="/" style={{ color: "#6366f1", fontWeight: "600", textDecoration: "none" }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;