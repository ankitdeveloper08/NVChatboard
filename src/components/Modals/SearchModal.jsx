import React, { useState, useEffect, useRef } from "react";
import { FaComments, FaSearch, FaTimes } from "react-icons/fa";

const SearchModal = ({ sessions, onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && modalRef.current.contains(e.target)) return;
      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);
  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        color: "black",
      }}
    >
      <div
        ref={modalRef}
        style={{
          background: "white",
          borderRadius: "10px",
          padding: "16px",
          width: "40%",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          maxHeight: "420px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* ❌ Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
            color: "#666",
          }}
          title="Close"
        >
          <FaTimes />
        </button>

        <h5
          style={{ marginBottom: "10px", textAlign: "center", color: "#333" }}
        >
          <FaSearch /> Search Conversations
        </h5>

        <input
          type="text"
          placeholder="Search Conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            marginBottom: "8px",
            outline: "none",
          }}
        />

        <div
          style={{
            maxHeight: "300px",
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          {filtered.length > 0 ? (
            filtered.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  onSelect(s.id);
                  onClose();
                }}
                style={{
                  padding: "8px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f1f1f1")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <FaComments
                  className="chat-icon"
                  style={{ marginRight: "10px" }}
                />
                <span>{s.title} </span>
              </div>
            ))
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "#999",
                padding: "20px 0",
              }}
            >
              No results found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
