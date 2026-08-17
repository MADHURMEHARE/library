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
  Moon,
  Key,
  Eye,
  EyeOff,
  Copy,
  UserPlus,
  Check
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
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dbStatus, setDbStatus] = useState<{ connected: string; type: string; details: string }>({
    connected: "local",
    type: "JSON Local File",
    details: "Checking connection..."
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Main Tab
  const [mainTab, setMainTab] = useState<"organizations" | "users">("organizations");

  // Passwords visibility mapping
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  // New Organization Modal
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgPlan, setOrgPlan] = useState("basic");
  const [orgAdminName, setOrgAdminName] = useState("");
  const [orgAdminEmail, setOrgAdminEmail] = useState("");
  const [orgAdminPassword, setOrgAdminPassword] = useState("password");
  const [submittingOrg, setSubmittingOrg] = useState(false);

  // User Management Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "ORG_ADMIN" as any,
    password: "password",
    orgId: ""
  });
  const [submittingUser, setSubmittingUser] = useState(false);

  // Announcement Modal
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [submittingAnn, setSubmittingAnn] = useState(false);

  // Search
  const [orgSearch, setOrgSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch DB status asynchronously
      apiCall("/api/db-status")
        .then(data => setDbStatus(data))
        .catch(err => console.error("Failed to fetch DB status:", err));
      
      const [orgsData, usersData, logsData, announcementsData] = await Promise.all([
        apiCall("/api/organizations"),
        apiCall("/api/users"),
        apiCall("/api/audit-logs"),
        apiCall("/api/announcements")
      ]);

      setOrganizations(orgsData || []);
      setUsers(usersData || []);
      setAuditLogs(logsData || []);
      setAnnouncements(announcementsData || []);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve platform data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleCopyCredentials = (user: User) => {
    const text = `StudySphere Login Credentials:\nRole: ${user.role}\nEmail: ${user.email}\nPassword: ${user.password || "password"}`;
    navigator.clipboard.writeText(text);
    setCopiedUserId(user.id);
    setTimeout(() => setCopiedUserId(null), 2000);
    
    Swal.fire({
      icon: "success",
      title: "Credentials Copied!",
      text: `Login credentials for ${user.name} copied to clipboard.`,
      timer: 1500,
      showConfirmButton: false,
      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
    });
  };

  const handleAdminResetPassword = async (user: User) => {
    const { value: newPassword } = await Swal.fire({
      title: `Reset Password for ${user.name}`,
      text: `Enter a new password for user ${user.email}:`,
      input: 'text',
      inputValue: user.password || 'password',
      inputLabel: 'New Password',
      inputPlaceholder: 'Enter new password',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Update Password',
      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a',
      inputValidator: (value) => {
        if (!value || value.trim() === '') {
          return 'Password cannot be empty!';
        }
      }
    });

    if (newPassword) {
      try {
        await apiCall(`/api/users/${user.id}/password`, "PUT", { password: newPassword.trim() });
        Swal.fire({
          icon: "success",
          title: "Password Updated",
          text: `Password for ${user.name} was successfully changed to: ${newPassword.trim()}`,
          background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
        });
        fetchData();
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Reset Failed",
          text: err.message || "Failed to update password",
          background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
        });
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email || !userForm.password) {
      Swal.fire({
        icon: "warning",
        title: "Missing Information",
        text: "Please enter Name, Email, and Password.",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      return;
    }

    try {
      setSubmittingUser(true);
      await apiCall("/api/users", "POST", {
        name: userForm.name,
        email: userForm.email,
        phone: userForm.phone || "+91 99999 88888",
        role: userForm.role,
        password: userForm.password,
        orgId: userForm.orgId || null
      });

      setIsUserModalOpen(false);
      setUserForm({
        name: "",
        email: "",
        phone: "",
        role: "ORG_ADMIN",
        password: "password",
        orgId: ""
      });

      Swal.fire({
        icon: "success",
        title: "User Account Created",
        text: `New user account created successfully with password.`,
        timer: 2000,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });

      fetchData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Creation Failed",
        text: err.message || "Failed to create user.",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser.id) {
      Swal.fire({
        icon: "warning",
        title: "Action Not Allowed",
        text: "You cannot delete your own active administrator account.",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      return;
    }

    Swal.fire({
      title: `Delete User ${user.name}?`,
      text: `Are you sure you want to permanently delete the account for ${user.email}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete account",
      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiCall(`/api/users/${user.id}`, "DELETE");
          Swal.fire({
            icon: "success",
            title: "User Account Removed",
            timer: 1500,
            showConfirmButton: false,
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
          fetchData();
        } catch (err: any) {
          Swal.fire({
            icon: "error",
            title: "Deletion Failed",
            text: err.message,
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
        }
      }
    });
  };

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
        adminEmail: orgAdminEmail,
        adminPassword: orgAdminPassword || "password"
      });

      // Reset Form
      setOrgName("");
      setOrgEmail("");
      setOrgPhone("");
      setOrgAddress("");
      setOrgPlan("basic");
      setOrgAdminName("");
      setOrgAdminEmail("");
      setOrgAdminPassword("password");
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

  const handleClearDemoData = async () => {
    Swal.fire({
      title: 'Purge All Demo Data?',
      text: "This will remove all demo organizations, students, seats, attendance records, payments, and mock data from MongoDB Atlas, leaving a clean production state.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, purge demo data',
      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiCall("/api/clear-demo-data", "POST");
          Swal.fire({
            title: 'Clean State Active!',
            text: 'All demo data has been purged from MongoDB Atlas. System is clean and ready.',
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
            text: err.message || "Failed to purge demo data.",
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

  // Filter Users
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
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

        <div className="flex items-center gap-3">
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
            onClick={handleClearDemoData}
            title="Purge all demo data from MongoDB Atlas"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-red-600 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-red-400 text-xs font-semibold transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Purge Demo Data</span>
          </button>

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

        {/* Section View Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200/90 dark:border-slate-800 pb-3">
          <button
            onClick={() => setMainTab("organizations")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs ${
              mainTab === "organizations"
                ? "bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Reading Rooms</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              mainTab === "organizations" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}>
              {organizations.length}
            </span>
          </button>

          <button
            onClick={() => setMainTab("users")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs ${
              mainTab === "users"
                ? "bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            }`}
          >
            <Key className="h-4 w-4" />
            <span>Users &amp; Passwords Management</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              mainTab === "users" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}>
              {users.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Organization Directory Table */}
        {mainTab === "organizations" && (
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
                                title="Permanently delete"
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
        )}

        {/* Tab 2: Users & Passwords Management Table */}
        {mainTab === "users" && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
                    Platform User Accounts &amp; Password Management
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  View, copy, set, and reset passwords for all platform administrators, reading room owners, and staff.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search user or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full sm:w-60 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <button
                  onClick={() => setIsUserModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shrink-0"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Create User</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold dark:bg-slate-950 dark:border-slate-800">
                    <th className="p-4">USER / NAME</th>
                    <th className="p-4">ORGANIZATION</th>
                    <th className="p-4">ROLE</th>
                    <th className="p-4">EMAIL &amp; PHONE</th>
                    <th className="p-4">PASSWORD &amp; CREDENTIALS</th>
                    <th className="p-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <Users className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                        <p>No users found matching search.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => {
                      const org = organizations.find(o => o.id === user.orgId);
                      const isRevealed = showPasswordMap[user.id] || false;
                      const pwd = user.password || "password";

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                                {user.name.substring(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-100">{user.name}</h4>
                                <span className="text-[10px] text-slate-400 block font-mono">ID: {user.id}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            {org ? (
                              <div>
                                <span className="font-semibold text-slate-700 dark:text-slate-200">{org.name}</span>
                                <span className="text-[10px] text-slate-400 block font-mono">ID: {org.id}</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                PLATFORM WIDE
                              </span>
                            )}
                          </td>

                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              user.role === "SUPER_ADMIN"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                                : user.role === "ORG_ADMIN"
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                                : "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                            }`}>
                              {user.role.replace(/_/g, " ")}
                            </span>
                          </td>

                          <td className="p-4">
                            <p className="font-medium text-slate-800 dark:text-slate-200 font-mono text-[11px]">{user.email}</p>
                            <p className="text-slate-400 text-[10px]">{user.phone}</p>
                          </td>

                          {/* PASSWORD FIELD WITH SHOW/HIDE & COPY */}
                          <td className="p-4">
                            <div className="inline-flex items-center gap-2 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                              <span className="font-mono text-xs font-semibold px-1 text-slate-900 dark:text-slate-100 select-all min-w-[70px]">
                                {isRevealed ? pwd : "••••••••"}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(user.id)}
                                title={isRevealed ? "Hide password" : "Show password"}
                                className="p-1 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
                              >
                                {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => handleCopyCredentials(user)}
                                title="Copy email and password"
                                className="p-1 rounded text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
                              >
                                {copiedUserId === user.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleAdminResetPassword(user)}
                                title="Reset user password"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 text-xs font-semibold transition"
                              >
                                <Key className="h-3 w-3" />
                                <span>Reset Password</span>
                              </button>
                              {user.id !== currentUser.id && (
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  title="Delete user"
                                  className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 dark:border-red-950/20 dark:hover:bg-red-950/50 transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
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
        )}

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
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Default Initial Password *</label>
                    <input
                      type="text"
                      required
                      value={orgAdminPassword}
                      onChange={(e) => setOrgAdminPassword(e.target.value)}
                      placeholder="password"
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 text-slate-800 font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">The administrator will use this password to log in. You can view or reset it anytime.</span>
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

      {/* Create User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">
                  Create New Platform / Tenant User
                </h3>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="overflow-y-auto p-6 space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="+91 99999 88888"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Assigned Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="ORG_ADMIN">Reading Room Admin (ORG_ADMIN)</option>
                    <option value="ORG_STAFF">Reading Room Staff (ORG_STAFF)</option>
                    <option value="SUPER_ADMIN">Platform Super Admin (SUPER_ADMIN)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Assigned Organization</label>
                  <select
                    value={userForm.orgId}
                    onChange={(e) => setUserForm({ ...userForm, orgId: e.target.value })}
                    disabled={userForm.role === "SUPER_ADMIN"}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 disabled:opacity-50"
                  >
                    <option value="">-- Select Reading Room --</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Account Password *</label>
                <input
                  type="text"
                  required
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="password"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">You can view, copy or reset this password anytime from this dashboard.</span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                >
                  {submittingUser ? "Creating..." : "Save & Create User"}
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
