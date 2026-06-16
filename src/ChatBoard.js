import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import remarkGfm from "remark-gfm";
import { MdViewSidebar } from "react-icons/md";
import {
  FaMicrophone,
  FaPlus,
  FaSearch,
  FaStop,
  FaPaperPlane,
} from "react-icons/fa";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import js from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import profiles from "./profile.json";
import "./App.css";
import SearchModal from "./SearchModal";
import ProfileModal from "./ProfileModal";

SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("json", json);

function ChatBoard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const sessionsRef = useRef(sessions); // <-- new
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userName, setUserName] = useState("User");
  const [selectedModel, setSelectedModel] = useState(
    "meta-llama-3.1-8b-instruct",
  );
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showFooterMenu, setShowFooterMenu] = useState(false);
  const chatEndRef = useRef(null);
  const controllerRef = useRef(null);
  const userMenuRef = useRef(null);
  const footerMenuRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated"); // ❌ Remove login session
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("authProvider");
    navigate("/"); // 🔄 Redirect to Login page
  };

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

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

  // <-- New helper: safely append streaming chunks so words don't join -->
  const appendChunk = (prev, chunk) => {
    if (!chunk) return prev;
    if (!prev) return chunk;

    // Trim leading spaces on the new chunk if the previous text
    // doesn’t end with punctuation or whitespace.
    const prevLast = prev[prev.length - 1];
    const first = chunk[0];

    // If the last character is a letter and the first is a lowercase letter,
    // don't add any space — likely a split word.
    if (/[a-zA-Z0-9]$/.test(prevLast) && /^[a-z0-9]/.test(first)) {
      return prev + chunk;
    }

    // If both are normal words but split by tokenization, add a single space
    if (
      /\w$/.test(prevLast) &&
      /^\w/.test(first) &&
      !/\s$/.test(prev) &&
      !/^\s/.test(chunk)
    ) {
      return prev + " " + chunk;
    }

    return prev + chunk;
  };

  const menuItemStyle = {
    width: "100%",
    padding: "0.75rem 1rem",
    background: "none",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "0.95rem",
    color: "#111",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    transition: "background 0.2s",
    outline: "none",
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
              },
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

  const handleStop = () => {
    if (controllerRef.current) {
      controllerRef.current.abort(); // cancel the current stream
      controllerRef.current = null;
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeSessionId) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input,
    };

    // 🧠 Add user message
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              title:
                s.title === "New Conversation" ? input.slice(0, 30) : s.title,
              messages: [...(s.messages || []), userMessage],
            }
          : s,
      ),
    );
    setInput("");
    setLoading(true);

    // Assistant placeholder
    const assistantMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: "",
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [...(s.messages || []), assistantMessage] }
          : s,
      ),
    );

    try {
      controllerRef.current = new AbortController();
      console.log("📘 Asking /ask-docs (stream)...");

      const response = await fetch(
        "https://openaiservers.onrender.com/ask-docs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: input }),
          signal: controllerRef.current.signal,
        },
      );

      if (!response.ok)
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let fullText = "";
      let gotAnswerFromDocs = false;

      // 🔁 Read streaming chunks
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop(); // last incomplete part stays in buffer

        for (const part of parts) {
          if (!part.startsWith("data:")) continue;
          const dataStr = part.replace("data:", "").trim();
          if (dataStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(dataStr);
            const content = parsed.content || "";
            const source = parsed.source || "openai";

            if (content) {
              gotAnswerFromDocs = source === "docs";

              // use safe append to avoid joining words
              fullText = appendChunk(fullText, content);

              // 🔄 Live update UI
              setSessions((prev) =>
                prev.map((s) =>
                  s.id === activeSessionId
                    ? {
                        ...s,
                        messages: s.messages.map((m) =>
                          m.id === assistantMessage.id
                            ? {
                                ...m,
                                content: fullText,
                              }
                            : m,
                        ),
                      }
                    : s,
                ),
              );
            }
          } catch (err) {
            console.warn("⚠️ Stream JSON parse skipped:", dataStr);
          }
        }
      }

      console.log(
        "📘 Stream finished. Got answer from docs:",
        gotAnswerFromDocs,
      );

      // --- SMARTER FALLBACK DECISION ---
      // Only call the completions fallback when the docs stream did not provide
      // a meaningful answer (empty / very short / or an explicit "I don't know").
      const trimmed = fullText.trim();
      const looksUnhelpful =
        trimmed.length === 0 ||
        trimmed.length < 40 ||
        /i don.?t know|no results|no relevant/i.test(trimmed.toLowerCase());

      const fallbackNeeded = !gotAnswerFromDocs && looksUnhelpful;

      if (fallbackNeeded) {
        console.log("🤖 Fallback to OpenAI (reason: docs empty/unhelpful)...");

        const systemPrompt = {
          role: "system",
          content:
            "You are a helpful assistant. If no document info is found, answer normally.",
        };

        // use sessionsRef to ensure we read the latest session messages (including the assistant placeholder)
        const activeMessages =
          sessionsRef.current.find((s) => s.id === activeSessionId)?.messages ||
          [];

        const formattedMessages = [
          systemPrompt,
          ...activeMessages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: input },
        ];

        const aiRes = await fetch(
          "https://openaiservers.onrender.com/v1/chat/completions",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: formattedMessages,
            }),
            signal: controllerRef.current?.signal,
          },
        );

        if (!aiRes.ok) throw new Error(`AI API error: ${aiRes.statusText}`);

        const reader2 = aiRes.body.getReader();
        const decoder2 = new TextDecoder("utf-8");
        let openAiText = "";

        while (true) {
          const { done, value } = await reader2.read();
          if (done) break;
          const chunk = decoder2.decode(value, { stream: true });
          const lines = chunk
            .split("\n")
            .filter((line) => line.startsWith("data: "));

          for (const line of lines) {
            const data = line.replace("data:", "").trim();
            if (data === "[DONE]") continue;

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                // safe append for OpenAI stream too
                openAiText = appendChunk(openAiText, content);

                // Live update assistant message with the OpenAI stream
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === activeSessionId
                      ? {
                          ...s,
                          messages: s.messages.map((m) =>
                            m.id === assistantMessage.id
                              ? { ...m, content: openAiText }
                              : m,
                          ),
                        }
                      : s,
                  ),
                );
              }
            } catch {
              // skip invalid lines
            }
          }
        }
        console.log("✅ OpenAI response done.");
      } else {
        console.log(
          "ℹ️ Skipping fallback — docs provided a sufficient answer.",
        );
      }
    } catch (err) {
      if (
        err.name === "AbortError" ||
        err.message.includes("aborted") ||
        err.message.includes("BodyStreamBuffer")
      ) {
        console.warn("⚠️ Stream manually stopped by user.");
        return; // stop silently, no error message in chat
      }
      console.error("❌ Error during chat:", err);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [
                  ...(s.messages || []),
                  {
                    id: `msg-error-${Date.now()}`,
                    role: "assistant",
                    content: `Error: ${err.message}`,
                  },
                ],
              }
            : s,
        ),
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
      if (!loading) {
        handleSend();
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        footerMenuRef.current &&
        !footerMenuRef.current.contains(event.target)
      ) {
        setShowFooterMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- JSX ---
  return (
    <div
      className="app-container"
      onClick={() => {
        setOpenMenuId(null);
        setShowUserMenu(false);
      }}
    >
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
            <FaPlus /> <b>Add New conversation</b>
          </button>
          <button
            className="new-chat-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowSearch((prev) => !prev);
            }}
            title="New chat"
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
                      {s.title.length > 20 ? s.title.slice(0, 20) : s.title}
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
                position: "relative",
                background: "#f2f4f7",
                color: "#1f2937",
                padding: "12px 14px",
                margin: "12px",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                border: "1px solid #e5e7eb",
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setShowFooterMenu((prev) => !prev);
              }}
            >
              <div>
                <div style={{ fontSize: "0.9rem", color: "#111" }}>
                  {userName || "Unknown user"}
                </div>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#10a37f",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}
              >
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </span>

              {showFooterMenu && (
                <div
                  ref={footerMenuRef}
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: 0,
                    right: 0,
                    marginBottom: "10px",
                    backgroundColor: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: "20px",
                    boxShadow: "0 18px 50px rgba(15, 23, 42, 0.18)",
                    width: "100%",
                    zIndex: 1000,
                    overflow: "hidden",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      padding: "1rem 1rem 0.75rem 1rem",
                      borderBottom: "1px solid #e5e5e5",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "50%",
                          backgroundColor: "#10a37f",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "1rem",
                        }}
                      >
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "1rem",
                            fontWeight: 700,
                            color: "#111",
                          }}
                        >
                          {userName}
                        </p>
                        <p
                          style={{
                            margin: "4px 0 0 0",
                            fontSize: "0.82rem",
                            color: "#6b7280",
                          }}
                        >
                          Free
                        </p>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: "0.75rem 0" }}>
                    <button
                      onClick={() => setShowFooterMenu(false)}
                      style={menuItemStyle}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#f5f5f5")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "none")
                      }
                    >
                      <span>⭐</span> Upgrade plan
                    </button>
                    <button
                      onClick={() => setShowFooterMenu(false)}
                      style={menuItemStyle}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#f5f5f5")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "none")
                      }
                    >
                      <span>✨</span> Personalization
                    </button>
                    <button
                      onClick={() => {
                        setShowFooterMenu(false);
                        setShowProfileModal(true);
                      }}
                      style={menuItemStyle}
                    >
                      <span>👤</span> Profile
                    </button>
                    <button
                      onClick={() => setShowFooterMenu(false)}
                      style={menuItemStyle}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#f5f5f5")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "none")
                      }
                    >
                      <span>⚙️</span> Settings
                    </button>
                    <button
                      onClick={() => setShowFooterMenu(false)}
                      style={menuItemStyle}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#f5f5f5")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "none")
                      }
                    >
                      <span>❓</span> Help
                    </button>
                  </div>
                  <div
                    style={{
                      padding: "0.75rem 1rem 1rem 1rem",
                      borderTop: "1px solid #e5e5e5",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      onClick={() => {
                        setShowFooterMenu(false);
                        handleLogout();
                      }}
                      style={{
                        padding: "0 20px",
                        backgroundColor: "#202123",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "1rem",
                        fontWeight: 500,
                        height: "40px",
                        alignItems: "center",
                      }}
                    >
                      <span>🚪</span> Log out
                    </button>
                  </div>
                </div>
              )}
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
          <img
            src="/NVlg.ico"
            alt="NV Logo"
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
          />
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
              fontSize: "16px",
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
            onClick={(e) => {
              e.stopPropagation();
              setShowSearch((prev) => !prev);
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
              margin: "12px",
              bottom: 0,
              width: "48px",
              background: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: "12px",
              zIndex: 2,
              gap: "10px",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#10a37f",
                color: "#fff",
                fontSize: "0.85rem",
                fontWeight: 700,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setShowFooterMenu((prev) => !prev);
              }}
            >
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </span>
            {showFooterMenu && (
              <div
                ref={footerMenuRef}
                style={{
                  position: "absolute",
                  bottom: "100%",
                  margin: "12px",
                  left: 0,
                  // right: 0,
                  marginBottom: "10px",
                  backgroundColor: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: "20px",
                  boxShadow: "0 18px 50px rgba(15, 23, 42, 0.18)",
                  width: "230px",
                  zIndex: 1000,
                  overflow: "hidden",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    padding: "1rem 1rem 0.75rem 1rem",
                    borderBottom: "1px solid #e5e5e5",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        backgroundColor: "#10a37f",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1rem",
                      }}
                    >
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: "#111",
                        }}
                      >
                        {userName}
                      </p>
                      <p
                        style={{
                          margin: "4px 0 0 0",
                          fontSize: "0.82rem",
                          color: "#6b7280",
                        }}
                      >
                        Free
                      </p>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "0.75rem 0" }}>
                  <button
                    onClick={() => setShowFooterMenu(false)}
                    style={menuItemStyle}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = "#f5f5f5")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    <span>⭐</span> Upgrade plan
                  </button>
                  <button
                    onClick={() => setShowFooterMenu(false)}
                    style={menuItemStyle}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = "#f5f5f5")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    <span>✨</span> Personalization
                  </button>
                  <button
                      onClick={() => {
                        setShowFooterMenu(false);
                        setShowProfileModal(true);
                      }}
                      style={menuItemStyle}
                    >
                      <span>👤</span> Profile
                    </button>
                  <button
                    onClick={() => setShowFooterMenu(false)}
                    style={menuItemStyle}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = "#f5f5f5")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    <span>⚙️</span> Settings
                  </button>
                  <button
                    onClick={() => setShowFooterMenu(false)}
                    style={menuItemStyle}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = "#f5f5f5")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    <span>❓</span> Help
                  </button>
                </div>
                <div
                  style={{
                    padding: "0.75rem 1rem 1rem 1rem",
                    borderTop: "1px solid #e5e5e5",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <button
                    onClick={() => {
                      setShowFooterMenu(false);
                      handleLogout();
                    }}
                    style={{
                      padding: "0 20px",
                      backgroundColor: "#202123",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: 500,
                      height: "40px",
                      alignItems: "center",
                    }}
                  >
                    <span>🚪</span> Log out
                  </button>
                </div>
              </div>
            )}
          </div>
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
          style={{
            padding: "1rem",
            borderBottom: "1px solid #e5e5e5",
            backgroundColor: "#fff",
          }}
        >
          <div
            style={{
              // display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <img src="/NVlogo.jpg" alt="NV Logo" height={"50px"} />
          </div>
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
                              className || "",
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
                                        copyId,
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
              alignItems: "flex-end",
              lineHeight: "0",
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

              {loading ? (
                <button
                  onClick={handleStop}
                  style={{
                    padding: "0 20px",
                    backgroundColor: "black",
                    color: "white",
                    border: "red",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: 500,
                    height: "40px",
                  }}
                >
                  <FaStop color="white" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  style={{
                    padding: "0 20px",
                    backgroundColor: "#202123",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: 500,
                    height: "40px",
                  }}
                >
                  <FaPaperPlane size={15} />
                </button>
              )}
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
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userName={userName}
        userEmail={localStorage.getItem("userEmail") || ""}
        userPicture=""
      />
    </div>
  );
}

export default ChatBoard;
