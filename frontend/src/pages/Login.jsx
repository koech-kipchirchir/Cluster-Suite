import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { setAuthToken } from "../api";

function Login() {
  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");
    
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    try {
      setLoading(true);
      console.log("🚀 Sending login request...");

      const res = await api.post("/auth/login", {
        username,
        password,
      });

      console.log(
        "✅ LOGIN RESPONSE:",
        res.data
      );

      if (!res.data.token) {
        setError("No token returned from server");
        return;
      }

      localStorage.setItem("token", res.data.token);
      setAuthToken(res.data.token);

      navigate("/dashboard");
    } catch (err) {
      console.log(
        "❌ LOGIN ERROR:",
        err
      );

      console.log(
        "❌ SERVER RESPONSE:",
        err.response?.data
      );

      // Clear password on failed login for security
      setPassword("");

      setError(
        err.response?.data?.message ||
          "Login failed"
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
        width: "90%",
        padding: "40px",
        background: "white",
        borderRadius: "16px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#1e293b", margin: "0 0 8px 0" }}>Welcome Back</h2>
          <p style={{ color: "#64748b", margin: 0 }}>Log in to manage your Cluster Suite</p>
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

        <form onSubmit={login}>
          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="username" style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: "#475569" }}>Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
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
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
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
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s"
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", color: "#64748b", fontSize: "14px" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#6366f1", fontWeight: "600", textDecoration: "none" }}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;