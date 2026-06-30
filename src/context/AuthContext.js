import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const token = sessionStorage.getItem("token"); // ✅ FIXED

      console.log("TOKEN IN AUTH:", token);

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await axios.get("http://localhost:5000/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("AUTH USER:", res.data.user);

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
