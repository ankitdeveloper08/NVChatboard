import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import remarkGfm from "remark-gfm";
import { MdViewSidebar } from "react-icons/md";
import { FaMicrophone, FaPlus,  FaSearch } from "react-icons/fa";
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

  // === VOICE: new state + ref (added, doesn't remove any existing code) ===
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  // --- auto-resize textarea refs / constants ---
  const inputRef = useRef(null);
  const TEXTAREA_MAX_HEIGHT = 300; // px, adjust to taste

  const adjustTextareaHeight = (el) => {
    const ta = el || inputRef.current;
    if (!ta) return;
    // reset to auto to correctly measure scrollHeight
    ta.style.height = "auto";
    const newHeight = Math.min(ta.scrollHeight, TEXTAREA_MAX_HEIGHT);
    ta.style.height = newHeight + "px";
    // show scrollbar if content exceeds max height
    ta.style.overflowY =
      ta.scrollHeight > TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
  };

  // === VOICE: initialize recognition once (safe, added without removing code) ===
  useEffect(() => {
    // only run in browsers with the Web Speech API
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      recognitionRef.current = null;
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setListening(true);
      };

      rec.onresult = (event) => {
        try {
          const transcript = event.results[0][0].transcript;
          // Put recognized text into the input (user can edit before sending)
          setInput(transcript);
        } catch (err) {
          console.error("Speech result parsing error:", err);
        }
      };

      rec.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        // ensure UI resets
        setListening(false);
      };

      rec.onend = () => {
        // stop indicator
        setListening(false);
      };

      recognitionRef.current = rec;
    } catch (err) {
      console.error("SpeechRecognition init failed:", err);
      recognitionRef.current = null;
    }

    // cleanup on unmount
    return () => {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onstart = null;
          // don't call stop here — component unmount will kill it
        }
      } catch (e) {
        /* ignore */
      }
    };
  }, []); // run once

  // === VOICE: start/stop handler (added) ===
  const handleVoiceStart = () => {
    const rec = recognitionRef.current;
    if (!rec) {
      // Browser doesn't support it
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      // If already listening, stop (toggle)
      if (listening) {
        rec.stop();
        setListening(false);
        return;
      }
      // start fresh
      rec.start();
      // onstart will set listening true
    } catch (err) {
      console.error("Voice start error:", err);
      setListening(false);
    }
  };

  // Load stored chats
  useEffect(() => {
    const stored = localStorage.getItem("chatSessions");
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure each message has a stable id so copy buttons can target a specific block
      const withIds = parsed.map((sess) => ({
        ...sess,
        messages: (sess.messages || []).map((m) =>
          m.id
            ? m
            : {
                ...m,
                id: `msg-${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2, 8)}`,
              }
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

  // ensure textarea height matches content when input or active session changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [input, activeSessionId, isSidebarCollapsed]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const createNewChat = () => {
    const newChat = {
      id: `chat-${Date.now()}`,
      title: "New Conversation",
      messages: [],
    };
    setSessions((prev) => [newChat, ...prev]);
    setActiveSessionId(newChat.id);
    // clear and adjust input
    setInput("");
    // adjust after DOM update
    setTimeout(() => adjustTextareaHeight(), 0);
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
    // adjust after DOM update
    setTimeout(() => adjustTextareaHeight(), 0);
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
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
  };

  const handleSend = async () => {
    if (!input.trim() || !activeSession) return;

    // Capture the user's message content so we can use it later (e.g., for renaming)
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
    // clear the input for the UI, but we still have userMessage.content for later use
    setInput("");
    setLoading(true);
    // adjust textarea after clearing so it shrinks back
    setTimeout(() => adjustTextareaHeight(), 0);

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
            // model: "google/gemma-3-1b",          ---- change model name if we are changing model in LM Studio ----
            model: "meta-llama-3.1-8b-instruct",
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
                    id: `msg-${Date.now()}-${Math.random()
                      .toString(36)
                      .slice(2, 8)}`,
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

      // Rename the chat if it still has a default "New..." title using the captured userMessage content
      if (
        activeSession &&
        typeof activeSession.title === "string" &&
        activeSession.title.startsWith("New") &&
        userMessage.content.trim()
      ) {
        renameChat(activeSessionId, userMessage.content.slice(0, 30));
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
                    id: `msg-${Date.now()}-${Math.random()
                      .toString(36)
                      .slice(2, 8)}`,
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
      <aside className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
        {/* (toggle will appear inside header on the right when expanded) */}

        <div className="sidebar-content">
          <div className="sidebar-header">
            <span className="sidebar-title">
              <img src="/NVlogo.jpg" alt="NV Logo" height={"50px"} />
            </span>

            {/* Right-top toggle button shown when sidebar is expanded (in the red square) */}
            {!isSidebarCollapsed && (
              <button
                className="sidebar-toggle"
                onClick={() => setIsSidebarCollapsed(true)}
                title="Hide sidebar"
                aria-label="Hide sidebar"
              >
                <MdViewSidebar />
              </button>
            )}
          </div>

          <button
            className="new-chat-btn"
            onClick={createNewChat}
            title="New chat"
          >
           <FaPlus />Add New conversation
          </button>

          <div className="session-list">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`session-item ${
                  s.id === activeSessionId ? "active" : ""
                }`}
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
                      {s.title.length > 25
                        ? s.title.slice(0, 25) + "..."
                        : s.title}
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
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
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
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
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
                      {/* model-based rename removed - keep simple Rename action */}
                    </div>
                    <button
                      className="session-menu-item"
                      onClick={() => {
                        // Duplicate session
                        const copy = {
                          ...s,
                          id: `chat-${Date.now()}-${Math.random()
                            .toString(36)
                            .slice(2, 6)}`,
                          title: `${s.title} (copy)`,
                          messages: (s.messages || []).map((m) => ({
                            ...m,
                            id: `msg-${Date.now()}-${Math.random()
                              .toString(36)
                              .slice(2, 6)}`,
                          })),
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
                background: "gainsboro",
                color: "black",
                // border: "none",
                padding: "12px",
                margin: "12px",
                borderRadius: "4px",
                fontWeight: "500",
              }}
            >
              NewVision Chatboard v1.2
            </div>
          )}
        </div>
      </aside>

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
            zIndex: 2,
            gap: "10px",
          }}
        >
           < img src="/NVSide.png" alt="NV Logo"  style={{
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
              fontSize: "16px"
            }} 
              onClick={() => setIsSidebarCollapsed(false)}/>
          <button
            onClick={() => setIsSidebarCollapsed(false)}
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
              fontSize: "16px"
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#bbb")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#bbb")
            }
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
             <MdViewSidebar />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              createNewChat();
            }}
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
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#bbb")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#bbb")
            }
            title="New chat"
            aria-label="New chat"
          >
           <FaPlus />
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
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#bbb")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#bbb")
            }
          >
             <FaSearch />
          </button>
        </div>
      )}

      {/* Main Chat Area */}
      <div
        className="chat-area"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          marginLeft: isSidebarCollapsed ? "48px" : "0", // Space for collapsed toggle button
          transition: "margin-left 0.3s ease",
          background: "#f4f6f9", // Light background for chat area only
          position: "relative", // make this the anchor for the fixed button area
        }}
      >
        <header
          className="header"
          style={{ textAlign: "center", padding: "1rem" }}
        >
          <img src="/NVlogo.jpg" alt="NV Logo" height={"50px"} />
           {/* NewVision Chatboard */}
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
                  <div style={{ textAlign: "center", fontSize: "1.2rem" }}>
                    <strong>
                      Select a new chat to start the conversation.
                    </strong>
                  </div>
                  <div className="suggestion-buttons">
                    <button onClick={() => handleSuggestion("Create an image")}>
                      Create an image
                    </button>
                    <button
                      onClick={() => handleSuggestion("Simplify a topic")}
                    >
                      Simplify a topic
                    </button>
                    <button
                      onClick={() => handleSuggestion("Write a first draft")}
                    >
                      Write a first draft
                    </button>
                    <button onClick={() => handleSuggestion("Improve writing")}>
                      Improve writing
                    </button>
                    <button onClick={() => handleSuggestion("Draft an email")}>
                      Draft an email
                    </button>
                    <button
                      onClick={() => handleSuggestion("Predict the future")}
                    >
                      Predict the future
                    </button>
                    <button onClick={() => handleSuggestion("Get advice")}>
                      Get advice
                    </button>
                    <button
                      onClick={() => handleSuggestion("Improve communication")}
                    >
                      Improve communication
                    </button>
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
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(
                              className || ""
                            );
                            if (!inline && match) {
                              const copyId = `${
                                msg.id || i
                              }-${codeBlockCounter}`;
                              codeBlockCounter += 1;
                              return (
                                <div style={{ position: "relative" }}>
                                  <button
                                    className="copy-btn"
                                    onClick={() =>
                                      handleCopy(
                                        String(children).trim(),
                                        copyId
                                      )
                                    }
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
              alignItems: "flex-end"
            }}
          >
            {/* textarea wrapper so textarea height can grow without moving the fixed buttons */}
            <div style={{ flex: 1, minWidth: "200px" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // adjust based on the event target for immediate feedback
                  adjustTextareaHeight(e.target);
                }}
                onKeyDown={handleKeyPress}
                placeholder="Ask anything..."
                rows={1}
                style={{
                  width: "100%",
                  resize: "none",
                  borderRadius: "10px",
                  padding: "10px",
                  fontSize: "1rem",
                  border: "1px solid #ccc",
                  outline: "none",
                  overflow: "hidden",
                  maxHeight: TEXTAREA_MAX_HEIGHT + "px",
                  boxSizing: "border-box",
                  lineHeight: "1.4",
                }}
              />
            </div>

            {/* buttons column moved outside the textarea and kept to the right of the footer */}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginLeft: 12,
                justifyContent: "flex-end",
                alignItems: "center", // keep buttons at bottom of footer
              }}
            >
              {/* Voice button (ADDED) - kept style consistent with existing buttons */}
              <button
                onClick={handleVoiceStart}
                style={{
                  height: 40,
                  minWidth: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: listening ? "rgba(77, 148, 255, 1)" : "#fff",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                  fontSize: 18,
                }}
                title={listening ? "Listening..." : "Start voice input"}
              >
                <FaMicrophone />
              </button>

              {/* Clear button (now outside the textarea) */}
              <button
                type="button"
                aria-label="Clear input"
                title="Clear"
                onClick={() => {
                  setInput("");
                  setTimeout(() => adjustTextareaHeight(), 0);
                  inputRef.current?.focus();
                }}
                style={{
                  height: 40,
                  minWidth: "42px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                  fontSize: 16,
                }}
              >
                Clear
              </button>

              <button
                onClick={handleSend}
                disabled={loading}
                style={{
                  padding: "0 20px",
                  backgroundColor: loading ? "#6c757d" : "#202123",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                  fontWeight: 500,
                  height: "40px",
                }}
              >
                {loading ? "..." : "Send"}
              </button>
            </div>
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
              Once you delete a conversation, the messages are gone forever on
              every device.
            </p>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
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
