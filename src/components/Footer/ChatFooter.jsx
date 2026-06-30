import React from "react";
import { FaMicrophone, FaPaperPlane, FaStop } from "react-icons/fa";

const ChatFooter = ({
  input,
  setInput,
  inputRef,
  adjustTextareaHeight,
  handleKeyPress,
  handleVoiceStart,
  listening,
  loading,
  handleStop,
  handleSend,
  TEXTAREA_MAX_HEIGHT,
  limitExpired,
}) => {
  console.log("limitExpired:", limitExpired);
  return (
    <footer
      style={{
        padding: "16px 24px",
        background: "#f4f6f9",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "850px",
          background: "#fff",
          border: "1px solid #d9d9d9",
          borderRadius: "28px",
          padding: "10px 14px",
          display: "flex",
          alignItems: "flex-end",
          gap: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            adjustTextareaHeight(e.target);
          }}
          onKeyDown={handleKeyPress}
          placeholder="Ask anything..."
          rows={1}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            resize: "none",
            background: "transparent",
            fontSize: "16px",
            lineHeight: "1.5",
            maxHeight: TEXTAREA_MAX_HEIGHT,
            overflowY: "auto",
            paddingTop: "6px",
          }}
        />

        <button
          onClick={handleVoiceStart}
          disabled={limitExpired}
          title={listening ? "Listening..." : "Voice Input"}
          style={{
            width: "38px",
            height: "38px",
            border: "none",
            borderRadius: "50%",
            background: listening ? "#10a37f" : "transparent",
            color: listening ? "#fff" : "#555",
            cursor: limitExpired ? "not-allowed" : "pointer",
            opacity: limitExpired ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
          }}
        >
          <FaMicrophone />
        </button>

        {loading ? (
          <button
            onClick={handleStop}
            style={{
              width: "38px",
              height: "38px",
              border: "none",
              borderRadius: "50%",
              background: "#202123",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FaStop />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim() || limitExpired}
            style={{
              width: "38px",
              height: "38px",
              border: "none",
              borderRadius: "50%",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: input.trim() && !limitExpired ? "#202123" : "#d1d5db",
              cursor: input.trim() && !limitExpired ? "pointer" : "not-allowed",
              opacity: limitExpired ? 0.5 : 1,
            }}
          >
            <FaPaperPlane size={14} />
          </button>
        )}
      </div>
    </footer>
  );
};

export default ChatFooter;