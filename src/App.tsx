import React, { useState, useEffect } from "react";
import { User, Organization } from "./types";

import { LoginScreen } from "./components/LoginScreen";
import { SuperAdminDashboard } from "./components/SuperAdminDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { apiCall } from "./api";
import { LandingPage } from "./components/LandingPage";
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);

  // Which unauthenticated screen to show: marketing landing page first, login on demand
  const [view, setView] = useState<"landing" | "login">("landing");

  // Global dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  useEffect(() => {
    // Check for existing JWT in localStorage to auto-login
    const autoLogin = async () => {
      const token = localStorage.getItem("saas_jwt_token");
      if (!token) {
        setInitialized(true);
        return;
      }

      try {
        setLoading(true);
        const data = await apiCall("/api/auth/me");
        if (data && data.user) {
          setCurrentUser(data.user);
          setOrganization(data.organization || null);
        }
      } catch (err) {
        console.warn("Auto login session expired or invalid token.");
        localStorage.removeItem("saas_jwt_token");
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    autoLogin();
  }, []);

  const handleLoginSuccess = (user: User, org: Organization | null, token: string) => {
    localStorage.setItem("saas_jwt_token", token);
    setCurrentUser(user);
    setOrganization(org);
  };

  const handleLogout = () => {
    localStorage.removeItem("saas_jwt_token");
    setCurrentUser(null);
    setOrganization(null);
    setView("landing");
  };

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
          <span className="text-xs font-semibold tracking-wider font-mono">Initializing OmniPass...</span>
        </div>
      </div>
    );
  }

  // Router dispatcher based on User role
  if (!currentUser) {
    if (view === "landing") {
      return (
        <LandingPage
          onGetStarted={() => setView("login")}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      );
    }
    return <LoginScreen onLoginSuccess={handleLoginSuccess} darkMode={darkMode} setDarkMode={setDarkMode} />;
  }

  if (currentUser.role === "SUPER_ADMIN") {
    return (
      <SuperAdminDashboard
        currentUser={currentUser}
        onLogout={handleLogout}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  if (currentUser.role === "ORG_ADMIN" || currentUser.role === "RECEPTIONIST") {
    if (!organization) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4">
            <h2 className="font-display font-bold text-lg text-slate-800 dark:text-slate-200">No Organization Associated</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">Your account does not have an active subscription or organization link on OmniPass. Please contact Super Admin support.</p>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    return (
      <AdminDashboard
        currentUser={currentUser}
        organization={organization}
        onLogout={handleLogout}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <p className="text-xs text-red-500 font-bold">Error: Unsupported user role detected.</p>
    </div>
  );
}