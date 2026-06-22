import { useState } from "react";
import axios from "axios";

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [country, setCountry] = useState("Kenya");

  const submit = async () => {
    try {
      const endpoint = isLogin
        ? "http://localhost:5000/api/auth/login"
        : "http://localhost:5000/api/auth/register";

      // Map country to common shilling currencies when appropriate
      const countryToCurrency = {
        Kenya: "KES",
        Uganda: "UGX",
        Tanzania: "TZS",
      };

      const res = await axios.post(endpoint, {
        username,
        password,
        country,
        currency: countryToCurrency[country] || "KES",
      });

      if (isLogin) {
        localStorage.setItem("token", res.data.token);
        onLogin();
      } else {
        setMessage("User registered successfully");
      }
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Error"
      );
    }
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "100px auto",
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "10px",
      }}
    >
      <h2>
        {isLogin ? "Login" : "Register"}
      </h2>

      <input
        placeholder="Username"
        value={username}
        onChange={(e) =>
          setUsername(e.target.value)
        }
        style={{
          width: "100%",
          marginBottom: "10px",
          padding: "10px",
        }}
      />

      {!isLogin && (
        <div style={{ margin: "10px 0" }}>
          <label style={{ display: "block", marginBottom: 6 }}>Country</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ width: "100%", padding: 10 }}>
            <option value="Kenya">Kenya (KES)</option>
            <option value="Uganda">Uganda (UGX)</option>
            <option value="Tanzania">Tanzania (TZS)</option>
          </select>
        </div>
      )}

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
        style={{
          width: "100%",
          marginBottom: "10px",
          padding: "10px",
        }}
      />

      <button
        onClick={submit}
        style={{
          width: "100%",
          padding: "10px",
        }}
      >
        {isLogin ? "Login" : "Register"}
      </button>

      <p>{message}</p>

      <button
        onClick={() =>
          setIsLogin(!isLogin)
        }
      >
        Switch to{" "}
        {isLogin
          ? "Register"
          : "Login"}
      </button>
    </div>
  );
}

export default Auth;