import React from "react";
import "../../styles/ProfileModal.css";

const ProfileModal = ({
  isOpen,
  onClose,
  userName,
  userEmail,
  userPicture,
}) => {
  if (!isOpen) return null;

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div
        className="profile-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>

        <div className="profile-header">
          {userPicture ? (
            <img
              src={userPicture}
              alt="Profile"
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar profile-avatar-placeholder">
              {userName?.charAt(0)?.toUpperCase()}
            </div>
          )}

          <h2>{userName}</h2>
          <p className="profile-subtitle">Chat with NewVision AI Assistant</p>
        </div>

        <div className="profile-info">
          <div className="info-card">
            <span className="info-label">📧 Email</span>
            <span className="info-value">{userEmail}</span>
          </div>

          <div className="info-card">
            <span className="info-label">👤 Username</span>
            <span className="info-value">{userName}</span>
          </div>

          <div className="info-card">
            <span className="info-label">⭐ Plan</span>
            <span className="info-value">Free</span>
          </div>
        </div>

        <button className="profile-close-btn" onClick={onClose}>
          Close Profile
        </button>
      </div>
    </div>
  );
};

export default ProfileModal;