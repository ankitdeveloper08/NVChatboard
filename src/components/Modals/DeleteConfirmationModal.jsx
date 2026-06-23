import React from "react";

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
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={() => setDeleteTargetId(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          width: "360px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        <h3
          style={{
            margin: 0,
            marginBottom: "8px",
          }}
        >
          Delete conversation?
        </h3>

        <p
          style={{
            marginTop: 0,
            marginBottom: "16px",
          }}
        >
          Once you delete a conversation, the messages are gone forever on every
          device.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
          }}
        >
          <button
            onClick={() => setDeleteTargetId(null)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={() => handleConfirmDelete(deleteTargetId)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "none",
              background: "#d9534f",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
