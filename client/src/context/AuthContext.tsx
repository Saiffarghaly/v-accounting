import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface Office {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  office: Office | null;
  token: string | null;
  login: (token: string, office: Office) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {  const [token, setToken] = useState<string | null>(null);
const [office, setOffice] = useState<Office | null>(null);
  const login = (token: string, office: Office) => {
    setToken(token);
    setOffice(office);
    localStorage.setItem("token", token);
    localStorage.setItem("office", JSON.stringify(office));
  };

  const logout = () => {
    setToken(null);
    setOffice(null);
    localStorage.removeItem("token");
    localStorage.removeItem("office");
  };

  return (
    <AuthContext.Provider value={{ office, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};