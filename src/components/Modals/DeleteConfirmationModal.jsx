import React from "react";
import { MdDeleteOutline, MdWarningAmber } from "react-icons/md";

const DeleteConfirmationModal = ({
  deleteTargetId,
  setDeleteTargetId,
  handleConfirmDelete,
}) => {
  if (!deleteTargetId) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={() => setDeleteTargetId(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          width: "390px",
          padding: "28px",
          borderRadius: "18px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          animation: "fadeIn 0.2s ease-in-out",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: "55px",
            height: "55px",
            borderRadius: "50%",
            background: "#fee2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
          }}
        >
          <MdWarningAmber size={28} color="#dc2626" />
        </div>

        {/* Title */}
        <h3
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: "700",
            color: "#111827",
            marginBottom: "10px",
          }}
        >
          Delete conversation?
        </h3>

        {/* Message */}
        <p
          style={{
            color: "#6b7280",
            fontSize: "14px",
            lineHeight: "1.6",
            marginBottom: "22px",
          }}
        >
          Are you sure you want to delete{" "}
          <strong style={{ color: "#111827" }}>"{deleteTargetId.title}"</strong>
          ?
          <br />
          This action cannot be undone. All messages in this conversation will
          be permanently removed.
        </p>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            onClick={() => setDeleteTargetId(null)}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#374151",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={() => handleConfirmDelete(deleteTargetId.id)}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "none",
              background: "#dc2626",
              color: "#ffffff",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <MdDeleteOutline size={20} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
