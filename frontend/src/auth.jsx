import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getToken, setToken, apiMe } from "./api.ts";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getToken()) {
      const ac = new AbortController();
      apiMe(ac.signal)
        .then((u) => setUser(u))
        .catch(() => setToken(""))
        .finally(() => setLoading(false));
      return () => ac.abort();
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback((token, userData) => {
    setToken(token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}