import React from "react";
import "../../styles/ChatLoader.css";

const ChatLoader = ({ text = "Loading chats..." }) => {
  return (
    <div className="chat-loader-container">
        <div className="main-loader-spinner">
          <span></span>
          <span></span>
          <span></span>
        </div>
      <p className="chat-loader-text">{text}</p>
    </div>
  );
};

export default ChatLoader;