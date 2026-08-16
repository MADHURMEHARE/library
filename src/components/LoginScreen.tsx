/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Shield, Sparkles, Key, Mail, Landmark, UserCheck, AlertCircle, Sun, Moon } from "lucide-react";
import { User, Organization } from "../types";

interface LoginScreenProps {
  onLoginSuccess: (user: User, organization: Organization | null, token: string) => void;
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, darkMode, setDarkMode }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      // Store in localStorage if rememberMe
      if (rememberMe) {
        localStorage.setItem("saas_jwt_token", data.token);
      }
      
      onLoginSuccess(data.user, data.organization, data.token);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your inputs.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setForgotSuccessMessage(null);

    try {
      const response = await fetch("/api/auth/reset-password-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to trigger reset.");
      }

      setForgotSuccessMessage(data.message);
      setForgotEmail("");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to auto fill login inputs for easy testing
  const autoFill = (testEmail: string) => {
    setEmail(testEmail);
    setPassword("password");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center px-4 py-10 sm:px-6 sm:py-12 lg:px-8 relative">
      
      {/* Floating Theme Toggle (Top Right) */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="rounded-lg p-2.5 border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 transition shadow-xs"
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun className="h-[18px] w-[18px] text-amber-500" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
      </div>
      
      <div className="mt-10 sm:mt-0 sm:mx-auto sm:w-full sm:max-w-md text-center px-6 sm:px-0">
        {/* Header Badge */}
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-display font-extrabold text-2xl shadow-xl shadow-indigo-100 dark:shadow-none mb-4">
          Ω
        </div>
        
        <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Library Rooms
        </h2>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          Professional Reading Rooms, Study Libraries &amp; Silent Centers
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-6 px-5 sm:py-8 sm:px-6 shadow-xl border border-slate-200/50 dark:border-slate-800/80 rounded-2xl space-y-6">
          
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 p-3.5 text-xs text-red-700 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="h-[18px] w-[18px] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {forgotPasswordMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">
                Recover SaaS Account Password
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Enter your registered business email. We'll simulate delivering a reset magic link.
              </p>

              {forgotSuccessMessage && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3.5 text-xs text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400">
                  {forgotSuccessMessage}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@athena.com"
                    className="pl-9 pr-4 py-2.5 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotPasswordMode(false)}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 transition"
                >
                  Back to login
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 transition"
                >
                  {loading ? "Sending..." : "Recover Password"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@athena.com"
                    autoComplete="email"
                    className="pl-9 pr-4 py-2.5 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordMode(true)}
                    className="text-[10px] font-bold text-indigo-600 hover:underline dark:text-indigo-400 shrink-0"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pl-9 pr-4 py-2.5 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span>Remember my device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 py-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 transition flex items-center justify-center gap-1"
              >
                {loading ? "Authenticating..." : "Login to Workspace"}
              </button>
            </form>
          )}

          {/* Quick Sandbox Credentials (For Testing) */}
          <div className="border-t border-slate-100 pt-5 dark:border-slate-800/80 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Quick Sandbox Logins (Click to autofill)
            </span>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => autoFill("superadmin@platform.com")}
                className="text-left w-full rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 p-2.5 text-xs flex items-center gap-2.5 transition dark:bg-slate-950 dark:border-slate-800"
              >
                <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-600 dark:bg-indigo-950/40 shrink-0">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate">Platform Super Admin</h4>
                  <p className="text-[9px] text-slate-400 font-mono truncate">superadmin@platform.com</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => autoFill("admin@athena.com")}
                className="text-left w-full rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 p-2.5 text-xs flex items-center gap-2.5 transition dark:bg-slate-950 dark:border-slate-800"
              >
                <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-600 dark:bg-indigo-950/40 shrink-0">
                  <Landmark className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate">Athena Reading Room Owner</h4>
                  <p className="text-[9px] text-slate-400 font-mono font-semibold text-indigo-600 dark:text-indigo-400 truncate">admin@athena.com</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => autoFill("staff@athena.com")}
                className="text-left w-full rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 p-2.5 text-xs flex items-center gap-2.5 transition dark:bg-slate-950 dark:border-slate-800"
              >
                <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-600 dark:bg-indigo-950/40 shrink-0">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate">Athena Frontdesk Receptionist</h4>
                  <p className="text-[9px] text-slate-400 font-mono truncate">algomiantlab pvt.com</p>
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};