import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const isAuthenticated =
      localStorage.getItem("isAuthenticated") === "true";

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

    script.onerror = () =>
      setError("Failed to load Google Sign-In service.");

    document.head.appendChild(script);

    return () => {
      try {
        document.head.removeChild(script);
      } catch {
        // ignore
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
          .map(
            (c) =>
              "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
          )
          .join("")
      );

      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  const handleGoogleCredentialResponse = (response) => {
    try {
      if (!response?.credential) {
        setError("Google authentication failed.");
        return;
      }

      const payload = decodeJwt(response.credential);

      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem(
        "userName",
        payload?.name || "Google User"
      );
      localStorage.setItem(
        "userEmail",
        payload?.email || ""
      );
      localStorage.setItem(
        "authProvider",
        "google-oauth"
      );

      navigate("/chat", { replace: true });
    } catch {
      setError("Login failed. Please try again.");
    }
  };

  const initializeGoogleSignIn = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError(
        "Missing REACT_APP_GOOGLE_CLIENT_ID in environment configuration."
      );
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
      });

      const btnContainer = document.getElementById(
        "google-signin-button"
      );

      if (btnContainer) {
        btnContainer.innerHTML = "";

        window.google.accounts.id.renderButton(
          btnContainer,
          {
            theme: "outline",
            size: "large",
            width: "350",
            text: "signin_with",
            shape: "pill",
          }
        );
      }
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f5f7fa 0%, #e4eaf1 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "450px",
          background: "#fff",
          borderRadius: "20px",
          padding: "40px",
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <img
          src="/NVlogo.jpg"
          alt="NewVision"
          style={{
            width: "140px",
            marginBottom: "25px",
          }}
        />

        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            marginBottom: "10px",
            color: "#111827",
          }}
        >
          Welcome Back
        </h1>

        <p
          style={{
            color: "#6b7280",
            marginBottom: "30px",
            fontSize: "0.95rem",
          }}
        >
          Sign in to continue to NewVision AI Assistant
        </p>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#dc2626",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        <div
          id="google-signin-button"
          style={{
            display: "flex",
            justifyContent: "center",
            minHeight: "44px",
          }}
        />

        {loading && (
          <p
            style={{
              marginTop: "15px",
              color: "#6b7280",
            }}
          >
            Signing in...
          </p>
        )}

        <div
          style={{
            marginTop: "35px",
            fontSize: "0.85rem",
            color: "#9ca3af",
          }}
        >
          By continuing, you agree to use your Google account
          for authentication.
        </div>
      </div>
    </div>
  );
};

export default Login;