import React from "react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import { CountryProvider } from "./contexts/CountryContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { DashboardDataProvider } from "./contexts/DashboardDataContext";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [theme, setTheme] = React.useState("light");
  const { toast } = useToast();

  const handleLogin = (credentials) => {
    if (credentials.email === "admin@example.com" && credentials.password === "password") {
      setIsAuthenticated(true);
      toast({
        title: "Welcome back!",
        description: `You have successfully logged in to ${credentials.country} EWARS.`,
      });
    } else {
      toast({
        title: "Authentication Error",
        description: "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
    document.documentElement.classList.toggle("dark");
  };

  return (
    <CountryProvider>
      <LanguageProvider>
        <div className={`min-h-screen bg-background ${theme}`}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="container mx-auto px-4"
          >
            {!isAuthenticated ? (
              <Login onLogin={handleLogin} />
            ) : (
              <DashboardDataProvider>
                <Dashboard theme={theme} onThemeToggle={toggleTheme} />
              </DashboardDataProvider>
            )}
          </motion.div>
          <Toaster />
        </div>
      </LanguageProvider>
    </CountryProvider>
  );
};

export default App;
