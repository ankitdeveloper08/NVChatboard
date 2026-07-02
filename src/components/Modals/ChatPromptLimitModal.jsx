import React from "react";
import "../../styles/ChatPromptLimitModal.css";

const ChatPromptLimitModal = ({
  isOpen,
  onClose,
  onNewChat,
}) => {
  if (!isOpen) return null;

  return (
    <div className="prompt-limit-banner">
      <div className="prompt-limit-card">
        <div className="prompt-limit-message">
          <strong>Conversation limit reached.</strong>
          <span>This chat is limited to 10 prompts. Start a new conversation to continue.</span>
        </div>
        <div className="prompt-limit-actions">
          <button className="prompt-limit-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="prompt-limit-new-chat" onClick={onNewChat}>
            New Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPromptLimitModal;