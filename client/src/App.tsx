import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./Dashboard";
import Landing from "./pages/Landing";

const AppContent = () => {
  const { token } = useAuth();
  const [page, setPage] = useState<"landing" | "login" | "register">("landing");

  if (token) return <Dashboard />;
  if (page === "login") return <Login onSwitch={() => setPage("register")} />;
  if (page === "register") return <Register onSwitch={() => setPage("login")} />;
  return <Landing onLogin={() => setPage("login")} onRegister={() => setPage("register")} />;
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
