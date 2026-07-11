import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_URL = "https://openaiserver-e9lo.onrender.com/api/auth";

const Register = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidGmail = (email) => {
    return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email);
  };

  const isStrongPassword = (password) => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password)
    );
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError("");

      if (!name.trim()) {
        setError("Full name is required");
        return;
      }

      if (!isValidGmail(email)) {
        setError(
          "Only Gmail addresses are allowed (example@gmail.com)"
        );
        return;
      }

      if (!isStrongPassword(password)) {
        setError(
          "Password must contain 8+ characters, uppercase, lowercase and a number"
        );
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      if (!acceptTerms) {
        setError("Please accept Terms & Conditions");
        return;
      }

      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      alert("Registration successful. Please login.");

      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    marginBottom: "12px",
    fontSize: "14px",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#f5f7fa,#e4eaf1)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          background: "#fff",
          borderRadius: "24px",
          padding: "40px",
          boxShadow: "0 20px 50px rgba(0,0,0,.08)",
        }}
      >
        <img
          src="/NVlogo.jpg"
          alt="NewVision"
          style={{
            width: "140px",
            display: "block",
            margin: "0 auto 25px",
          }}
        />

        <h1
          style={{
            textAlign: "center",
            fontSize: "32px",
            marginBottom: "10px",
          }}
        >
          Create your account
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#6b7280",
            marginBottom: "30px",
          }}
        >
          Continue to NewVision | AI Assistant
        </p>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#dc2626",
              padding: "12px",
              borderRadius: "12px",
              marginBottom: "20px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <input
          style={inputStyle}
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          style={inputStyle}
          type="email"
          placeholder="Gmail Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div style={{ position: "relative" }}>
          <input
            style={inputStyle}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(!showPassword)
            }
            style={{
              position: "absolute",
              right: "12px",
              top: "12px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#2563eb",
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#6b7280",
            marginBottom: "15px",
          }}
        >
          Password must contain:
          <ul
            style={{
              marginTop: "6px",
              paddingLeft: "18px",
            }}
          >
            <li>Minimum 8 characters</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
          </ul>
        </div>

        <div style={{ position: "relative" }}>
          <input
            style={inputStyle}
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
          />

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword(
                !showConfirmPassword
              )
            }
            style={{
              position: "absolute",
              right: "12px",
              top: "12px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#2563eb",
            }}
          >
            {showConfirmPassword ? "Hide" : "Show"}
          </button>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) =>
              setAcceptTerms(e.target.checked)
            }
          />
          I agree to the Terms & Conditions
        </label>

        <button
          onClick={handleRegister}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: "12px",
            cursor: loading
              ? "not-allowed"
              : "pointer",
            background: "#2563eb",
            color: "#fff",
            fontWeight: 600,
            fontSize: "15px",
          }}
        >
          {loading
            ? "Creating Account..."
            : "Create Account"}
        </button>

        <div
          style={{
            textAlign: "center",
            marginTop: "20px",
            color: "#6b7280",
          }}
        >
          Already have an account?{" "}
          <Link to="/">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;