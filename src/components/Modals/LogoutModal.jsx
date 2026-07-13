import React from "react";

const LogoutModal = ({ userName, email, onCancel, onLogout }) => {
  return (
    <div
      onClick={onCancel}
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
          width: "450px",
          background: "#fff",
          borderRadius: "28px",
          padding: "36px",
          boxShadow: "0 20px 60px rgba(0,0,0,.15)",
        }}
      >
        <h3
          style={{
            textAlign: "center",
            marginBottom: "28px",
            lineHeight: 1.2,
          }}
        >
          Are you sure you
          <br />
          want to log out?
        </h3>

        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: "20px",
            padding: "10px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "#10a37f",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "20px",
            }}
          >
            {userName?.charAt(0).toUpperCase()}
          </div>

          <div>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 600,
              }}
            >
              {userName}
            </div>

            <div
              style={{
                color: "#666",
                fontSize: "18px",
                marginTop: "4px",
              }}
            >
              {email}
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            width: "100%",
            height: "50px",
            border: "none",
            borderRadius: "999px",
            background: "#111",
            color: "#fff",
            fontWeight: 600,
            fontSize: "20px",
            cursor: "pointer",
            marginBottom: "16px",
          }}
        >
          Log out
        </button>

        <button
          onClick={onCancel}
          style={{
            width: "100%",
            height: "50px",
            borderRadius: "999px",
            border: "1px solid #ddd",
            background: "#fff",
            fontWeight: 600,
            fontSize: "20px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default LogoutModal;
