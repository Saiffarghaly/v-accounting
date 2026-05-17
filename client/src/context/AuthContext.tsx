import { createContext, useContext, useState, useEffect } from "react";
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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [office, setOffice] = useState<Office | null>(() => {
    try {
      const stored = localStorage.getItem("office");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [role, setRole] = useState<string>(() => localStorage.getItem("role") || "owner");

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("office", JSON.stringify(office));
      localStorage.setItem("role", role);
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("office");
      localStorage.removeItem("role");
    }
  }, [token, office, role]);

  const login = (token: string, office: Office, userRole?: string) => {
    const finalRole = userRole || "owner";
    setToken(token);
    setOffice(office);
    setRole(finalRole);
  };

  const logout = () => {
    setToken(null);
    setOffice(null);
    setRole("owner");
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
