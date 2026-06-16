import React from "react";

const FooterMenu = ({
  userName,
  showFooterMenu,
  footerMenuRef,
  menuItemStyle,
  setShowFooterMenu,
  setShowProfileModal,
  handleLogout,
}) => {
  if (!showFooterMenu) return null;

  const disabledMenuStyle = {
    ...menuItemStyle,
    opacity: 0.5,
    cursor: "not-allowed",
    pointerEvents: "none",
  };

  return (
    <div
      ref={footerMenuRef}
      style={{
        position: "fixed",
        bottom: "80px",
        left: "20px",
        backgroundColor: "#fff",
        border: "1px solid #e5e5e5",
        borderRadius: "20px",
        boxShadow: "0 18px 50px rgba(15, 23, 42, 0.18)",
        width: "230px",
        zIndex: 99999,
        overflow: "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* User Info */}
      <div
        style={{
          padding: "1rem",
          borderBottom: "1px solid #e5e5e5",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              backgroundColor: "#10a37f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            {userName?.charAt(0).toUpperCase()}
          </div>

          <div>
            <p
              style={{
                margin: 0,
                fontWeight: 700,
              }}
            >
              {userName}
            </p>
            <p
              style={{
                margin: "4px 0 0",
                color: "#6b7280",
                fontSize: "0.85rem",
              }}
            >
              Free Plan
            </p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div style={{ padding: "0.75rem 0" }}>
        <button disabled style={disabledMenuStyle}>
          ⭐ Upgrade Plan
        </button>

        <button disabled style={disabledMenuStyle}>
          ✨ Personalization
        </button>

        <button
          onClick={() => {
            setShowFooterMenu(false);
            setShowProfileModal(true);
          }}
          style={menuItemStyle}
        >
          👤 Profile
        </button>

        <button disabled style={disabledMenuStyle}>
          ⚙️ Settings
        </button>

        <button disabled style={disabledMenuStyle}>
          ❓ Help
        </button>
      </div>

      {/* Logout */}
      <div
        style={{
          padding: "1rem",
          borderTop: "1px solid #e5e5e5",
        }}
      >
        <button
          onClick={() => {
            setShowFooterMenu(false);
            handleLogout();
          }}
          style={{
            width: "100%",
            height: "42px",
            border: "none",
            borderRadius: "10px",
            background: "#111827",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
};

export default FooterMenu;