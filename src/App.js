import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import js from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import profiles from "./profile.json"; // 👈 import your profiles


SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("json", json);

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // 🧠 System message with profiles (context injection)
      const systemPrompt = {
        role: "system",
        content: `You are a helpful assistant who knows the following team members in detail:
${JSON.stringify(profiles.users, null, 2)}

If the user asks about anyone listed, respond using the above information.
If a question is not related to these people, answer normally.`,
      };

      // 🔹 Send request to LM Studio
      const res = await fetch("http://localhost:1234/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemma-3-1b", // ✅ match your LM Studio model
          messages: [systemPrompt, ...messages, userMessage],
        }),
      });

      const data = await res.json();
      const reply =
        data?.choices?.[0]?.message?.content || "⚠️ No response from model.";

      const botMessage = { role: "assistant", content: reply };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Error: Could not reach LM Studio API.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#f4f6f9",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "#007bff",
          color: "white",
          padding: "1rem",
          textAlign: "center",
          fontSize: "1.2rem",
          fontWeight: "600",
          letterSpacing: "0.5px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        }}
      >
        🧠 Gemma 3 1B — NewVision Chatboard
      </header>

      {/* Chat Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              background: msg.role === "user" ? "#007bff" : "white",
              color: msg.role === "user" ? "white" : "#222",
              padding: "12px 16px",
              borderRadius:
                msg.role === "user"
                  ? "18px 18px 4px 18px"
                  : "18px 18px 18px 4px",
              maxWidth: "80%",
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
              lineHeight: "1.5",
              wordBreak: "break-word",
            }}
          >
            {msg.role === "assistant" ? (
              <ReactMarkdown
                children={msg.content}
                components={{
                  code({ inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={atomOneDark}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
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
            Gemma is typing...
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <footer
        style={{
          display: "flex",
          padding: "1rem",
          borderTop: "1px solid #ddd",
          background: "#fff",
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
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#007bff")}
          onBlur={(e) => (e.target.style.borderColor = "#ccc")}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            marginLeft: "10px",
            padding: "0 20px",
            backgroundColor: loading ? "#6c757d" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "1rem",
            fontWeight: 500,
            transition: "background-color 0.2s",
          }}
        >
          {loading ? "..." : "Send"}
        </button>
      </footer>
    </div>
  );
}

export default App;
