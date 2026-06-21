import React, { useState } from "react";

const API_URL = "https://openaiserver-e9lo.onrender.com/api/auth";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setMessage(
        `Reset token generated: ${data.resetToken}`
      );
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
      <h2>Forgot Password</h2>

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
        type="email"
        placeholder="Enter Email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px",
        }}
      />

      <button onClick={handleSubmit}>
        Send Reset Link
      </button>
    </div>
  );
};

export default ForgotPassword;