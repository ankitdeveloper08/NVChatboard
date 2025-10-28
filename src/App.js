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
  const [copiedIndex, setCopiedIndex] = useState(null);
  const chatEndRef = useRef(null);

  // Load stored chats
  useEffect(() => {
    const stored = localStorage.getItem("chatSessions");
    if (stored) {
      const parsed = JSON.parse(stored);
      setSessions(parsed);
      if (parsed.length > 0) setActiveSessionId(parsed[0].id);
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
      title: "New Chat",
      messages: [],
    };
    setSessions((prev) => [newChat, ...prev]);
    setActiveSessionId(newChat.id);
  };

  const deleteChat = (id) => {
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (id === activeSessionId && filtered.length > 0)
      setActiveSessionId(filtered[0].id);
    else if (filtered.length === 0) setActiveSessionId(null);
  };

  const renameChat = (id, title) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    );
  };

  const handleSend = async () => {
    if (!input.trim() || !activeSession) return;

    const userMessage = { role: "user", content: input };
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

      // Add empty assistant message while streaming
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, { role: "assistant", content: "" }] }
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

  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
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
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "Inter, sans-serif",
        background: "#f4f6f9",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "260px",
          background: "#202123",
          color: "white",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s ease",
          overflow: "hidden",
          position: "relative",
          zIndex: 2,
        }}
      >
        <button
          onClick={createNewChat}
          style={{
            background: "#343541",
            color: "white",
            border: "none",
            padding: "12px",
            margin: "12px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "500",
            whiteSpace: "nowrap",
          }}
        >
          + New Chat
        </button>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {sessions.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: s.id === activeSessionId ? "#343541" : "transparent",
                padding: "10px 14px",
                margin: "4px 8px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              <div
                style={{ flex: 1 }}
                onClick={() => setActiveSessionId(s.id)}
                title={s.title}
              >
                {s.title.length > 25 ? s.title.slice(0, 25) + "..." : s.title}
              </div>
              <button
                onClick={() => deleteChat(s.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#bbb",
                  cursor: "pointer",
                  fontSize: "16px",
                  marginLeft: "8px",
                }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
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
      </aside>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            background: "#202123",
            color: "white",
            padding: "1rem",
            textAlign: "center",
            fontSize: "1.1rem",
            fontWeight: 600,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
          🧠 NewVision Chatboard
        </header>

        <div
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
              <button>Create an image</button>
              <button>Simplify a topic</button>
              <button>Write a first draft</button>
              <button>Improve writing</button>
              <button>Draft an email</button>
              <button>Predict the future</button>
              <button>Get advice</button>
              <button>Improve communication</button>
            </div>
          </div>
        </div>
      </div>
          ) : (
            <>
              {activeSession.messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    background: msg.role === "user" ? "#202123" : "white",
                    color: msg.role === "user" ? "white" : "#222",
                    padding: "12px 16px",
                    borderRadius:
                      msg.role === "user"
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                    maxWidth: "80%",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                    lineHeight: "1.5",
                    wordBreak: "break-word",
                    fontSize: "0.95rem",
                  }}
                >
                  {msg.role === "assistant" ? (
                    <ReactMarkdown
                      children={msg.content}
                      components={{
                        code({ inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          return !inline && match ? (
                            <div style={{ position: "relative" }}>
                              <button
                                onClick={() =>
                                  handleCopy(String(children).trim(), i)
                                }
                                style={{
                                  position: "absolute",
                                  top: "4px",
                                  right: "6px",
                                  border: "none",
                                  background: "#333",
                                  color: "white",
                                  fontSize: "0.8rem",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                              >
                                {copiedIndex === i ? "Copied!" : "Copy"}
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
                          ) : (
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
              ))}

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
    </div>
  );
}

export default App;
