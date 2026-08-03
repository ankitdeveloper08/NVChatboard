import React from "react";

const SessionExpiredModal = ({ onClose }) => {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999999,
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "420px",
          background: "#fff",
          borderRadius: "28px",
          padding: "36px",
          boxShadow: "0 20px 60px rgba(0,0,0,.15)",
          textAlign: "center",
        }}
      >
        <h3 style={{ marginBottom: "16px", lineHeight: 1.2 }}>
          Session expired
        </h3>
        <p style={{ color: "#555", marginBottom: "28px", fontSize: "16px" }}>
          For security reasons, your session has expired. Please log in again to continue.
        </p>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            height: "50px",
            border: "none",
            borderRadius: "999px",
            background: "#111",
            color: "#fff",
            fontWeight: 600,
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          Log in again
        </button>
      </div>
    </div>
  );
};

export default SessionExpiredModal;
