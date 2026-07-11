import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

const API_URL = process.env.REACT_APP_RAG_API_URL;

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  // ✅ auto redirect if already logged in
  useEffect(() => {
    const isAuthenticated =
      sessionStorage.getItem("isAuthenticated") === "true";

    if (isAuthenticated) {
      navigate("/chat", { replace: true });
    }
  }, [navigate]);

  // Google script load
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = initializeGoogleSignIn;

    document.head.appendChild(script);

    return () => {
      try {
        document.head.removeChild(script);
      } catch {}
    };
  }, []);

  const isValidGmail = (email) => {
    return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email);
  };

  // ---------------- GOOGLE LOGIN ----------------
  const handleGoogleCredentialResponse = async (response) => {
    try {
      setGoogleLoading(true);
      setError("");

      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: response.credential,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      // ✅ IMPORTANT: store FIRST
      sessionStorage.setItem("isAuthenticated", "true");
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("userName", data.user.name);
      sessionStorage.setItem("userEmail", data.user.email);
      sessionStorage.setItem("role", data.user.role);

      window.dispatchEvent(new Event("auth-change"));

      // ✅ force small delay before navigation
      setTimeout(() => {
        navigate("/chat", { replace: true });
      }, 100);
    } catch (error) {
      setError(error.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const initializeGoogleSignIn = () => {
    if (!GOOGLE_CLIENT_ID) return;

    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
      });

      const btnContainer = document.getElementById("google-signin-button");

      if (btnContainer) {
        btnContainer.innerHTML = "";

        window.google.accounts.id.renderButton(btnContainer, {
          theme: "filled_blue",
          size: "large",
          width: 340,
          shape: "pill",
          text: "signin_with",
          logo_alignment: "left",
        });
      }
    }
  };

  // ---------------- EMAIL LOGIN ----------------
  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      if (!email.trim()) return setError("Email is required");
      if (!isValidGmail(email))
        return setError("Please enter a valid Gmail address");
      if (!password.trim()) return setError("Password is required");

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Login failed");

      // ✅ sessionStorage ONLY
      sessionStorage.setItem("isAuthenticated", "true");
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("userName", data.user?.name);
      sessionStorage.setItem("userEmail", data.user?.email);

      navigate("/chat", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  const inputStyle = {
    width: "100%",
    padding: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    marginBottom: "14px",
    fontSize: "15px",
    outline: "none",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#f8fafc,#eef2ff)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#fff",
          borderRadius: "24px",
          padding: "40px",
          boxShadow: "0 20px 60px rgba(0,0,0,.08)",
        }}
      >
        <img
          src="/NVlogo.jpg"
          alt="NewVision"
          style={{ width: "150px", display: "block", margin: "0 auto 20px" }}
        />

        <h1 style={{ textAlign: "center" }}>Welcome back</h1>

        <p style={{ textAlign: "center", color: "#6b7280" }}>
          Sign in to continue to NV AI Assistant
        </p>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#dc2626",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "15px",
            }}
          >
            {error}
          </div>
        )}

        {/* <input
          style={inputStyle}
          type="email"
          placeholder="Gmail address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyPress}
        />

        <input
          style={inputStyle}
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyPress}
        />

        <button
          onClick={() => setShowPassword(!showPassword)}
          style={{
            marginBottom: "10px",
            background: "none",
            border: "none",
            color: "#2563eb",
            cursor: "pointer",
          }}
        >
          {showPassword ? "Hide" : "Show"}
        </button>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "12px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
          }}
        >
          {loading ? "Signing in..." : "Continue"}
        </button>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <Link to="/register">Sign up</Link>
        </div> */}

        <div
          id="google-signin-button"
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 60,
            marginBottom: 60,
          }}
        />
      </div>

      {googleLoading && (
        <div className="google-loader-overlay">
          <div className="google-loader-card">
            <img
              src="/NVlogo.jpg"
              alt="NewVision"
              className="google-loader-logo"
            />
            <div className="google-loader-spinner" />
            <h3 className="google-loader-title">Signing you in</h3>
            <p className="google-loader-text">
              Authenticating with Google
              <span className="loading-dots"></span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
