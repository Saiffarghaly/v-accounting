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
  role: string;
  login: (token: string, office: Office, role?: string) => void;
  logout: () => void;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [office, setOffice] = useState<Office | null>(null);
  const [role, setRole] = useState<string>("owner");

  const login = (token: string, office: Office, userRole?: string) => {
    const finalRole = userRole || "owner";
    setToken(token);
    setOffice(office);
    setRole(finalRole);
    localStorage.setItem("token", token);
    localStorage.setItem("office", JSON.stringify(office));
    localStorage.setItem("role", finalRole);
  };

  const logout = () => {
    setToken(null);
    setOffice(null);
    setRole("owner");
    localStorage.removeItem("token");
    localStorage.removeItem("office");
    localStorage.removeItem("role");
  };

  const canEdit = role === "owner" || role === "accountant";
  const canDelete = role === "owner";
  const canManageUsers = role === "owner";

  return (
    <AuthContext.Provider value={{ office, token, role, login, logout, canEdit, canDelete, canManageUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};