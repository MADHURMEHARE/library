/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Users,
  Shield,
  Trash2,
  Ban,
  CheckCircle,
  Plus,
  TrendingUp,
  DollarSign,
  Briefcase,
  Layers,
  Settings,
  Bell,
  Search,
  Activity,
  LogOut,
  RefreshCw,
  AlertCircle,
  Sun,
  Moon
} from "lucide-react";
import { Organization, User, AuditLog, Announcement, SaaSPlan } from "../types";
import { apiCall } from "../api";
import Swal from "sweetalert2";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";

interface SuperAdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const SAAS_PLANS: SaaSPlan[] = [
  { id: "basic", name: "SaaS Basic Plan", price: 1500, maxStudents: 50, maxSeats: 30, features: ["Seat Allocation", "Basic Attendance", "Cash Payments"] },
  { id: "standard", name: "SaaS Standard Plan", price: 3000, maxStudents: 150, maxSeats: 100, features: ["AC/Non-AC Spaces", "QR Code Attendance", "UPI/Card Payments", "Basic Reports"] },
  { id: "premium", name: "SaaS Premium Plan", price: 6000, maxStudents: 500, maxSeats: 400, features: ["Unlimited Rooms", "Student ID Generator", "Receipt Printers", "Advanced Analytics", "Audit Timelines"] }
];

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  currentUser,
  onLogout,
  darkMode,
  setDarkMode
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dbStatus, setDbStatus] = useState<{ connected: string; type: string; details: string }>({
    connected: "local",
    type: "JSON Local File",
    details: "Checking connection..."
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Organization Modal
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgPlan, setOrgPlan] = useState("basic");
  const [orgAdminName, setOrgAdminName] = useState("");
  const [orgAdminEmail, setOrgAdminEmail] = useState("");
  const [submittingOrg, setSubmittingOrg] = useState(false);

  // Announcement Modal
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [submittingAnn, setSubmittingAnn] = useState(false);

  // Search
  const [orgSearch, setOrgSearch] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch DB status asynchronously
      apiCall("/api/db-status")
        .then(data => setDbStatus(data))
        .catch(err => console.error("Failed to fetch DB status:", err));
      
      const orgsData = await apiCall("/api/organizations");
      const logsData = await apiCall("/api/audit-logs");
      const announcementsData = await apiCall("/api/announcements");

      setOrganizations(orgsData);
      setAuditLogs(logsData);
      setAnnouncements(announcementsData);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve platform data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !orgEmail || !orgAdminEmail || !orgAdminName) {
      Swal.fire({
        icon: "warning",
        title: "Missing Information",
        text: "Please fill in all mandatory fields.",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      return;
    }

    try {
      setSubmittingOrg(true);
      await apiCall("/api/organizations", "POST", {
        name: orgName,
        email: orgEmail,
        phone: orgPhone,
        address: orgAddress,
        planId: orgPlan,
        adminName: orgAdminName,
        adminEmail: orgAdminEmail
      });

      // Reset Form
      setOrgName("");
      setOrgEmail("");
      setOrgPhone("");
      setOrgAddress("");
      setOrgPlan("basic");
      setOrgAdminName("");
      setOrgAdminEmail("");
      setIsOrgModalOpen(false);

      Swal.fire({
        icon: "success",
        title: "Organization Registered",
        text: "New reading room organization created successfully.",
        timer: 2000,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });

      // Refresh
      fetchData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: err.message || "Failed to create organization.",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setSubmittingOrg(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;

    try {
      setSubmittingAnn(true);
      await apiCall("/api/announcements", "POST", {
        title: annTitle,
        content: annContent,
        orgId: null // platform-wide
      });

      setAnnTitle("");
      setAnnContent("");
      setIsAnnModalOpen(false);
      
      Swal.fire({
        icon: "success",
        title: "Broadcast Published",
        text: "System-wide announcement posted successfully.",
        timer: 1500,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });

      fetchData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Publication Error",
        text: err.message || "Failed to create announcement.",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setSubmittingAnn(false);
    }
  };

  const toggleOrgStatus = async (id: string, currentStatus: "active" | "suspended") => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    Swal.fire({
      title: 'Change status?',
      text: `Are you sure you want to change this organization's status to ${nextStatus}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, change status!',
      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiCall(`/api/organizations/${id}`, "PUT", { status: nextStatus });
          Swal.fire({
            title: 'Updated!',
            text: 'Organization status updated successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
          fetchData();
        } catch (err: any) {
          Swal.fire({
            title: 'Error!',
            text: err.message || "Failed to update organization status.",
            icon: 'error',
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
        }
      }
    });
  };

  const handleDeleteOrg = async (id: string) => {
    Swal.fire({
      title: 'CRITICAL WARNING!',
      text: "This will permanently delete this Reading Room and all associated student lists, seat allocations, plans, invoices, and receptionist accounts! This action cannot be undone. Are you sure?",
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, permanently delete!',
      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiCall(`/api/organizations/${id}`, "DELETE");
          Swal.fire({
            title: 'Deleted!',
            text: 'The Reading Room and all associated data have been permanently deleted.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
          fetchData();
        } catch (err: any) {
          Swal.fire({
            title: 'Error!',
            text: err.message || "Failed to delete organization.",
            icon: 'error',
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
        }
      }
    });
  };

  const handleDeleteAnnouncement = async (id: string) => {
    Swal.fire({
      title: 'Delete Announcement?',
      text: "Are you sure you want to delete this announcement?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!',
      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiCall(`/api/announcements/${id}`, "DELETE");
          Swal.fire({
            title: 'Deleted!',
            text: 'The announcement has been deleted.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
          fetchData();
        } catch (err: any) {
          Swal.fire({
            title: 'Error!',
            text: err.message || "Failed to delete announcement.",
            icon: 'error',
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
        }
      }
    });
  };

  // Metrics Calculations
  const activeOrgs = organizations.filter(o => o.status === "active").length;
  const totalOrgs = organizations.length;
  
  // Calculate SaaS monthly recurring revenue (MRR) based on registered organizations and plan values
  const saasMRR = organizations.reduce((acc, org) => {
    const plan = SAAS_PLANS.find(p => p.id === org.planId);
    return acc + (plan?.price || 0);
  }, 0);

  // Filter Orgs
  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
    org.email.toLowerCase().includes(orgSearch.toLowerCase())
  );

  // Platform Analytics seed-data
  const revenueTrend = [
    { month: "Jan", MRR: 4500, signups: 3 },
    { month: "Feb", MRR: 7500, signups: 2 },
    { month: "Mar", MRR: 12000, signups: 3 },
    { month: "Apr", MRR: 15000, signups: 2 },
    { month: "May", MRR: 19500, signups: 3 },
    { month: "Jun", MRR: 24000, signups: 4 },
    { month: "Jul", MRR: saasMRR, signups: activeOrgs }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      
      {/* Platform Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-xs no-print">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-display font-bold text-lg shadow-md shadow-indigo-200 dark:shadow-none">
            Ω
          </div>
          <div>
            <h1 className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">
              OmniPass SaaS Platform
            </h1>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase block">
              Global Control Plane
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Database Status Indicator */}
          <div 
            title={dbStatus.details}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold uppercase tracking-wider ${
              dbStatus.connected === "cloud"
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400"
                : dbStatus.connected === "error"
                ? "bg-rose-50/80 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400 cursor-help"
                : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${
              dbStatus.connected === "cloud" 
                ? "bg-emerald-500 animate-pulse" 
                : dbStatus.connected === "error"
                ? "bg-rose-500 animate-ping"
                : "bg-slate-400"
            }`} />
            <span>{dbStatus.type === "JSON Local File" ? "LOCAL" : dbStatus.type} {dbStatus.connected === "error" ? "FAIL" : ""}</span>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-lg p-2 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="hidden sm:flex flex-col items-end text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.name}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span>PLATFORM OWNER</span>
            </span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80 transition"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {dbStatus.connected === "error" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 dark:bg-rose-950/10 dark:border-rose-900/40 animate-fade-in no-print">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xs text-rose-900 dark:text-rose-200 uppercase tracking-wide">Database Synchronization Connection Offline</h3>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                  {dbStatus.details}
                </p>
                <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-2 font-semibold">
                  💡 Note: The application is running smoothly! All data is being read and written to your local offline fallback db (`db.json`) inside your container, so you will not lose any progress.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold">Platform Synchronization Failure</h3>
              <p className="text-sm mt-0.5">{error}</p>
              <button onClick={fetchData} className="mt-2 text-xs font-bold underline flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white border border-slate-200/80 p-5 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Reading Rooms</span>
              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-display font-bold text-slate-900 dark:text-white">{totalOrgs}</span>
              <p className="text-xs text-slate-400 mt-1">
                <span className="text-emerald-500 font-semibold">{activeOrgs}</span> active tenants
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-slate-200/80 p-5 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Platform SaaS MRR</span>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-display font-bold text-slate-900 dark:text-white">
                ₹{saasMRR.toLocaleString()}
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Monthly subscription volume
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-slate-200/80 p-5 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan Distribution</span>
              <div className="rounded-lg bg-violet-50 p-2 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400">
                <Briefcase className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-display font-bold text-slate-900 dark:text-white">
                {organizations.filter(o => o.planId === "premium").length} Premium
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Highest subscription tier
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-slate-200/80 p-5 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Platform Security</span>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-lg font-display font-bold text-slate-900 dark:text-white">100% Isolated Data</span>
              <p className="text-xs text-slate-400 mt-1">
                Multi-tenant schema validation
              </p>
            </div>
          </div>
        </div>

        {/* Charts & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 lg:col-span-2 flex flex-col h-[320px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">
                  SaaS Revenue & Tenant Growth Trend
                </h3>
              </div>
            </div>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="colorMRR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                  <Area type="monotone" dataKey="MRR" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorMRR)" name="SaaS Revenue (INR)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 flex flex-col h-[320px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-600" />
                <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">
                  Global System Announcements
                </h3>
              </div>
              <button
                onClick={() => setIsAnnModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Plus className="h-3 w-3" /> Add Alert
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {announcements.filter(a => a.orgId === null).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                  <Bell className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                  <p>No active platform alerts.</p>
                </div>
              ) : (
                announcements.filter(a => a.orgId === null).map(ann => (
                  <div key={ann.id} className="rounded-lg bg-slate-50 border border-slate-100 p-3.5 dark:bg-slate-950 dark:border-slate-800 flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{ann.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{ann.content}</p>
                      <span className="text-[9px] text-slate-400 mt-2 block font-mono">{ann.createdAt.split("T")[0]}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="text-slate-400 hover:text-red-500 p-0.5 rounded-lg transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Organization Directory Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Reading Room Organizations Directory
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage accounts, subscriptions, and suspend/resume business tenants.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search organization..."
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full sm:w-60 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <button
                onClick={() => setIsOrgModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Add Reading Room</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold dark:bg-slate-950 dark:border-slate-800">
                  <th className="p-4">ORGANIZATION</th>
                  <th className="p-4">CONTACT</th>
                  <th className="p-4">ADDRESS</th>
                  <th className="p-4">ACTIVE PLAN</th>
                  <th className="p-4">STATUS</th>
                  <th className="p-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <Layers className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                      <p>No organizations found matching the filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map(org => {
                    const plan = SAAS_PLANS.find(p => p.id === org.planId);
                    return (
                      <tr key={org.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={org.logo}
                              alt={org.name}
                              referrerPolicy="no-referrer"
                              className="h-9 w-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                            />
                            <div>
                              <h4 className="font-bold text-slate-800 dark:text-slate-100">{org.name}</h4>
                              <span className="text-[10px] text-slate-400 block font-mono">ID: {org.id} | Joined {org.createdAt.split("T")[0]}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-slate-700 dark:text-slate-300">{org.email}</p>
                          <p className="text-slate-400 text-[10px]">{org.phone}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-slate-600 dark:text-slate-400 max-w-[180px] truncate">{org.address}</p>
                        </td>
                        <td className="p-4">
                          <div className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 uppercase dark:bg-indigo-950/40 dark:text-indigo-400">
                            {plan?.name || org.planId}
                          </div>
                          <span className="block text-[10px] text-slate-400 font-medium mt-0.5">₹{(plan?.price || 0).toLocaleString()}/Mo</span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                            org.status === "active"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${org.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            <span>{org.status}</span>
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => toggleOrgStatus(org.id, org.status)}
                              title={org.status === "active" ? "Suspend reading room" : "Resume reading room"}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/80 transition"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrg(org.id)}
                              title="Permeantly delete"
                              className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 dark:border-red-950/20 dark:hover:bg-red-950/50 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Activity Timeline */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" />
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">
                Live Audit Logs & System Action Timeline
              </h3>
            </div>
            <span className="text-[10px] text-emerald-500 font-bold tracking-wider uppercase font-mono">
              ● REALTIME
            </span>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {auditLogs.map(log => (
              <div key={log.id} className="flex gap-4 text-xs">
                <div className="flex flex-col items-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-50 dark:ring-indigo-950"></div>
                  <div className="flex-1 w-0.5 bg-slate-100 dark:bg-slate-800 mt-2"></div>
                </div>
                <div className="flex-1 pb-4 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{log.details}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                    Triggered by: {log.userName} (User: {log.userId})
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* New Org Modal */}
      {isOrgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">
                Register New Reading Room Organization
              </h3>
              <button onClick={() => setIsOrgModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOrg} className="overflow-y-auto p-6 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Athena Silent Study, Delhi"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Business Email *</label>
                  <input
                    type="email"
                    required
                    value={orgEmail}
                    onChange={(e) => setOrgEmail(e.target.value)}
                    placeholder="contact@athena.com"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={orgPhone}
                    onChange={(e) => setOrgPhone(e.target.value)}
                    placeholder="+91 99999 88888"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Address Location</label>
                  <input
                    type="text"
                    value={orgAddress}
                    onChange={(e) => setOrgAddress(e.target.value)}
                    placeholder="Sector 12, Enclave Road, Metro Station Hub, Delhi"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">SaaS Subscription Plan</label>
                  <select
                    value={orgPlan}
                    onChange={(e) => setOrgPlan(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {SAAS_PLANS.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (₹{p.price}/Mo)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 dark:border-slate-800/80 space-y-4">
                <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400">SaaS Organization Admin Account Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Admin Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      value={orgAdminName}
                      onChange={(e) => setOrgAdminName(e.target.value)}
                      placeholder="Vikram Malhotra"
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Admin Owner Email *</label>
                    <input
                      type="email"
                      required
                      value={orgAdminEmail}
                      onChange={(e) => setOrgAdminEmail(e.target.value)}
                      placeholder="admin@athena.com"
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOrgModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrg}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition flex items-center gap-1"
                >
                  {submittingOrg ? "Registering..." : "Activate SaaS Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {isAnnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">
                Post Global Announcement
              </h3>
              <button onClick={() => setIsAnnModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="Platform Maintenance Scheduled"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Announcement Body</label>
                <textarea
                  required
                  rows={4}
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="The system will undergo quick optimizations on..."
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAnnModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAnn}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                >
                  {submittingAnn ? "Posting..." : "Broadcast Alert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// Mock standard X icon component replacement
const X: React.FC<{ className?: string; onClick?: () => void }> = ({ className, onClick }) => {
  return (
    <svg onClick={onClick} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
};
