import { createContext, useContext, useState } from "react";
import { getToken, setToken, clearToken } from "../api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTok] = useState(getToken);

  const login = (t) => { setToken(t); setTok(t); };
  const logout = () => { clearToken(); setTok(null); };

  return (
    <AuthCtx.Provider value={{ token, login, logout, isAdmin: !!token }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
