import React from "react";
import { MdViewSidebar } from "react-icons/md";
import { FaSearch } from "react-icons/fa";
import { FaPenToSquare } from "react-icons/fa6";
import SearchModal from "../Modals/SearchModal";
import "../../styles/Sidebar.css";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  createNewChat,
  showSearch,
  setShowSearch,
  sessions,
  activeSessionId,
  openChat,
  openMenuId,
  setOpenMenuId,
  editingId,
  setEditingId,
  editingValue,
  setEditingValue,
  renameChat,
  token,
  setSessions,
  setActiveSessionId,
  setDeleteTargetId,
  userName,
  setShowFooterMenu,
  deletingChatId,
  setDeletingChatId,
  limitExpired,
}) => {
  const { user } = useAuth();
   const API_URL = process.env.REACT_APP_RAG_API_URL;
  return (
    <>
      {/* Expanded Sidebar */}
      <aside className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <span className="sidebar-title">
              <img src="/NVlogo.jpg" alt="NV Logo" height="50px" />
              <span className="sidekick-text"> |</span>
              <span className="sidekick-text">AI Assistant</span>
            </span>

            {!isSidebarCollapsed && (
              <button
                className="sidebar-toggle"
                onClick={() => setIsSidebarCollapsed(true)}
              >
                <MdViewSidebar />
              </button>
            )}
          </div>
          {user?.role === "ADMIN" && (
            <button className="new-chat-btn">Upload Document</button>
          )}

          <button
            // disabled={limitExpired}
            className="new-chat-btn"
            onClick={createNewChat}
          >
            <FaPenToSquare /> <b> New Conversation</b>
          </button>

          <button
            className="new-chat-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowSearch((prev) => !prev);
            }}
          >
            <FaSearch /> <b>Search Conversations</b>
          </button>

          {showSearch && (
            <SearchModal
              sessions={sessions}
              onSelect={(id) => setActiveSessionId(id)}
              onClose={() => setShowSearch(false)}
            />
          )}

          <div className="session-list">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`session-item ${
                  s.id === activeSessionId ? "active" : ""
                }`}
              >
                <div style={{ flex: 1 }}>
                  {editingId === s.id ? (
                    <input
                      autoFocus
                      className="session-title-input"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => {
                        const v = editingValue.trim() || "Untitled";
                        renameChat(s.id, v);
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = editingValue.trim() || "Untitled";
                          renameChat(s.id, v);
                          setEditingId(null);
                        } else if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => deletingChatId !== s.id && openChat(s.id)}
                      style={{
                        cursor: deletingChatId === s.id ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {deletingChatId === s.id ? (
                        <>
                          <span className="sidebar-delete-spinner" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          {s.title.length > 20 ? s.title.slice(0, 20) : s.title}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  className="session-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === s.id ? null : s.id);
                  }}
                >
                  ⋮
                </button>

                {openMenuId === s.id && (
                  <div
                    className="session-menu"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="session-menu-item"
                      onClick={() => {
                        setEditingId(s.id);
                        setEditingValue(s.title || "");
                        setOpenMenuId(null);
                      }}
                    >
                      Rename
                    </button>

                    <button
                      className="session-menu-item"
                      onClick={async () => {
                        try {
                          const response = await fetch(
                            `${API_URL}/api/chats/${s.id}/duplicate`,
                            {
                              method: "POST",
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                            },
                          );

                          const duplicatedChat = await response.json();

                          const formattedChat = {
                            id: duplicatedChat.id,
                            title: duplicatedChat.title,
                            messages:
                              duplicatedChat.messages?.map((m) => ({
                                id: m.id,
                                role: m.role,
                                content: m.content,
                              })) || [],
                          };

                          setSessions((prev) => [formattedChat, ...prev]);

                          setActiveSessionId(formattedChat.id);
                          setOpenMenuId(null);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    >
                      Duplicate
                    </button>

                    <button
                      className="session-menu-delete"
                      onClick={() => {
                        setDeleteTargetId({
                          id: s.id,
                          title: s.title,
                        });
                        setOpenMenuId(null);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!isSidebarCollapsed && (
            <div
              style={{
                position: "relative",
                background: "#f2f4f7",
                color: "#1f2937",
                padding: "12px 14px",
                margin: "12px",
                borderRadius: "10px",
                fontWeight: "600",
                display: "flex",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setShowFooterMenu((prev) => !prev);
              }}
            >
              <div>{userName || "Unknown user"}</div>

              <span
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#10a37f",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {userName?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Collapsed Sidebar */}
      {isSidebarCollapsed && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "48px",
            background: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "12px",
            gap: "10px",
          }}
        >
          <img
            src="/NVlg.ico"
            alt="NV Logo"
            style={{
              width: "32px",
              height: "32px",
              cursor: "pointer",
            }}
            onClick={() => setIsSidebarCollapsed(false)}
          />

          <button
            style={{
              width: "32px",
              height: "32px",
              background: "gainsboro",
              borderRadius: "4px",
              cursor: "pointer",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "black",
              fontSize: "16px",
            }}
            onClick={() => setIsSidebarCollapsed(false)}
          >
            <MdViewSidebar />
          </button>

          <button
            style={{
              width: "32px",
              height: "32px",
              background: "gainsboro",
              borderRadius: "4px",
              cursor: "pointer",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "black",
              fontSize: "20px",
            }}
            onClick={createNewChat}
          >
            <FaPenToSquare />
          </button>

          <button
            style={{
              width: "32px",
              height: "32px",
              background: "gainsboro",
              borderRadius: "4px",
              cursor: "pointer",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "black",
              fontSize: "16px",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowSearch((prev) => !prev);
            }}
          >
            <FaSearch />
          </button>

          {showSearch && (
            <SearchModal
              sessions={sessions}
              onSelect={(id) => setActiveSessionId(id)}
              onClose={() => setShowSearch(false)}
            />
          )}

          <div
            style={{
              position: "absolute",
              bottom: 20,
            }}
          >
            <span
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#10a37f",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setShowFooterMenu((prev) => !prev);
              }}
            >
              {userName?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
