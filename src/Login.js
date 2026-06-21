import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_URL = "https://openaiserver-e9lo.onrender.com/api/auth";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";

    if (isAuthenticated) {
      navigate("/chat", { replace: true });
    }
  }, [navigate]);

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

  const handleGoogleCredentialResponse = async (response) => {
    try {
      const res = await fetch("https://openaiserver-e9lo.onrender.com/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: response.credential,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("token", data.token);
      localStorage.setItem("userName", data.user.name);
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("authProvider", "google");

      navigate("/chat", { replace: true });
    } catch (error) {
      setError(error.message);
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
          theme: "outline",
          size: "large",
          width: "350",
          shape: "pill",
        });
      }
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      if (!email.trim()) {
        setError("Email is required");
        return;
      }

      if (!isValidGmail(email)) {
        setError("Please enter a valid Gmail address");
        return;
      }

      if (!password.trim()) {
        setError("Password is required");
        return;
      }

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("isAuthenticated", "true");

      localStorage.setItem("token", data.token || "");

      localStorage.setItem("userName", data.user?.name || "");

      localStorage.setItem("userEmail", data.user?.email || "");

      localStorage.setItem("authProvider", "local");

      navigate("/chat", {
        replace: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    marginBottom: "14px",
    fontSize: "15px",
    boxSizing: "border-box",
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
          style={{
            width: "150px",
            display: "block",
            margin: "0 auto 20px",
          }}
        />

        <h1
          style={{
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          Welcome back
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#6b7280",
            marginBottom: "30px",
          }}
        >
          Sign in to continue to NewVision AI
        </p>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#dc2626",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "15px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <input
          style={inputStyle}
          type="email"
          placeholder="Gmail address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyPress}
        />

        <div
          style={{
            position: "relative",
          }}
        >
          <input
            style={{
              ...inputStyle,
              marginBottom: "0",
            }}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyPress}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#2563eb",
              fontWeight: 600,
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <div
          style={{
            textAlign: "right",
            marginTop: "10px",
            marginBottom: "20px",
          }}
        ></div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            background: "#2563eb",
            color: "#fff",
            fontWeight: 600,
            fontSize: "15px",
          }}
        >
          {loading ? "Signing in..." : "Continue"}
        </button>

        <div
          style={{
            textAlign: "center",
            marginTop: "18px",
            color: "#6b7280",
          }}
        >
          Don't have an account?{" "}
          <Link
            to="/register"
            style={{
              color: "#2563eb",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Sign up
          </Link>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            margin: "30px 0",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "#e5e7eb",
            }}
          />

          <span
            style={{
              margin: "0 12px",
              color: "#9ca3af",
              fontSize: "14px",
            }}
          >
            OR
          </span>

          <div
            style={{
              flex: 1,
              height: "1px",
              background: "#e5e7eb",
            }}
          />
        </div>

        <div
          id="google-signin-button"
          style={{
            display: "flex",
            justifyContent: "center",
          }}
        />
      </div>
    </div>
  );
};

export default Login;
