import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { isAuthSessionValid } from "../utils/auth";

const AuthContext = createContext();
const API_URL = process.env.REACT_APP_RAG_API_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      if (!isAuthSessionValid()) {
        setUser(null);
        setLoading(false);
        return;
      }

      const token = sessionStorage.getItem("token");

      const res = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(res.data.user);
    } catch (err) {
      console.error("Auth error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchUser();
  }, []);

  // 🔥 LISTEN LOGIN EVENT
  useEffect(() => {
    const handler = () => {
      fetchUser();
    };

    window.addEventListener("auth-change", handler);
    return () => window.removeEventListener("auth-change", handler);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
