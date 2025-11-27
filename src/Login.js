import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // For inline error message
  const navigate = useNavigate();

  // 🔹 Redirect if already logged in
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    if (isAuthenticated) {
      navigate("/chat", { replace: true });
    }
  }, [navigate]);

  const handleLogin = (e) => {
    e.preventDefault();

    // Hardcoded credentials
    if (username === "admin" && password === "1234") {
      localStorage.setItem("isAuthenticated", "true");
      navigate("/chat", { replace: true });
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Logo */}
      <div style={{ position: "absolute", top: "40px", display: "flex", alignItems: "center" }}>
        <img
          src="/NVlogo.jpg"
          alt="NewVision Logo"
          style={{ width: "120px", height: "auto" }}
        />
      </div>

      {/* Login Card */}
      <div
        style={{
          background: "#fff",
          padding: "2.5rem",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          width: "360px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h2 style={{ marginBottom: "1rem", color: "#333" }}>Login</h2>
        <form
          onSubmit={handleLogin}
          style={{ width: "100%", display: "flex", flexDirection: "column" }}
        >
          <label style={{ marginBottom: "0.5rem", color: "#555" }}>Username</label>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              padding: "0.75rem",
              marginBottom: "1rem",
              border: "1px solid #ccc",
              borderRadius: "8px",
              outline: "none",
              fontSize: "1rem",
            }}
          />

          <label style={{ marginBottom: "0.5rem", color: "#555" }}>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: "0.75rem",
              marginBottom: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "8px",
              outline: "none",
              fontSize: "1rem",
            }}
          />

          {/* Error Message */}
          {error && (
            <div
              style={{
                color: "red",
                fontSize: "0.9rem",
                marginBottom: "1rem",
                textAlign: "center",
                transition: "opacity 0.3s ease",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              backgroundColor: "#0078d4",
              color: "#fff",
              border: "none",
              padding: "0.75rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1rem",
              transition: "background 0.3s ease",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#005a9e")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#0078d4")}
          >
            Login
          </button>
        </form>
      </div>

      {/* Footer */}
      <p style={{ marginTop: "2rem", color: "#999", fontSize: "0.9rem" }}>
        © {new Date().getFullYear()} NewVision Chatboard v1.2
      </p>
    </div>
  );
};

export default Login;
