import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  // Redirect if already logged in
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    if (isAuthenticated) {
      navigate("/chat", { replace: true });
    }
  }, [navigate]);

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleSignIn;
    script.onerror = () => setError("Failed to load Google Sign-In. Check your connection.");
    document.head.appendChild(script);

    return () => {
      try {
        document.head.removeChild(script);
      } catch (e) {
        /* ignore */
      }
    };
  }, []);

  const decodeJwt = (token) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  const handleGoogleCredentialResponse = (response) => {
    if (!response?.credential) {
      setError("Unable to sign in with Google. Please try again.");
      return;
    }

    try {
      const payload = decodeJwt(response.credential);
      const email = payload?.email || "Google User";
      const name = payload?.name || email;

      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userName", name);
      localStorage.setItem("userEmail", email);
      localStorage.setItem("authProvider", "google-oauth");
      navigate("/chat", { replace: true });
    } catch (err) {
      setError("Failed to process login. Please try again.");
      setLoading(false);
    }
  };

  const initializeGoogleSignIn = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Google OAuth is not configured. Please set REACT_APP_GOOGLE_CLIENT_ID in .env");
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
      });

      // Render the Sign-In button
      const buttonContainer = document.getElementById("google-signin-button");
      if (buttonContainer) {
        window.google.accounts.id.renderButton(
          buttonContainer,
          {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "signin_with",
          }
        );
      }
    }
  };

  const handleGooglePrompt = () => {
    setLoading(true);
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        setLoading(false);
      });
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#f5f5f5",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
      }}
    >
      {/* Logo */}
      <div style={{ position: "absolute", top: "2rem", display: "flex", alignItems: "center" }}>
        <img
          src="/NVlogo.jpg"
          alt="NewVision Logo"
          style={{ width: "120px", height: "auto" }}
        />
      </div>

      {/* Main Content Card */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: "500px",
          width: "100%",
          backgroundColor: "#fff",
          padding: "3rem 2rem",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Heading */}
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            color: "#333",
            marginBottom: "2rem",
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          Login
        </h1>

        {/* Error Message */}
        {error && (
          <div
            style={{
              color: "#d32f2f",
              fontSize: "0.9rem",
              marginBottom: "1.5rem",
              textAlign: "center",
              padding: "0.75rem 1rem",
              backgroundColor: "#ffebee",
              borderRadius: "8px",
              width: "100%",
              border: "1px solid #ef5350",
            }}
          >
            {error}
          </div>
        )}

        {/* Google Sign-In Button Container */}
        <div
          id="google-signin-button"
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginBottom: "1rem",
            minHeight: "48px",
          }}
        />

        {/* Google Login Button */}
        <button
          onClick={handleGooglePrompt}
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.9rem 1.5rem",
            borderRadius: "8px",
            border: "none",
            backgroundColor: loading ? "#0056b3" : "#0066cc",
            fontSize: "1.05rem",
            fontWeight: 600,
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            transition: "all 0.2s ease",
            minHeight: "48px",
            opacity: loading ? 0.8 : 1,
          }}
          onMouseOver={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = "#0052a3";
            }
          }}
          onMouseOut={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = "#0066cc";
            }
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ opacity: 0.9 }}
          >
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" />
          </svg>
          <span>{loading ? "Signing in..." : "Login with Google"}</span>
        </button>
      </div>
    </div>
  );
};

export default Login;
