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
  FaArrowDown,
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
import ChatLimitModal from "./components/Modals/ChatLimitModal";
import ChatPromptLimitModal from "./components/Modals/ChatPromptLimitModal";
import MainLoaderModal from "./components/Modals/MainLoaderModal";

SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("json", json);

function ChatBoard() {
  const API_URL = process.env.REACT_APP_RAG_API_URL;
  const token = sessionStorage.getItem("token");
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
  const [limitExpired, setLimitExpired] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");
  const [showPromptLimitModal, setShowPromptLimitModal] = useState(false);
  const moreMenuRef = useRef(null);
  const chatEndRef = useRef(null);
  const controllerRef = useRef(null);
  const userMenuRef = useRef(null);
  const footerMenuRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem("isAuthenticated");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("userEmail");
    sessionStorage.removeItem("authProvider");
    sessionStorage.removeItem("activeSessionId");

    navigate("/");
  };

  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    const storedName = sessionStorage.getItem("userName");

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

      const savedChatId = sessionStorage.getItem("activeSessionId");

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
      sessionStorage.setItem("activeSessionId", String(chatId));

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
    setShowScrollToBottom(false);
  }, [sessions, activeSessionId]);

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isAtBottom =
      container.scrollTop + container.clientHeight >=
      container.scrollHeight - 40;
    setShowScrollToBottom(!isAtBottom);
  };
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollToBottom(false);
  };

  // ensure textarea height matches content when input or active session changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [input, activeSessionId, isSidebarCollapsed]);

  const activeSession = sessions.find(
    (s) => String(s.id) === String(activeSessionId),
  );

  const PROMPT_LIMIT_PER_CHAT = 11;
  const currentChatPromptCount = activeSession?.messages?.filter(
    (m) => m.role === "user",
  )?.length || 0;

  // Show the prompt limit banner when the next question would exceed the
  // allowed number of chat prompts for this conversation.
  const promptLimitReached =
    currentChatPromptCount >= PROMPT_LIMIT_PER_CHAT - 1 &&
    !limitExpired;

  useEffect(() => {
    if (promptLimitReached) {
      setShowPromptLimitModal(true);
    } else {
      setShowPromptLimitModal(false);
    }
  }, [promptLimitReached, limitExpired]);

  const createNewChat = () => {
    setActiveSessionId(null);
    setInput("");
    setPendingChat(true);
    setIsNewConversationMode(true);

    sessionStorage.removeItem("activeSessionId");
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
    if (promptLimitReached) {
      setShowPromptLimitModal(true);
      return;
    }
    const question = input;
    setIsNewConversationMode(false);
    try {
      const statusResponse = await fetch(`${API_URL}/api/prompt-status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const statusData = await statusResponse.json();
      if (statusData.isLimitReached) {
        setLimitMessage(statusData.message || "Daily prompt limit reached.");
        setLimitExpired(true);
        return;
      }
      setLimitExpired(false);
    } catch (error) {
      console.error("Prompt status check failed:", error);
    }
    let fullText = "";

    const uid = crypto.randomUUID();
    const userMessage = {
      id: uid,
      role: "user",
      content: question,
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
          title: question.slice(0, 30),
          messages: [],
        };

        setSessions((prev) => [newChat, ...prev]);

        setActiveSessionId(String(chat.id));
        sessionStorage.setItem("activeSessionId", String(chat.id));

        chatId = chat.id;

        setPendingChat(false);
      } catch (err) {
        console.error(err);
        return;
      }
    }
    await saveMessageToDB(chatId, "user", question);

    setSessions((prev) =>
      prev.map((s) =>
        s.id === chatId
          ? {
              ...s,
              title: s.messages.length === 0 ? question.slice(0, 30) : s.title,
              messages: [...(s.messages || []), userMessage],
            }
          : s,
      ),
    );
    setInput("");
    setLoading(true);

    const assistantMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: "",
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === chatId
          ? {
              ...s,
              messages: [...(s.messages || []), assistantMessage],
            }
          : s,
      ),
    );

    try {
      controllerRef.current = new AbortController();

      const response = await fetch(`${API_URL}/ask-docs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question,
        }),
        signal: controllerRef.current.signal,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Chat API error ${response.status}: ${errorText || response.statusText}`,
        );
      }
      if (response.status === 429) {
        const error = await response.json();
        setLimitMessage(error.message || "Daily prompt limit reached.");
        setLimitExpired(true);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === chatId
              ? {
                  ...s,
                  messages: s.messages.filter(
                    (m) => m.id !== assistantMessage.id,
                  ),
                }
              : s,
          ),
        );
        return;
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let rawStream = "";
      let sawContent = false;
      let pendingText = "";
      let flushTimer = null;

      const updateAssistantMessage = (content) => {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === chatId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantMessage.id
                      ? {
                          ...m,
                          content,
                        }
                      : m,
                  ),
                }
              : s,
          ),
        );
      };

      const flushPending = () => {
        if (!pendingText) return;
        fullText = appendChunk(fullText, pendingText);
        pendingText = "";
        updateAssistantMessage(fullText);
      };

      const scheduleFlush = () => {
        if (flushTimer) return;
        flushTimer = setTimeout(() => {
          flushTimer = null;
          flushPending();
        }, 50);
      };

      const processPart = (part) => {
        if (!part.startsWith("data:")) return;
        const dataStr = part.replace("data:", "").trim();
        if (dataStr === "[DONE]") return;

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.type === "limit") {
            if (parsed.remaining === 0) {
              setLimitMessage("Daily prompt limit reached.");
              setLimitExpired(true);
            }
            return;
          }

          const content =
            parsed.content || parsed.answer || parsed.output || "";
          if (content) {
            sawContent = true;
            pendingText = appendChunk(pendingText, content);
            scheduleFlush();
          }
        } catch (err) {
          console.warn("stream parse error", dataStr);
        }
      };

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const textChunk = decoder.decode(value, {
            stream: true,
          });
          rawStream += textChunk;
          buffer += textChunk;
          const parts = buffer.split("\n\n");
          buffer = parts.pop();

          for (const part of parts) {
            processPart(part);
          }
        }

        if (buffer.trim()) {
          processPart(buffer);
        }
      }

      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flushPending();

      if (!sawContent) {
        const fallbackText = rawStream.trim() || (await response.text()).trim();
        let fallbackContent = fallbackText;

        try {
          const parsed = JSON.parse(fallbackText);
          fallbackContent =
            parsed.content ||
            parsed.answer ||
            parsed.output ||
            parsed.message ||
            JSON.stringify(parsed);
        } catch (err) {
          // not JSON, use raw text as fallback
        }

        if (fallbackContent) {
          fullText = appendChunk(fullText, fallbackContent);
          updateAssistantMessage(fullText);
        }
      }

      if (fullText.trim()) {
        await saveMessageToDB(chatId, "assistant", fullText);
      }
      const status = await fetch(`${API_URL}/api/prompt-status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const latest = await status.json();
      if (latest.isLimitReached) {
        setLimitMessage(latest.message);
        setLimitExpired(true);
      }
    } catch (err) {
      if (err.name === "AbortError") return;

      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const checkPromptStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/prompt-status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (data.isLimitReached) {
          setLimitExpired(true);
          setLimitMessage(data.message || "Daily prompt limit reached.");
        } else {
          setLimitExpired(false);
          setLimitMessage("");
        }
      } catch (error) {
        console.error("Limit check failed", error);
      }
    };
    if (token) {
      checkPromptStatus();
    }
  }, [token]);

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

  useEffect(() => {
    const handleFooterMenuOutsideClick = (event) => {
      if (
        footerMenuRef.current &&
        !footerMenuRef.current.contains(event.target)
      ) {
        setShowFooterMenu(false);
      }
    };

    document.addEventListener("mousedown", handleFooterMenuOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleFooterMenuOutsideClick);
    };
  }, []);

  // --- JSX ---
  return (
    <>
      {isChatLoading && (
        <div>
          <MainLoaderModal />
        </div>
      )}
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
          limitExpired={limitExpired}
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
              <strong
                style={{
                  height: "40px",
                  lineHeight: "40px",
                  color: "#5b6670",
                  fontSize: "20px",
                  fontWeight: "700",
                }}
              >
                {" "}
                NV | Assistant
                <img
                  src="/NVlg.ico"
                  alt="NV Logo"
                  style={{
                    width: "32px",
                    height: "32px",
                  }}
                />
              </strong>
            </div>
          </header>

          <div
            className="chat-messages"
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            style={{
              position: "relative",
              flex: 1,
              overflowY: "auto",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {isOpeningChat ? (
              <ChatLoader text="Loading chat..." />
            ) : !activeSession ||
              pendingChat ||
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
                    Hi, {userName?.split(" ")[0] || "User"}!
                  </h1>
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
                    {/* <FaPlus /> */}

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
                    <button
                      disabled={limitExpired}
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
                        background:
                          input.trim() && !limitExpired ? "#202123" : "#d1d5db",
                        cursor:
                          input.trim() && !limitExpired
                            ? "pointer"
                            : "not-allowed",
                        opacity: limitExpired ? 0.5 : 1,
                      }}
                    >
                      <FaPaperPlane />
                    </button>
                  </div>
                  <div className="suggestion-buttons">
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
                                            {String(children).replace(
                                              /\n$/,
                                              "",
                                            )}
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
                                <div className="typing-indicator">
                                  <div className="typing-dot" />
                                  <div className="typing-dot" />
                                  <div className="typing-dot" />
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
                                              handleReadAloud(
                                                msg.content,
                                                msg.id,
                                              )
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
          {showScrollToBottom && (
            <button
              className="scroll-to-bottom-btn"
              onClick={scrollToBottom}
              title="Scroll to latest message"
              type="button"
            >
              <FaArrowDown />
            </button>
          )}

          {/* Input area only if chat selected */}
          {activeSession && !isNewConversationMode && (
            <>
              {limitExpired && (
                <ChatLimitModal
                  message={limitMessage}
                  onUpgrade={() => navigate("/pricing")}
                  onClose={() => setLimitExpired(false)}
                />
              )}

              <ChatPromptLimitModal
                isOpen={showPromptLimitModal}
                onClose={() => setShowPromptLimitModal(false)}
                onNewChat={() => {
                  setShowPromptLimitModal(false);
                  createNewChat();
                }}
              />

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
                limitExpired={limitExpired}
                promptLimitReached={promptLimitReached}
              />
            </>
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
          userEmail={sessionStorage.getItem("userEmail") || ""}
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
    </>
  );
}

export default ChatBoard;
