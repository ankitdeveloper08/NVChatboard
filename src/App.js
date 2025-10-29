import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import js from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import profiles from "./profile.json";
import "./App.css";

SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("json", json);

function App() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const chatEndRef = useRef(null);

  // Load stored chats
  useEffect(() => {
    const stored = localStorage.getItem("chatSessions");
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure each message has a stable id so copy buttons can target a specific block
      const withIds = parsed.map((sess) => ({
        ...sess,
        messages: (sess.messages || []).map((m) =>
          m.id ? m : { ...m, id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }
        ),
      }));
      setSessions(withIds);
      if (withIds.length > 0) setActiveSessionId(withIds[0].id);
    }
  }, []);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSessionId]);

  // Persist chats
  useEffect(() => {
    localStorage.setItem("chatSessions", JSON.stringify(sessions));
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const createNewChat = () => {
    const newChat = {
      id: `chat-${Date.now()}`,
      title: "New Conversation",
      messages: [],
    };
    setSessions((prev) => [newChat, ...prev]);
    setActiveSessionId(newChat.id);
  };

  // Create a new chat from a suggestion and optionally send immediately
  const handleSuggestion = (text, sendImmediately = true) => {
    const newChat = {
      id: `chat-${Date.now()}`,
      title: text.length > 30 ? text.slice(0, 30) : text,
      messages: [],
    };
    setSessions((prev) => [newChat, ...prev]);
    setActiveSessionId(newChat.id);
    setInput(text);
    if (sendImmediately) {
      // allow state to settle so activeSession is available in handleSend
      setTimeout(() => {
        handleSend();
      }, 50);
    }
  };

  const deleteChat = (id) => {
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (id === activeSessionId && filtered.length > 0)
      setActiveSessionId(filtered[0].id);
    else if (filtered.length === 0) setActiveSessionId(null);
  };

  const handleConfirmDelete = (id) => {
    // perform the delete and close the confirmation modal
    deleteChat(id);
    setDeleteTargetId(null);
  };

  const renameChat = (id, title) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    );
  };

  const handleSend = async () => {
    if (!input.trim() || !activeSession) return;

    const userMessage = {
      role: "user",
      content: input,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    const updatedSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? { ...s, messages: [...s.messages, userMessage] }
        : s
    );
    setSessions(updatedSessions);
    setInput("");
    setLoading(true);

    try {
      const systemPrompt = {
        role: "system",
        content: `You are a helpful assistant who knows the following team members:
${JSON.stringify(profiles.users, null, 2)}

If the user asks about them, answer using this info. Otherwise, respond normally.`,
      };

      const res = await fetch(
        "https://sawdusty-unscaly-kyong.ngrok-free.dev/v1/chat/completions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemma-3-1b",
            stream: true,
            messages: [systemPrompt, ...activeSession.messages, userMessage],
          }),
        }
      );

      if (!res.ok || !res.body) throw new Error("No stream received.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullMessage = "";
      let done = false;

      // Add empty assistant message while streaming (include id)
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    role: "assistant",
                    content: "",
                    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  },
                ],
              }
            : s
        )
      );

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        const chunk = decoder.decode(value, { stream: true });

        const lines = chunk
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line !== "");

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.replace("data:", "").trim();
            if (data === "[DONE]") {
              done = true;
              break;
            }
            try {
              const json = JSON.parse(data);
              const token = json.choices?.[0]?.delta?.content || "";
              if (token) {
                fullMessage += token;
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === activeSessionId
                      ? {
                          ...s,
                          messages: s.messages.map((m, idx) =>
                            idx === s.messages.length - 1
                              ? { ...m, content: fullMessage }
                              : m
                          ),
                        }
                      : s
                  )
                );
              }
            } catch {}
          }
        }
      }

      if (activeSession.title === "New Chat" && input.trim()) {
        renameChat(activeSessionId, input.slice(0, 30));
      }
    } catch (err) {
      console.error(err);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    role: "assistant",
                    content: "❌ Error: Could not reach LM Studio API.",
                    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  },
                ],
              }
            : s
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- JSX ---
  return (
  <div className="app-container" onClick={() => setOpenMenuId(null)}>
  {/* Sidebar */}
  <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        {/* (toggle will appear inside header on the right when expanded) */}
        
        <div className="sidebar-content">
          <div className="sidebar-header">
            <span className="sidebar-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              NewVision
            </span>

            {/* Right-top toggle button shown when sidebar is expanded (in the red square) */}
            {!isSidebarCollapsed && (
              <button className="sidebar-toggle" onClick={() => setIsSidebarCollapsed(true)} title="Hide sidebar" aria-label="Hide sidebar">
               ☰
              </button>
            )}
          </div>

          <button className="new-chat-btn" onClick={createNewChat} title="New chat"> 
            + Add New conversation
          </button>

  <div className="session-list">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`session-item ${s.id === activeSessionId ? 'active' : ''}`}
            >
              <div style={{ flex: 1 }} title={s.title}>
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
                    onClick={() => setActiveSessionId(s.id)}
                    style={{ cursor: "pointer" }}
                  >
                    {s.title.length > 25 ? s.title.slice(0, 25) + "..." : s.title}
                  </div>
                )}
              </div>
              {/* More options menu button */}
              <button
                className="session-menu-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === s.id ? null : s.id);
                }}
                aria-haspopup="true"
                aria-expanded={openMenuId === s.id}
                title="More options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="5" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="19" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </button>
              {/* delete button removed — deletion is available from More Options menu */}

              {/* Session menu dropdown */}
              {openMenuId === s.id && (
                <div
                  className="session-menu"
                  onClick={(e) => e.stopPropagation()}
                  role="menu"
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                    {/* model-based rename removed - keep simple Rename action */}
                  </div>
                  <button
                    className="session-menu-item"
                    onClick={() => {
                      // Duplicate session
                      const copy = {
                        ...s,
                        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        title: `${s.title} (copy)`,
                        messages: (s.messages || []).map((m) => ({ ...m, id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })),
                      };
                      setSessions((prev) => [copy, ...prev]);
                      setOpenMenuId(null);
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    className="session-menu-item session-menu-delete"
                    onClick={() => {
                      setDeleteTargetId(s.id);
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
        {/* Bottom version text */}
        {!isSidebarCollapsed && (
          <div
            style={{
              background: "#343541",
              color: "white",
              border: "none",
              padding: "12px",
              margin: "12px",
              borderRadius: "6px",
              fontWeight: "500",
            }}
          >
            NewVision Chatboard v1.2
          </div>
        )}
        </div>
      </aside>

      {/* Collapsed sidebar area */}
      {isSidebarCollapsed && (
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "48px",
          background: "#202123",
          borderRight: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          paddingTop: "12px",
          zIndex: 2
        }}>
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            style={{
              width: "32px",
              height: "32px",
              marginLeft: "8px",
              background: "#343541",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              padding: 0,
              fontSize: "14px",
              transition: "background-color 0.2s, transform 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#444654"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#343541"}
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            ☰
          </button>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="chat-area" style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column",
        marginLeft: isSidebarCollapsed ? "48px" : "0", // Space for collapsed toggle button
        transition: "margin-left 0.3s ease",
        background: "#f4f6f9" // Light background for chat area only
      }}>
        <header className="header" style={{ textAlign: "center", padding: "1rem" }}>
          🧠 NewVision Chatboard
        </header>

        <div
          className="chat-messages"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            alignItems: activeSession ? "stretch" : "center",
            justifyContent: activeSession ? "flex-start" : "center",
          }}
        >
          {!activeSession ? (
            <div className="empty-chat">
        <div className="empty-chat-content">
          <h2>Hi there 👋</h2>
          <p>What should we dive into today?</p>

            <div className="chat-placeholder">
            <div style={{ textAlign: "center", fontSize: "1.2rem"}}>
               <strong>Select a new chat to start the conversation.</strong>
            </div>
            <div className="suggestion-buttons">
              <button onClick={() => handleSuggestion("Create an image")}>Create an image</button>
              <button onClick={() => handleSuggestion("Simplify a topic")}>Simplify a topic</button>
              <button onClick={() => handleSuggestion("Write a first draft")}>Write a first draft</button>
              <button onClick={() => handleSuggestion("Improve writing")}>Improve writing</button>
              <button onClick={() => handleSuggestion("Draft an email")}>Draft an email</button>
              <button onClick={() => handleSuggestion("Predict the future")}>Predict the future</button>
              <button onClick={() => handleSuggestion("Get advice")}>Get advice</button>
              <button onClick={() => handleSuggestion("Improve communication")}>Improve communication</button>
            </div>
          </div>
        </div>
      </div>
          ) : (
            <>
              {activeSession.messages.map((msg, i) => {
                let codeBlockCounter = 0;
                return (
                    <div
                      key={msg.id || i}
                      className={`message ${msg.role}`}
                      style={{ position: "relative", maxWidth: "80%" }}
                    >
                  {msg.role === "assistant" ? (
                    <ReactMarkdown
                      children={msg.content}
                      components={{
                        code({ inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          if (!inline && match) {
                            const copyId = `${msg.id || i}-${codeBlockCounter}`;
                            codeBlockCounter += 1;
                            return (
                              <div style={{ position: "relative" }}>
                                <button
                                  className="copy-btn"
                                  onClick={() => handleCopy(String(children).trim(), copyId)}
                                >
                                  {copiedId === copyId ? "Copied!" : "Copy"}
                                </button>
                                <SyntaxHighlighter
                                  style={atomOneDark}
                                  language={match[1]}
                                  PreTag="div"
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                              </div>
                            );
                          }
                          return (
                            <code
                              style={{
                                background: "#eee",
                                padding: "2px 5px",
                                borderRadius: "4px",
                                fontFamily: "monospace",
                                fontSize: "0.95em",
                              }}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                      }}
                    />
                  ) : (
                    msg.content
                  )}
                </div>
              );
              })}

              {loading && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    fontStyle: "italic",
                    color: "#666",
                    background: "white",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                    maxWidth: "75%",
                  }}
                >
                  Typing...
                </div>
              )}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Input area only if chat selected */}
        {activeSession && (
          <footer
            style={{
              display: "flex",
              padding: "1rem",
              borderTop: "1px solid #ddd",
              background: "#fff",
              flexWrap: "wrap",
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask anything..."
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                borderRadius: "10px",
                padding: "10px",
                fontSize: "1rem",
                border: "1px solid #ccc",
                outline: "none",
                minWidth: "200px",
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading}
              style={{
                marginLeft: "10px",
                padding: "0 20px",
                backgroundColor: loading ? "#6c757d" : "#202123",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "1rem",
                fontWeight: 500,
                marginTop: "8px",
              }}
            >
              {loading ? "..." : "Send"}
            </button>
          </footer>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTargetId && (
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
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "360px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: 0, marginBottom: 8 }}>Delete conversation?</h3>
            <p style={{ marginTop: 0, marginBottom: 16 }}>
             Once you delete a conversation, the messages are gone forever on every device.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setDeleteTargetId(null)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  background: "white",
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
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
