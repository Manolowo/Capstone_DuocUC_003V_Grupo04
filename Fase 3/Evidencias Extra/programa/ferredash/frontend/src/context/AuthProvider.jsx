// src/context/AuthProvider.jsx
import { useState, useEffect } from "react";
import AuthContext from "./AuthContext";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "null")
  );
  const [tokens, setTokens] = useState(() =>
    JSON.parse(localStorage.getItem("tokens") || "null")
  );

  const isAuthenticated = !!tokens?.access;

  const getAuthHeader = () =>
    tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {};

  const login = (userData, tokenData) => {
    setUser(userData);
    setTokens(tokenData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("tokens", JSON.stringify(tokenData));
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem("user");
    localStorage.removeItem("tokens");
  };

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem("user") || "null"));
    setTokens(JSON.parse(localStorage.getItem("tokens") || "null"));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isAuthenticated,
        login,
        logout,
        setUser,
        setTokens,
        getAuthHeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
