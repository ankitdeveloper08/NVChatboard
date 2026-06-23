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
  FaRegCopy,
  FaThumbsUp,
  FaThumbsDown,
  FaShare,
  FaRedo,
  FaCheck,
} from "react-icons/fa";

import { BsThreeDots } from "react-icons/bs";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import js from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import profiles from "./profile.json";
import "./App.css";
import SearchModal from "./components/Modals/SearchModal";
import ProfileModal from "././components/Modals/ProfileModal";
import FooterMenu from "./FooterMenu";
import ChatFooter from "./components/Footer/ChatFooter";
import Sidebar from "./components/Sidebar/Sidebar";
import DeleteConfirmationModal from "./components/Modals/DeleteConfirmationModal";
import ChatLoader from "./components/Modals/ChatLoader";

SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("json", json);

function ChatBoard() {
  const API_URL = process.env.REACT_APP_RAG_API_URL;
  const token = localStorage.getItem("token");
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
  const [isNewConversationMode, setIsNewConversationMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState(
    "meta-llama-3.1-8b-instruct",
  );
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showFooterMenu, setShowFooterMenu] = useState(false);
  const [openMoreMenuId, setOpenMoreMenuId] = useState(null);
  const [readingId, setReadingId] = useState(null);
  const [pendingChat, setPendingChat] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(true);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState(null);
  const moreMenuRef = useRef(null);
  const chatEndRef = useRef(null);
  const controllerRef = useRef(null);
  const userMenuRef = useRef(null);
  const footerMenuRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("authProvider");
    localStorage.removeItem("activeSessionId");

    navigate("/");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    const storedName = localStorage.getItem("userName");

    if (storedName) {
      setUserName(storedName);
    }
  }, [navigate]);

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

  const loadChats = async () => {
    try {
      setIsChatLoading(true);
      const response = await fetch(`${API_URL}/api/chats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const chats = await response.json();

      const formattedChats = chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        messages:
          chat.messages?.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })) || [],
      }));
      setSessions(formattedChats);

      const savedChatId = localStorage.getItem("activeSessionId");

      if (
        savedChatId &&
        formattedChats.some((c) => String(c.id) === String(savedChatId))
      ) {
        setActiveSessionId(savedChatId);
        openChat(savedChatId);
      } else if (formattedChats.length > 0) {
        setActiveSessionId(formattedChats[0].id);
        openChat(formattedChats[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsChatLoading(false);
    }
  };
  // Load stored chats
  useEffect(() => {
    loadChats();
  }, []);
  const openChat = async (chatId) => {
    setIsOpeningChat(true);
    try {
      setPendingChat(false);
      setIsNewConversationMode(false);

      setActiveSessionId(String(chatId));
      localStorage.setItem("activeSessionId", String(chatId));

      const existingChat = sessions.find(
        (s) => String(s.id) === String(chatId),
      );

      if (existingChat?.messages?.length > 0) {
        return;
      }

      const response = await fetch(`${API_URL}/api/chats/${chatId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const chat = await response.json();

      setSessions((prev) =>
        prev.map((s) =>
          s.id === chatId
            ? {
                ...s,
                messages: chat.messages.map((m) => ({
                  id: m.id,
                  role: m.role,
                  content: m.content,
                })),
              }
            : s,
        ),
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsOpeningChat(false);
    }
  };
  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSessionId]);

  // ensure textarea height matches content when input or active session changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [input, activeSessionId, isSidebarCollapsed]);

  const activeSession = sessions.find(
    (s) => String(s.id) === String(activeSessionId),
  );

  const createNewChat = () => {
    setActiveSessionId(null);
    setInput("");
    setPendingChat(true);
    setIsNewConversationMode(true);

    localStorage.removeItem("activeSessionId");
  };
  // Create a new chat from a suggestion and optionally send immediately
  const handleSuggestion = (text) => {
    setPendingChat(true);
    setIsNewConversationMode(true);
    setInput(text);
  };

  const deleteChat = async (id) => {
    try {
      setDeletingChatId(id);

      const res = await fetch(`${API_URL}/api/chats/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      const filtered = sessions.filter((s) => s.id !== id);
      setSessions(filtered);

      if (id === activeSessionId && filtered.length > 0) {
        setActiveSessionId(filtered[0].id);
      } else if (filtered.length === 0) {
        setActiveSessionId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingChatId(null);
    }
  };

  const handleConfirmDelete = (id) => {
    // perform the delete and close the confirmation modal
    deleteChat(id);
    setDeleteTargetId(null);
  };

  const renameChat = async (id, title) => {
    try {
      const response = await fetch(`${API_URL}/api/chats/${id}/rename`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename chat");
      }

      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title } : s)),
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleStop = () => {
    if (controllerRef.current) {
      controllerRef.current.abort(); // cancel the current stream
      controllerRef.current = null;
      setLoading(false);
    }
  };

  const saveMessageToDB = async (chatId, role, content) => {
    await fetch(`${API_URL}/api/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        chatId,
        role,
        content,
      }),
    });
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setIsNewConversationMode(false);
    let fullText = "";

    const uid = crypto.randomUUID();
    const userMessage = {
      id: uid,
      role: "user",
      content: input,
    };
    let chatId = activeSessionId;

    if (pendingChat || !chatId) {
      try {
        const response = await fetch(`${API_URL}/api/chats`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to create chat");
        }

        const chat = await response.json();

        const newChat = {
          id: chat.id,
          title: input.slice(0, 30),
          messages: [],
        };

        setSessions((prev) => [newChat, ...prev]);

        setActiveSessionId(String(chat.id));
        localStorage.setItem("activeSessionId", String(chat.id));

        chatId = chat.id;

        setPendingChat(false);
      } catch (err) {
        console.error(err);
        return;
      }
    }
    await saveMessageToDB(chatId, "user", input);

    // 🧠 Add user message
    setSessions((prev) =>
      prev.map((s) =>
        s.id === chatId
          ? {
              ...s,
              title: s.messages.length === 0 ? input.slice(0, 30) : s.title,
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
        s.id === chatId
          ? { ...s, messages: [...(s.messages || []), assistantMessage] }
          : s,
      ),
    );

    try {
      controllerRef.current = new AbortController();
      console.log("📘 Asking /ask-docs (stream)...");

      const response = await fetch(`${API_URL}/ask-docs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: input }),
        signal: controllerRef.current.signal,
      });

      if (!response.ok)
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
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
                  s.id === chatId
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

        const aiRes = await fetch(`${API_URL}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: formattedMessages,
          }),
          signal: controllerRef.current?.signal,
        });

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
                    s.id === chatId
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
        if (openAiText.trim()) {
          await saveMessageToDB(activeSessionId, "assistant", openAiText);
        }
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
          s.id === chatId
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
      if (fullText.trim()) {
        await saveMessageToDB(chatId, "assistant", fullText);
      }
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

  const cleanTextForSpeech = (text) => {
    let cleaned = text;

    // Replace code blocks with a single natural sentence
    cleaned = cleaned.replace(
      /```[\s\S]*?```/g,
      " The response includes a code example. Please refer to the chat for the complete code. ",
    );

    // Replace inline code
    cleaned = cleaned.replace(/`[^`]*`/g, " code snippet ");

    // Replace traceback/errors
    cleaned = cleaned.replace(
      /traceback[\s\S]*?(?=\n\n|$)/gi,
      " Technical error details are available in the conversation. ",
    );

    // Remove URLs
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, "");

    // Remove markdown formatting
    cleaned = cleaned.replace(/[#>*_\[\](){}|]/g, " ");

    // Remove excessive punctuation
    cleaned = cleaned.replace(/[;:"']/g, "");

    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    return cleaned;
  };
  const handleReadAloud = (text, messageId) => {
    window.speechSynthesis.cancel();

    const cleanText = cleanTextForSpeech(text);

    const utterance = new SpeechSynthesisUtterance(cleanText);

    const voices = window.speechSynthesis.getVoices();

    const femaleVoice =
      voices.find((v) => v.name === "Google UK English Female") ||
      voices.find(
        (v) => v.name === "Microsoft Zira - English (United States)",
      ) ||
      voices.find((v) => v.name === "Microsoft Heera - English (India)");

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.rate = 0.9;

    utterance.onend = () => {
      setReadingId(null);
    };

    setReadingId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  const stopReading = () => {
    window.speechSynthesis.cancel();
    setReadingId(null);
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setOpenMoreMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setOpenMoreMenuId(null);
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
      <Sidebar
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        createNewChat={createNewChat}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        sessions={sessions}
        activeSessionId={activeSessionId}
        openChat={openChat}
        openMenuId={openMenuId}
        setOpenMenuId={setOpenMenuId}
        editingId={editingId}
        setEditingId={setEditingId}
        editingValue={editingValue}
        setEditingValue={setEditingValue}
        renameChat={renameChat}
        token={token}
        setSessions={setSessions}
        setActiveSessionId={setActiveSessionId}
        setDeleteTargetId={setDeleteTargetId}
        userName={userName}
        setShowFooterMenu={setShowFooterMenu}
        deletingChatId={deletingChatId}
        setDeletingChatId={setDeletingChatId}
      />

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
          }}
        >
          {isChatLoading ? (
            <ChatLoader text="Loading conversations..." />
          ) : isOpeningChat ? (
            <ChatLoader text="Loading chat..." />
          ) : !activeSession && !pendingChat ? (
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
          ) : pendingChat ||
            (isNewConversationMode &&
              activeSession &&
              activeSession.messages.length === 0) ? (
            <>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexDirection: "column",
                }}
              >
                <h1
                  style={{
                    fontSize: "42px",
                    marginBottom: "30px",
                    fontWeight: "500",
                  }}
                >
                  What’s on your mind today?
                </h1>

                <div
                  style={{
                    width: "70%",
                    maxWidth: "900px",
                    background: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: "30px",
                    padding: "12px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                  }}
                >
                  <FaPlus />

                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSend();
                      }
                    }}
                    placeholder="Ask anything"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      fontSize: "18px",
                      background: "transparent",
                    }}
                  />

                  <FaMicrophone />

                  <button
                    onClick={handleSend}
                    style={{
                      border: "none",
                      background: "#000",
                      color: "#fff",
                      borderRadius: "50%",
                      width: "42px",
                      height: "42px",
                      cursor: "pointer",
                    }}
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {activeSession.messages.map((msg, i) => {
                let codeBlockCounter = 0;
                return (
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "850px", // same as input box
                      margin: "0 auto",
                      display: "flex",
                      justifyContent:
                        msg.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      key={msg.id || i}
                      className={`message ${msg.role}`}
                      style={{
                        position: "relative",
                        width: "fit-content",
                        maxWidth: msg.role === "user" ? "60%" : "100%",
                        wordBreak: "break-word",
                      }}
                    >
                      {msg.role === "assistant" ? (
                        <>
                          {msg.content ? (
                            <ReactMarkdown
                              children={msg.content}
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code({
                                  inline,
                                  className,
                                  children,
                                  ...props
                                }) {
                                  const match = /language-(\w+)/.exec(
                                    className || "",
                                  );

                                  if (!inline && match) {
                                    const copyId = `${msg.id || i}-${codeBlockCounter}`;
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
                                          {copiedId === copyId
                                            ? "Copied!"
                                            : "Copy"}
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
                            loading &&
                            i === activeSession.messages.length - 1 && (
                              <div
                                style={{
                                  fontStyle: "italic",
                                  color: "#666",
                                  background: "#fff",
                                  padding: "10px 14px",
                                  borderRadius: "12px",
                                  boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                                }}
                              >
                                Typing...
                              </div>
                            )
                          )}

                          {/* Action Bar */}
                          {!(
                            loading && i === activeSession.messages.length - 1
                          ) &&
                            msg.content && (
                              <div
                                className="message-actions"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  marginTop: "8px",
                                  color: "#666",
                                }}
                              >
                                {/* Copy */}
                                <button
                                  onClick={() =>
                                    handleCopy(msg.content, msg.id)
                                  }
                                  className="message-action-btn"
                                  title="Copy"
                                >
                                  {copiedId === msg.id ? (
                                    <FaCheck />
                                  ) : (
                                    <FaRegCopy />
                                  )}
                                </button>

                                {/* Like */}
                                <button
                                  className="message-action-btn"
                                  title="Like"
                                  onClick={() => console.log("Liked")}
                                >
                                  👍
                                </button>

                                {/* Dislike */}
                                <button
                                  className="message-action-btn"
                                  title="Dislike"
                                  onClick={() => console.log("Disliked")}
                                >
                                  👎
                                </button>

                                {/* Share */}
                                <button
                                  className="message-action-btn"
                                  title="Share"
                                  onClick={() => {
                                    if (navigator.share) {
                                      navigator.share({
                                        text: msg.content,
                                      });
                                    } else {
                                      navigator.clipboard.writeText(
                                        msg.content,
                                      );
                                      alert("Message copied for sharing");
                                    }
                                  }}
                                >
                                  ↗️
                                </button>

                                {/* Regenerate */}
                                <button
                                  className="message-action-btn"
                                  title="Regenerate"
                                  onClick={() => handleSend()}
                                >
                                  🔄
                                </button>

                                {/* More */}
                                <div
                                  ref={
                                    openMoreMenuId === msg.id
                                      ? moreMenuRef
                                      : null
                                  }
                                  style={{ position: "relative" }}
                                >
                                  <button
                                    className="message-action-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMoreMenuId(
                                        openMoreMenuId === msg.id
                                          ? null
                                          : msg.id,
                                      );
                                    }}
                                  >
                                    <BsThreeDots />
                                  </button>

                                  {openMoreMenuId === msg.id && (
                                    <div
                                      className="message-more-menu"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {readingId === msg.id ? (
                                        <button
                                          className="message-more-item"
                                          onClick={stopReading}
                                        >
                                          ⏹ Stop Reading
                                        </button>
                                      ) : (
                                        <button
                                          className="message-more-item"
                                          onClick={() =>
                                            handleReadAloud(msg.content, msg.id)
                                          }
                                        >
                                          🔊 Read Aloud
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                        </>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                );
              })}

              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Input area only if chat selected */}
        {activeSession && !isNewConversationMode && (
          <ChatFooter
            input={input}
            setInput={setInput}
            inputRef={inputRef}
            adjustTextareaHeight={adjustTextareaHeight}
            handleKeyPress={handleKeyPress}
            handleVoiceStart={handleVoiceStart}
            listening={listening}
            loading={loading}
            handleStop={handleStop}
            handleSend={handleSend}
            TEXTAREA_MAX_HEIGHT={TEXTAREA_MAX_HEIGHT}
          />
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTargetId && (
        <DeleteConfirmationModal
          deleteTargetId={deleteTargetId}
          setDeleteTargetId={setDeleteTargetId}
          handleConfirmDelete={handleConfirmDelete}
        />
      )}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userName={userName}
        userEmail={localStorage.getItem("userEmail") || ""}
        userPicture=""
      />
      <FooterMenu
        userName={userName}
        showFooterMenu={showFooterMenu}
        footerMenuRef={footerMenuRef}
        menuItemStyle={menuItemStyle}
        setShowFooterMenu={setShowFooterMenu}
        setShowProfileModal={setShowProfileModal}
        handleLogout={handleLogout}
        width="100%"
      />
    </div>
  );
}

export default ChatBoard;
