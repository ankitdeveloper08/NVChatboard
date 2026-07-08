import React from "react";

const ChatLimitModal = ({ message, onUpgrade, onClose }) => {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "850px",
          minHeight: "88px",
          background: "#ffffff",
          border: "1px solid #e5e5e5",
          borderRadius: "22px",
          padding: "18px 26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        {/* Left Section */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "18px",
              fontWeight: "700",
              color: "#111",
            }}
          >
            <span
              style={{
                fontSize: "22px",
              }}
            >
              ✨
            </span>

            <span>You've reached the Free limit for chats</span>
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize: "15px",
              color: "#666",
            }}
          >
            {message || "Daily prompt limit reached."}
          </div>
        </div>

        {/* Right Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {/* <button
            onClick={onUpgrade}
            style={{
              height: "44px",
              padding: "0 26px",
              background: "#000",
              color: "#fff",
              border: "none",
              borderRadius: "24px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Upgrade now
          </button>

          <button
            onClick={onClose}
            style={{
              height: "44px",
              padding: "0 26px",
              background: "#fff",
              color: "#111",
              border: "1px solid #ddd",
              borderRadius: "24px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Close
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default ChatLimitModal;
