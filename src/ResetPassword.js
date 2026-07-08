import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = "https://openaiserver-e9lo.onrender.com/api/auth";

const ResetPassword = () => {
  const { token } = useParams();

  const navigate = useNavigate();

  const [password, setPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const handleReset = async () => {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setMessage("Password reset successful");

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div
      style={{
        maxWidth: "450px",
        margin: "50px auto",
      }}
    >
      <h2>Reset Password</h2>

      {error && (
        <div style={{ color: "red" }}>
          {error}
        </div>
      )}

      {message && (
        <div style={{ color: "green" }}>
          {message}
        </div>
      )}

      <input
        type="password"
        placeholder="New Password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px",
        }}
      />

      <button onClick={handleReset}>
        Reset Password
      </button>
    </div>
  );
};

export default ResetPassword;