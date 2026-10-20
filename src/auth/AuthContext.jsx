import { createContext, useContext, useMemo, useState } from "react";
import api from "../api/client.js";

const AuthContext = createContext(null);

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("ems_user") || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);

  async function login(email, password) {
    const response = await api.post("/auth/login", { email, password });
    const { user: authenticatedUser, token } = response.data.data;
    localStorage.setItem("ems_token", token);
    localStorage.setItem("ems_user", JSON.stringify(authenticatedUser));
    setUser(authenticatedUser);
  }

  function logout() {
    localStorage.removeItem("ems_token");
    localStorage.removeItem("ems_user");
    setUser(null);
  }

  const value = useMemo(() => ({
    user,
    isOwner: user?.role === "OWNER",
    login,
    logout,
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
