import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { api } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("twirl_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("twirl_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (token) localStorage.setItem("twirl_token", token);
    else localStorage.removeItem("twirl_token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("twirl_user", JSON.stringify(user));
    else localStorage.removeItem("twirl_user");
  }, [user]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAdmin: user?.role === "admin",
      async login(email, password) {
        const data = await api("/api/auth/login", { method: "POST", body: { email, password } });
        setToken(data.token);
        setUser(data.user);
        return data.user;
      },
      async register(payload) {
        const data = await api("/api/auth/register", { method: "POST", body: payload });
        setToken(data.token);
        setUser(data.user);
        return data.user;
      },
      logout() {
        setToken("");
        setUser(null);
      },
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
