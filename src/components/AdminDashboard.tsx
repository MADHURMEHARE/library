/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Grid,
  Calendar,
  CreditCard,
  TrendingUp,
  FileText,
  Settings as SettingsIcon,
  ShieldAlert,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Printer,
  QrCode,
  Landmark,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Info,
  DollarSign,
  Briefcase,
  Layers,
  Activity,
  LogOut,
  RefreshCw,
  Bell,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  X,
  Menu,
  MessageSquare,
  CreditCard as BankIcon,
  Camera,
  Upload,
  Image,
  Link,
  Edit,
  Zap,
  Wrench,
  UserPlus,
  ArrowRightLeft,
  SlidersHorizontal,
  Building2,
  Loader2
} from "lucide-react";
import {
  Student,
  MembershipPlan,
  Membership,
  Building,
  Floor,
  Room,
  Seat,
  Attendance,
  Payment,
  Invoice,
  Notification,
  AuditLog,
  Announcement,
  Expense,
  Organization,
  User,
  WhatsAppConfig,
  WhatsAppLog
} from "../types";
import { apiCall } from "../api";
import Swal from "sweetalert2";
import { ReceiptModal } from "./ReceiptModal";
import { IDCardGenerator } from "./IDCardGenerator";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

interface AdminDashboardProps {
  currentUser: User;
  organization: Organization;
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  organization: initialOrganization,
  onLogout,
  darkMode,
  setDarkMode
}) => {
  const [organization, setOrganization] = useState<Organization>(initialOrganization);
  const [activeTab, setActiveTab] = useState<"dashboard" | "students" | "seats" | "memberships" | "attendance" | "payments" | "reports" | "logs" | "settings" | "whatsapp" | "expiring" | "pending_actions">("dashboard");

  // WhatsApp & Renewal States
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig | null>(null);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>([]);
  const [loadingWhatsApp, setLoadingWhatsApp] = useState(false);
  const [triggeringRenewals, setTriggeringRenewals] = useState(false);
  const [renewalResults, setRenewalResults] = useState<any>(null);
  const [testForm, setTestForm] = useState({ phone: "", type: "welcome" as any, message: "" });
  const [simulatedDateStr, setSimulatedDateStr] = useState(new Date().toISOString().split("T")[0]);

  // Camera & Photo Upload states
  const [photoMode, setPhotoMode] = useState<"upload" | "camera" | "url">("upload");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280, min: 640 },
          height: { ideal: 960, min: 480 }
        }
      });
      setCameraStream(stream);
      setCameraActive(true);
      // Wait for ref to be populated or update srcObject in a small timeout
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err: any) {
      console.error("Camera capture access denied or error:", err);
      setCameraError(
        "Camera permission denied or camera is currently unavailable. " +
        "If you are previewing inside the AI Studio editor pane, please click the 'Open in New Tab' icon in the top-right corner of the preview to grant device permissions, or use 'Upload File' / 'Photo URL' options."
      );
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const handleCapturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      const videoWidth = videoRef.current.videoWidth || 1280;
      const videoHeight = videoRef.current.videoHeight || 960;
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
        const base64Photo = canvas.toDataURL("image/jpeg", 0.95);
        setStudentForm(prev => ({ ...prev, photo: base64Photo }));
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: "warning",
          title: "File Too Large",
          text: "Image file size should be less than 5MB.",
          background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setStudentForm(prev => ({ ...prev, photo: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const closeStudentModal = () => {
    stopCamera();
    setIsStudentModalOpen(false);
    setEditingStudentId(null);
    setStudentForm({
      name: "", gender: "male", dob: "2002-01-01", phone: "", parentPhone: "",
      email: "", address: "", emergencyContact: "", govIdType: "Aadhaar", govIdNumber: "",
      college: "", course: "", year: "3rd Year", batch: "Full Day batch", joinDate: "", notes: "", photo: "",
      status: "active"
    });
  };

  const handleEditStudentClick = (student: Student) => {
    setEditingStudentId(student.id);
    setStudentForm({
      name: student.name || "",
      gender: student.gender || "male",
      dob: student.dob || "2002-01-01",
      phone: student.phone || "",
      parentPhone: student.parentPhone || "",
      email: student.email || "",
      address: student.address || "",
      emergencyContact: student.emergencyContact || "",
      govIdType: student.govIdType || "Aadhaar",
      govIdNumber: student.govIdNumber || "",
      college: student.college || "",
      course: student.course || "",
      year: student.year || "3rd Year",
      batch: student.batch || "Full Day batch",
      joinDate: student.joinDate ? student.joinDate.split("T")[0] : "",
      notes: student.notes || "",
      photo: student.photo || "",
      status: (student.status as any) || "active"
    });
    setIsStudentModalOpen(true);
  };

  const fetchWhatsAppDetails = async () => {
    try {
      setLoadingWhatsApp(true);
      const [configData, logsData] = await Promise.all([
        apiCall(`/api/whatsapp/config?orgId=${organization.id}`),
        apiCall(`/api/whatsapp/logs?orgId=${organization.id}`)
      ]);
      setWhatsappConfig(configData);
      setWhatsappLogs(logsData);
    } catch (err) {
      console.error("Failed to load WhatsApp configuration", err);
    } finally {
      setLoadingWhatsApp(false);
    }
  };

  useEffect(() => {
    if (activeTab === "whatsapp" || activeTab === "expiring") {
      fetchWhatsAppDetails();
    }
  }, [activeTab, organization.id]);

  // Core Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [expiringMemberships, setExpiringMemberships] = useState<any[]>([]);
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatHistory, setSeatHistory] = useState<any[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dbStatus, setDbStatus] = useState<{ connected: string; type: string; details: string }>({
    connected: "local",
    type: "JSON Local File",
    details: "Checking connection..."
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Global UI search/filter
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<"active_all" | "inactive">("active_all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Business Reports states
  const [reportType, setReportType] = useState<"monthly" | "yearly">("monthly");
  const [selectedReportMonth, setSelectedReportMonth] = useState(() => {
    return new Date().toISOString().substring(0, 7); // e.g. "2026-07"
  });
  const [selectedReportYear, setSelectedReportYear] = useState(() => {
    return new Date().toISOString().substring(0, 4); // e.g. "2026"
  });

  // Infinite scroll states for pending administrative actions
  const [visibleActionsCount, setVisibleActionsCount] = useState(5);
  const [loadingMoreActions, setLoadingMoreActions] = useState(false);
  const observerTarget = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeTab === "pending_actions") {
      setVisibleActionsCount(5);
    }
  }, [activeTab]);

  const loadMoreActions = () => {
    if (visibleActionsCount >= pendingActions.length) return;
    setLoadingMoreActions(true);
    setTimeout(() => {
      setVisibleActionsCount(prev => Math.min(prev + 5, pendingActions.length));
      setLoadingMoreActions(false);
    }, 600);
  };

  useEffect(() => {
    const currentTarget = observerTarget.current;
    if (!currentTarget || activeTab !== "pending_actions") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMoreActions && visibleActionsCount < pendingActions.length) {
          loadMoreActions();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentTarget);

    return () => {
      observer.unobserve(currentTarget);
    };
  }, [observerTarget.current, visibleActionsCount, pendingActions.length, loadingMoreActions, activeTab]);

  // Modal / Selection State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isIDCardOpen, setIsIDCardOpen] = useState(false);

  // Modals for CRUD forms
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // Expiring Soon & WhatsApp Quick Alert Modal States
  const [isExpiringTemplateModalOpen, setIsExpiringTemplateModalOpen] = useState(false);
  const [selectedExpiringStudent, setSelectedExpiringStudent] = useState<any>(null);
  const [quickWhatsAppMessage, setQuickWhatsAppMessage] = useState("");
  const [sendingQuickWhatsApp, setSendingQuickWhatsApp] = useState(false);

  // Form states
  const [studentForm, setStudentForm] = useState({
    name: "", gender: "male" as any, dob: "2002-01-01", phone: "", parentPhone: "",
    email: "", address: "", emergencyContact: "", govIdType: "Aadhaar", govIdNumber: "",
    college: "", course: "", year: "3rd Year", batch: "Full Day batch", joinDate: "", notes: "", photo: "",
    status: "active" as "active" | "inactive" | "suspended" | "expired"
  });

  const [planForm, setPlanForm] = useState({
    name: "", durationType: "monthly" as any, durationDays: 30, price: 2000,
    seatType: "AC" as any, timing: "Full Day (6 AM - 11 PM)", description: ""
  });

  const [membershipForm, setMembershipForm] = useState({
    studentId: "", planId: "", startDate: new Date().toISOString().split("T")[0], endDate: "",
    paidAmount: "", paymentMethod: "upi" as any, discount: "", couponCode: "", notes: "", assignSeatId: "",
    status: "active" as any
  });

  const [expenseForm, setExpenseForm] = useState({
    title: "", category: "Utilities", amount: "", date: new Date().toISOString().split("T")[0], description: ""
  });

  // Seat Action & Layout Management state
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [transferTargetSeatId, setTransferTargetSeatId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("all");
  const [seatStatusFilter, setSeatStatusFilter] = useState<"all" | "available" | "occupied" | "reserved" | "maintenance">("all");
  const [seatTypeFilter, setSeatTypeFilter] = useState<"all" | "AC" | "Non-AC" | "Premium" | "Window">("all");
  const [seatSearchQuery, setSeatSearchQuery] = useState("");

  // Layout Creation Modals & Forms
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [roomNameInput, setRoomNameInput] = useState("");

  const [isAddSeatModalOpen, setIsAddSeatModalOpen] = useState(false);
  const [seatForm, setSeatForm] = useState({
    roomId: "",
    seatNumber: "",
    type: "AC" as "AC" | "Non-AC" | "Premium" | "Window",
    row: "Row A",
    notes: ""
  });

  const [isBatchSeatModalOpen, setIsBatchSeatModalOpen] = useState(false);
  const [batchSeatForm, setBatchSeatForm] = useState({
    roomId: "",
    prefix: "D-",
    startNumber: 1,
    count: 24,
    type: "AC" as "AC" | "Non-AC" | "Premium" | "Window",
    row: "Row A",
    notes: "High-speed Wi-Fi, personal charging socket, ergonomic chair & reading lamp."
  });

  const [isAssignSeatModalOpen, setIsAssignSeatModalOpen] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState("");

  const [isEditSeatModalOpen, setIsEditSeatModalOpen] = useState(false);
  const [editSeatForm, setEditSeatForm] = useState({
    id: "",
    seatNumber: "",
    type: "AC" as "AC" | "Non-AC" | "Premium" | "Window",
    row: "Row A",
    notes: "",
    status: "available" as "available" | "occupied" | "reserved" | "maintenance"
  });

  const [isQuickSetupLoading, setIsQuickSetupLoading] = useState(false);

  // Modal Submitting States for Double Click Protection
  const [submittingStudent, setSubmittingStudent] = useState(false);
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [submittingMembership, setSubmittingMembership] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [submittingRoom, setSubmittingRoom] = useState(false);
  const [submittingSingleSeat, setSubmittingSingleSeat] = useState(false);
  const [submittingBatchSeat, setSubmittingBatchSeat] = useState(false);
  const [submittingAssignSeat, setSubmittingAssignSeat] = useState(false);
  const [submittingEditSeat, setSubmittingEditSeat] = useState(false);
  const [submittingTransferSeat, setSubmittingTransferSeat] = useState(false);

  // Attendance scanner simulator
  const [qrCodeInput, setQrCodeInput] = useState("");
  const [attendanceMessage, setAttendanceMessage] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      setError(null);
      const orgId = organization.id;

      // Fetch DB status asynchronously
      apiCall(`/api/db-status`)
        .then(data => setDbStatus(data))
        .catch(err => console.error("Failed to fetch database status:", err));

      const [studentsData, plansData, membershipsData, layoutData, attendanceData, paymentsData, notificationsData, logsData, announcementsData, expensesData, expiringData, pendingActionsData] = await Promise.all([
        apiCall(`/api/students?orgId=${orgId}`),
        apiCall(`/api/plans?orgId=${orgId}`),
        apiCall(`/api/memberships?orgId=${orgId}`),
        apiCall(`/api/layout/structures?orgId=${orgId}`),
        apiCall(`/api/attendance?orgId=${orgId}`),
        apiCall(`/api/payments?orgId=${orgId}`),
        apiCall(`/api/notifications?orgId=${orgId}`),
        apiCall(`/api/audit-logs?orgId=${orgId}`),
        apiCall(`/api/announcements?orgId=${orgId}`),
        apiCall(`/api/expenses?orgId=${orgId}`),
        apiCall(`/api/reports/expiring?orgId=${orgId}`),
        apiCall(`/api/reports/pending-actions?orgId=${orgId}`)
      ]);

      const invoicesData = await apiCall(`/api/payments/invoices?orgId=${orgId}`);

      setStudents(studentsData);
      setPlans(plansData);
      setMemberships(membershipsData);
      setBuildings(layoutData.buildings);
      setFloors(layoutData.floors);
      setRooms(layoutData.rooms);
      setSeats(layoutData.seats);
      setSeatHistory(layoutData.seatHistory || []);
      setAttendances(attendanceData);
      setPayments(paymentsData);
      setInvoices(invoicesData);
      setNotifications(notificationsData);
      setAuditLogs(logsData);
      setAnnouncements(announcementsData);
      setExpenses(expensesData);
      setExpiringMemberships(expiringData);
      setPendingActions(pendingActionsData);

    } catch (err: any) {
      setError(err.message || "Failed to download Reading Room metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
  }, [organization.id]);

  const handleSaveWhatsAppConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappConfig) return;
    try {
      setLoadingWhatsApp(true);
      const res = await apiCall(`/api/whatsapp/config`, "PUT", whatsappConfig);
      setWhatsappConfig(res);
      Swal.fire({
        icon: "success",
        title: "Configuration Saved",
        text: "WhatsApp Configuration and Templates updated successfully!",
        timer: 2000,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: err.message || "Failed to save configuration.",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setLoadingWhatsApp(false);
    }
  };

  const handleSendTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.phone || !testForm.message) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please enter a phone number and message.",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      return;
    }
    try {
      setLoadingWhatsApp(true);
      const res = await apiCall(`/api/whatsapp/test`, "POST", {
        orgId: organization.id,
        phone: testForm.phone,
        type: testForm.type,
        message: testForm.message
      });
      Swal.fire({
        icon: "success",
        title: "Test Dispatched",
        text: `Test message processed! Status: ${res.status}`,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      // Refresh logs
      const logsData = await apiCall(`/api/whatsapp/logs?orgId=${organization.id}`);
      setWhatsappLogs(logsData);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Dispatch Error",
        text: err.message || "Failed to send test message.",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setLoadingWhatsApp(false);
    }
  };

  const handleTriggerRenewals = async () => {
    try {
      setTriggeringRenewals(true);
      setRenewalResults(null);
      const res = await apiCall(`/api/whatsapp/trigger-renewals`, "POST", {
        orgId: organization.id,
        simulateDate: simulatedDateStr,
        simulatedDate: simulatedDateStr
      });
      setRenewalResults(res);
      // Refresh logs, memberships & alerts
      const [logsData, membershipsData, expiringData, pendingActionsData] = await Promise.all([
        apiCall(`/api/whatsapp/logs?orgId=${organization.id}`),
        apiCall(`/api/memberships?orgId=${organization.id}`),
        apiCall(`/api/reports/expiring?orgId=${organization.id}`),
        apiCall(`/api/reports/pending-actions?orgId=${organization.id}`)
      ]);
      setWhatsappLogs(logsData);
      setMemberships(membershipsData);
      setExpiringMemberships(expiringData);
      setPendingActions(pendingActionsData);
      Swal.fire({
        icon: "success",
        title: "Renewals Processed",
        text: `Automated renewal workflow executed successfully! Checked ${res?.candidatesCount || 0} students.`,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Execution Error",
        text: err.message || "Failed to run automated renewal trigger.",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setTriggeringRenewals(false);
    }
  };

  const handleQuickSaveWhatsAppConfig = async (updatedConfig: WhatsAppConfig) => {
    try {
      setLoadingWhatsApp(true);
      const res = await apiCall(`/api/whatsapp/config`, "PUT", updatedConfig);
      setWhatsappConfig(res);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Failed to update configuration.",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setLoadingWhatsApp(false);
    }
  };

  const previewMessageForStudent = (templateText: string, student: any, membership: any, seatNumber: string, daysRemaining: number) => {
    if (!templateText) return "";
    let text = templateText;
    text = text.replace(/\{\{\s*name\s*\}\}/g, student?.name || "");
    text = text.replace(/\{\{\s*org_name\s*\}\}/g, organization.name || "");
    text = text.replace(/\{\{\s*end_date\s*\}\}/g, membership?.endDate || "");
    text = text.replace(/\{\{\s*seat_number\s*\}\}/g, seatNumber || "Unassigned");
    text = text.replace(/\{\{\s*days\s*\}\}/g, String(daysRemaining || 0));
    return text;
  };

  // Form Submissions
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingStudent) return;
    if (!studentForm.name || !studentForm.phone) {
      Swal.fire({
        icon: "warning",
        title: "Required Fields",
        text: "Student full name and mobile phone are mandatory.",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      return;
    }

    setSubmittingStudent(true);
    try {
      if (editingStudentId) {
        await apiCall(`/api/students/${editingStudentId}`, "PUT", {
          ...studentForm,
          editorId: currentUser.id,
          editorName: currentUser.name
        });
        Swal.fire({
          icon: "success",
          title: "Student Updated",
          text: "Student record has been updated successfully.",
          timer: 1800,
          showConfirmButton: false,
          background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
        });
      } else {
        await apiCall("/api/students", "POST", {
          ...studentForm,
          orgId: organization.id,
          creatorId: currentUser.id,
          creatorName: currentUser.name
        });
        Swal.fire({
          icon: "success",
          title: "Student Enrolled",
          text: "New student profile created successfully.",
          timer: 1800,
          showConfirmButton: false,
          background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
        });
      }
      closeStudentModal();
      fetchTenantData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Operation Failed",
        text: err.message,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setSubmittingStudent(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingPlan) return;
    if (!planForm.name || !planForm.price) return;

    setSubmittingPlan(true);
    try {
      if (editingPlanId) {
        await apiCall(`/api/plans/${editingPlanId}`, "PUT", {
          ...planForm,
          orgId: organization.id
        });
        Swal.fire({
          icon: "success",
          title: "Plan Updated",
          text: "Membership plan has been updated successfully.",
          timer: 1800,
          showConfirmButton: false,
          background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
        });
      } else {
        await apiCall("/api/plans", "POST", {
          ...planForm,
          orgId: organization.id
        });
        Swal.fire({
          icon: "success",
          title: "Plan Created",
          text: "New membership plan created successfully.",
          timer: 1800,
          showConfirmButton: false,
          background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
        });
      }
      setIsPlanModalOpen(false);
      setEditingPlanId(null);
      setPlanForm({
        name: "", durationType: "monthly", durationDays: 30, price: 2000,
        seatType: "AC", timing: "Full Day (6 AM - 11 PM)", description: ""
      });
      fetchTenantData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Plan Error",
        text: err.message,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setSubmittingPlan(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "Are you sure you want to delete this membership plan?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!',
      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiCall(`/api/plans/${id}`, "DELETE");
          Swal.fire({
            title: 'Deleted!',
            text: 'The membership plan has been successfully deleted.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
          fetchTenantData();
        } catch (err: any) {
          Swal.fire({
            title: 'Error!',
            text: err.message || "Failed to delete plan.",
            icon: 'error',
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
        }
      }
    });
  };

  const handleStartEditPlan = (plan: MembershipPlan) => {
    setPlanForm({
      name: plan.name,
      durationType: plan.durationType,
      durationDays: plan.durationDays,
      price: plan.price,
      seatType: plan.seatType,
      timing: plan.timing,
      description: plan.description || ""
    });
    setEditingPlanId(plan.id);
    setIsPlanModalOpen(true);
  };

  const handleCreateMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingMembership) return;
    const { studentId, planId, startDate, endDate, paidAmount, paymentMethod, discount, couponCode, notes, assignSeatId, status } = membershipForm;
    if (!studentId || !planId || !startDate || !paidAmount) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete Details",
        text: "Please fill in Student, Membership Plan, Start Date, and Paid Amount.",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      return;
    }

    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    setSubmittingMembership(true);
    try {
      if (editingMembershipId) {
        await apiCall(`/api/memberships/${editingMembershipId}`, "PUT", {
          planId,
          startDate,
          endDate,
          price: plan.price,
          paidAmount,
          status,
          updaterId: currentUser.id,
          updaterName: currentUser.name
        });
        Swal.fire({
          icon: "success",
          title: "Pass Updated",
          text: "Student membership pass updated successfully.",
          timer: 1800,
          showConfirmButton: false,
          background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
        });
      } else {
        await apiCall("/api/memberships", "POST", {
          orgId: organization.id,
          studentId,
          planId,
          startDate,
          price: plan.price,
          paidAmount,
          paymentMethod,
          discount: discount || 0,
          couponCode,
          notes,
          assignSeatId,
          creatorId: currentUser.id,
          creatorName: currentUser.name
        });
        Swal.fire({
          icon: "success",
          title: "Membership Issued",
          text: "Student membership registered and receipt generated.",
          timer: 1800,
          showConfirmButton: false,
          background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
        });
      }

      setIsMembershipModalOpen(false);
      setEditingMembershipId(null);
      setMembershipForm({
        studentId: "", planId: "", startDate: new Date().toISOString().split("T")[0], endDate: "",
        paidAmount: "", paymentMethod: "upi", discount: "", couponCode: "", notes: "", assignSeatId: "",
        status: "active"
      });
      fetchTenantData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Membership Error",
        text: err.message,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setSubmittingMembership(false);
    }
  };

  const handleDeleteMembership = async (id: string) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "Are you sure you want to delete this subscription history entry?",
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
          await apiCall(`/api/memberships/${id}`, "DELETE");
          Swal.fire({
            title: 'Deleted!',
            text: 'The subscription entry has been deleted.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
          fetchTenantData();
        } catch (err: any) {
          Swal.fire({
            title: 'Error!',
            text: err.message || "Failed to delete subscription.",
            icon: 'error',
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
        }
      }
    });
  };

  const handleStartEditMembership = (memb: Membership) => {
    setMembershipForm({
      studentId: memb.studentId,
      planId: memb.planId,
      startDate: memb.startDate,
      endDate: memb.endDate || "",
      paidAmount: memb.paidAmount.toString(),
      paymentMethod: "upi",
      discount: "",
      couponCode: "",
      notes: "",
      assignSeatId: "",
      status: memb.status
    });
    setEditingMembershipId(memb.id);
    setIsMembershipModalOpen(true);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingExpense) return;
    if (!expenseForm.title || !expenseForm.amount) return;

    setSubmittingExpense(true);
    try {
      await apiCall("/api/expenses", "POST", {
        ...expenseForm,
        orgId: organization.id
      });
      setIsExpenseModalOpen(false);
      setExpenseForm({
        title: "", category: "Utilities", amount: "", date: new Date().toISOString().split("T")[0], description: ""
      });
      Swal.fire({
        icon: "success",
        title: "Expense Logged",
        text: "Center expense logged successfully.",
        timer: 1800,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      fetchTenantData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Expense Error",
        text: err.message,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Student Delete (Soft Delete)
  const handleDeleteStudent = async (id: string) => {
    Swal.fire({
      title: 'Deactivate Student?',
      text: "This student will be moved to the Inactive/Archived list, and their assigned seat will be automatically released.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f43f5e',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, deactivate!',
      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiCall(`/api/students/${id}?editorId=${currentUser.id}&editorName=${encodeURIComponent(currentUser.name)}`, "DELETE");
          Swal.fire({
            title: 'Deactivated!',
            text: 'Student has been successfully archived to Inactive Students.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
          fetchTenantData();
        } catch (err: any) {
          Swal.fire({
            title: 'Error!',
            text: err.message || "Failed to deactivate student.",
            icon: 'error',
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
        }
      }
    });
  };

  // Student Permanent Delete
  const handlePermanentlyDeleteStudent = async (id: string) => {
    Swal.fire({
      title: 'Permanently Delete?',
      text: "This will permanently delete this student record from the database! This action cannot be undone.",
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete permanently!',
      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiCall(`/api/students/${id}?permanent=true&editorId=${currentUser.id}&editorName=${encodeURIComponent(currentUser.name)}`, "DELETE");
          Swal.fire({
            title: 'Permanently Deleted!',
            text: 'Student record has been destroyed.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
          fetchTenantData();
        } catch (err: any) {
          Swal.fire({
            title: 'Error!',
            text: err.message || "Failed to delete student.",
            icon: 'error',
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
        }
      }
    });
  };

  // Student Reactivate / Restore
  const handleReactivateStudent = async (id: string) => {
    Swal.fire({
      title: 'Reactivate Student?',
      text: "Reactivate this student profile and restore their status to active?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, reactivate!',
      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiCall(`/api/students/${id}`, "PUT", {
            status: "active",
            editorId: currentUser.id,
            editorName: currentUser.name
          });
          Swal.fire({
            title: 'Reactivated!',
            text: 'Student profile has been reactivated successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
          fetchTenantData();
        } catch (err: any) {
          Swal.fire({
            title: 'Error!',
            text: err.message || "Failed to reactivate student.",
            icon: 'error',
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
        }
      }
    });
  };

  // Seat Operations
  const handleReleaseSeat = async (seatId: string) => {
    Swal.fire({
      title: 'Release Seat?',
      text: "Release this seat? The student assignment will be removed.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, release!',
      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiCall("/api/seats/actions", "POST", {
            action: "release",
            orgId: organization.id,
            seatId,
            creatorId: currentUser.id,
            creatorName: currentUser.name
          });
          setSelectedSeat(null);
          Swal.fire({
            title: 'Released!',
            text: 'The seat has been released successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
          fetchTenantData();
        } catch (err: any) {
          Swal.fire({
            title: 'Error!',
            text: err.message || "Failed to release seat.",
            icon: 'error',
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
        }
      }
    });
  };

  const handleBlockSeat = async (seatId: string) => {
    try {
      await apiCall("/api/seats/actions", "POST", {
        action: "block",
        orgId: organization.id,
        seatId,
        creatorId: currentUser.id,
        creatorName: currentUser.name
      });
      setSelectedSeat(null);
      Swal.fire({
        icon: "success",
        title: "Seat Blocked",
        text: "Seat marked for maintenance.",
        timer: 1500,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      fetchTenantData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Action Failed",
        text: err.message,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    }
  };

  const handleTransferSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat || !transferTargetSeatId) return;

    try {
      await apiCall("/api/seats/actions", "POST", {
        action: "transfer",
        orgId: organization.id,
        seatId: selectedSeat.id,
        studentId: selectedSeat.assignedStudentId,
        targetSeatId: transferTargetSeatId,
        creatorId: currentUser.id,
        creatorName: currentUser.name
      });
      setSelectedSeat(null);
      setTransferTargetSeatId("");
      Swal.fire({
        icon: "success",
        title: "Seat Transferred",
        text: "Student successfully transferred to new seat.",
        timer: 1800,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      fetchTenantData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Transfer Failed",
        text: err.message,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    }
  };

  const handleUnblockSeat = async (seatId: string) => {
    try {
      await apiCall(`/api/seats/${seatId}`, "PUT", {
        status: "available",
        assignedStudentId: null
      });
      setSelectedSeat(null);
      Swal.fire({
        icon: "success",
        title: "Desk Restored",
        text: "Desk marked available for student assignment.",
        timer: 1500,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      fetchTenantData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Action Failed",
        text: err.message,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRoom) return;
    if (!roomNameInput.trim()) return;

    setSubmittingRoom(true);
    try {
      await apiCall("/api/layout/rooms", "POST", {
        orgId: organization.id,
        name: roomNameInput.trim()
      });
      setRoomNameInput("");
      setIsAddRoomModalOpen(false);
      Swal.fire({
        icon: "success",
        title: "Study Zone Created",
        text: "New study room added successfully.",
        timer: 1500,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      fetchTenantData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Failed to create room",
        text: err.message || "An error occurred",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setSubmittingRoom(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    Swal.fire({
      title: `Delete '${roomName}'?`,
      text: "This will permanently remove this room and all associated study desks.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete room",
      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiCall(`/api/layout/rooms/${roomId}`, "DELETE");
          if (selectedRoomId === roomId) {
            setSelectedRoomId("all");
          }
          if (selectedSeat && selectedSeat.roomId === roomId) {
            setSelectedSeat(null);
          }
          Swal.fire({
            icon: "success",
            title: "Room Deleted",
            timer: 1500,
            showConfirmButton: false,
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
          fetchTenantData();
        } catch (err: any) {
          Swal.fire({
            icon: "error",
            title: "Failed to delete room",
            text: err.message,
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
        }
      }
    });
  };

  const handleCreateSingleSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingSingleSeat) return;
    if (!seatForm.seatNumber.trim()) return;

    setSubmittingSingleSeat(true);
    try {
      await apiCall("/api/seats", "POST", {
        orgId: organization.id,
        roomId: seatForm.roomId || rooms[0]?.id,
        seatNumber: seatForm.seatNumber.trim().toUpperCase(),
        type: seatForm.type,
        row: seatForm.row || "Row A",
        notes: seatForm.notes
      });
      setSeatForm({ roomId: "", seatNumber: "", type: "AC", row: "Row A", notes: "" });
      setIsAddSeatModalOpen(false);
      Swal.fire({
        icon: "success",
        title: "Desk Created",
        text: "New study desk created successfully.",
        timer: 1500,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      fetchTenantData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Creation Failed",
        text: err.message,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setSubmittingSingleSeat(false);
    }
  };

  const handleBatchCreateSeats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingBatchSeat) return;

    setSubmittingBatchSeat(true);
    try {
      const res = await apiCall("/api/seats/batch", "POST", {
        orgId: organization.id,
        roomId: batchSeatForm.roomId || rooms[0]?.id,
        prefix: batchSeatForm.prefix,
        startNumber: Number(batchSeatForm.startNumber) || 1,
        count: Number(batchSeatForm.count) || 10,
        type: batchSeatForm.type,
        row: batchSeatForm.row,
        notes: batchSeatForm.notes
      });
      setIsBatchSeatModalOpen(false);
      Swal.fire({
        icon: "success",
        title: `${res.count || batchSeatForm.count} Desks Generated!`,
        text: "Batch study desks created and mapped.",
        timer: 1800,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      fetchTenantData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Batch Generation Failed",
        text: err.message,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setSubmittingBatchSeat(false);
    }
  };

  const handleDeleteSeat = async (seatId: string, seatNumber: string) => {
    Swal.fire({
      title: `Delete Desk ${seatNumber}?`,
      text: "Are you sure you want to permanently remove this desk?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete desk",
      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiCall(`/api/seats/${seatId}`, "DELETE");
          if (selectedSeat?.id === seatId) {
            setSelectedSeat(null);
          }
          Swal.fire({
            icon: "success",
            title: "Desk Deleted",
            timer: 1500,
            showConfirmButton: false,
            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
          });
          fetchTenantData();
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

  const handleEditSeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingEditSeat) return;
    if (!editSeatForm.id) return;

    setSubmittingEditSeat(true);
    try {
      const updated = await apiCall(`/api/seats/${editSeatForm.id}`, "PUT", {
        seatNumber: editSeatForm.seatNumber,
        type: editSeatForm.type,
        row: editSeatForm.row,
        notes: editSeatForm.notes,
        status: editSeatForm.status
      });
      setIsEditSeatModalOpen(false);
      setSelectedSeat(updated);
      Swal.fire({
        icon: "success",
        title: "Desk Updated",
        timer: 1500,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      fetchTenantData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err.message,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setSubmittingEditSeat(false);
    }
  };

  const handleAssignStudentToSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingAssignSeat) return;
    if (!selectedSeat || !assignStudentId) return;

    setSubmittingAssignSeat(true);
    try {
      await apiCall("/api/seats/actions", "POST", {
        action: "assign",
        orgId: organization.id,
        seatId: selectedSeat.id,
        studentId: assignStudentId,
        creatorId: currentUser.id,
        creatorName: currentUser.name
      });
      setIsAssignSeatModalOpen(false);
      setAssignStudentId("");
      setSelectedSeat(null);
      Swal.fire({
        icon: "success",
        title: "Desk Assigned!",
        text: "Student successfully assigned to this desk.",
        timer: 1500,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      fetchTenantData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Assignment Failed",
        text: err.message,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setSubmittingAssignSeat(false);
    }
  };

  const handleQuickSetupLayout = async () => {
    setIsQuickSetupLoading(true);
    try {
      const res = await apiCall("/api/layout/quick-setup", "POST", {
        orgId: organization.id,
        roomName: "Main Study Hall",
        seatCount: 24,
        seatType: "AC"
      });
      Swal.fire({
        icon: "success",
        title: "Study Layout Initialized!",
        text: `Created Main Study Hall with ${res.seatsCount || 24} silent desks.`,
        timer: 2000,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      await fetchTenantData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Quick Setup Failed",
        text: err.message,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    } finally {
      setIsQuickSetupLoading(false);
    }
  };

  // QR check-in check-out simulation
  const handleQrAttendanceScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCodeInput) return;

    setAttendanceMessage(null);
    setAttendanceError(null);

    try {
      const res = await apiCall("/api/attendance/check", "POST", {
        orgId: organization.id,
        qrCode: qrCodeInput,
        method: "qr",
        creatorId: currentUser.id,
        creatorName: currentUser.name
      });
      setAttendanceMessage(res.message);
      setQrCodeInput("");
      Swal.fire({
        icon: "success",
        title: "Attendance Scanned",
        text: res.message,
        timer: 2000,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      fetchTenantData();
    } catch (err: any) {
      const errMsg = err.message || "Invalid QR Code or student inactive.";
      setAttendanceError(errMsg);
      Swal.fire({
        icon: "error",
        title: "Scan Failed",
        text: errMsg,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    }
  };

  // Manual check-in checkout toggler
  const handleManualCheckInOut = async (studentId: string) => {
    setAttendanceMessage(null);
    setAttendanceError(null);

    try {
      const res = await apiCall("/api/attendance/check", "POST", {
        orgId: organization.id,
        studentId,
        method: "manual",
        creatorId: currentUser.id,
        creatorName: currentUser.name
      });
      Swal.fire({
        icon: "success",
        title: "Attendance Updated",
        text: res.message,
        timer: 1800,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      fetchTenantData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Attendance Error",
        text: err.message || "Failed to toggle attendance status.",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
    }
  };

  // One click membership renewal helper
  const handleOneClickRenewal = (student: Student) => {
    const studentMemb = memberships.find(m => m.studentId === student.id);
    if (!studentMemb) {
      Swal.fire({
        icon: "info",
        title: "No Previous Pass",
        text: "No previous membership found. Please create a new membership pass.",
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      });
      return;
    }
    setMembershipForm({
      studentId: student.id,
      planId: studentMemb.planId,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      paidAmount: studentMemb.price.toString(),
      paymentMethod: "upi",
      discount: "",
      couponCode: "",
      notes: "One-click express renewal",
      assignSeatId: seats.find(s => s.assignedStudentId === student.id)?.id || "",
      status: "active"
    });
    setIsMembershipModalOpen(true);
  };

  const handlePendingActionClick = async (action: any) => {
    if (action.type === "inactive_student") {
      setMembershipForm({
        studentId: action.student.id,
        planId: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        paidAmount: "",
        paymentMethod: "upi",
        discount: "",
        couponCode: "",
        notes: "Dues setup from action list",
        assignSeatId: "",
        status: "active"
      });
      setIsMembershipModalOpen(true);
    } else if (action.type === "expired_student") {
      if (action.student) {
        handleOneClickRenewal(action.student);
      }
    } else if (action.type === "pending_balance") {
      Swal.fire({
        title: 'Settle Balance Dues?',
        text: `Do you want to record receipt of the remaining balance of ${action.payment.balance} INR?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, settle dues!',
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await apiCall(`/api/payments/${action.payment.id}/settle`, "PUT");
            Swal.fire({
              icon: "success",
              title: "Settled!",
              text: "Outstanding dues recorded and settled successfully!",
              timer: 1800,
              showConfirmButton: false,
              background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
              color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
            });
            fetchTenantData();
          } catch (err: any) {
            Swal.fire({
              icon: "error",
              title: "Settlement Failed",
              text: err.message || "Failed to settle dues.",
              background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
              color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
            });
          }
        }
      });
    } else if (action.type === "seat_maintenance") {
      Swal.fire({
        title: 'Restore Seat?',
        text: `Do you want to release Seat ${action.seat.seatNumber} and mark it as Available?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, restore seat!',
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await apiCall(`/api/seats/${action.seat.id}`, "PUT", { status: "available" });
            Swal.fire({
              icon: "success",
              title: "Seat Restored",
              text: `Seat ${action.seat.seatNumber} is now restored to available status!`,
              timer: 1800,
              showConfirmButton: false,
              background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
              color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
            });
            fetchTenantData();
          } catch (err: any) {
            Swal.fire({
              icon: "error",
              title: "Restore Failed",
              text: err.message || "Failed to restore seat status.",
              background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
              color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
            });
          }
        }
      });
    }
  };

  // Open Receipt Modal
  const openReceipt = (payment: Payment) => {
    const stud = students.find(s => s.id === payment.studentId) || null;
    const inv = invoices.find(i => i.paymentId === payment.id) || null;
    setSelectedPayment(payment);
    setSelectedStudent(stud);
    setSelectedInvoice(inv);
    setIsReceiptOpen(true);
  };

  // Open ID Card Modal
  const openIDCard = (student: Student) => {
    setSelectedStudent(student);
    setIsIDCardOpen(true);
  };

  // Simulated CSV/Excel/PDF Exports
  const handleExport = (reportType: string) => {
    Swal.fire({
      icon: "info",
      title: "Generating Report",
      text: `Preparing high-resolution printable report for: ${reportType}. Triggering browser print layout.`,
      timer: 2000,
      showConfirmButton: false,
      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
    });
    window.print();
  };

  // Dashboard calculations
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === "active").length;
  const expiredStudents = students.filter(s => s.status === "expired").length;
  const inactiveStudents = students.filter(s => s.status === "inactive").length;

  const totalSeats = seats.length;
  const occupiedSeatsCount = seats.filter(s => s.status === "occupied").length;
  const availableSeatsCount = seats.filter(s => s.status === "available").length;
  const maintenanceSeatsCount = seats.filter(s => s.status === "maintenance").length;
  const reservedSeatsCount = seats.filter(s => s.status === "reserved").length;

  // Revenue computations
  const todayStr = new Date().toISOString().split("T")[0];
  const todayCollection = payments
    .filter(p => p.date === todayStr)
    .reduce((sum, p) => sum + p.netPaid, 0);

  const monthlyCollection = payments
    .reduce((sum, p) => sum + p.netPaid, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profitAndLoss = monthlyCollection - totalExpenses;

  const todayAttendanceCount = attendances.filter(a => a.date === todayStr).length;

  const currencySymbol = organization.currency === "USD" ? "$" : "₹";

  // Dynamic Month/Year Selectors
  const availableMonths = Array.from(
    new Set([
      ...payments.map(p => p.date ? p.date.substring(0, 7) : ""),
      ...expenses.map(e => e.date ? e.date.substring(0, 7) : ""),
      new Date().toISOString().substring(0, 7)
    ])
  ).filter(Boolean).sort().reverse();

  const availableYears = Array.from(
    new Set([
      ...payments.map(p => p.date ? p.date.substring(0, 4) : ""),
      ...expenses.map(e => e.date ? e.date.substring(0, 4) : ""),
      new Date().toISOString().substring(0, 4)
    ])
  ).filter(Boolean).sort().reverse();

  // Filtered Payments and Expenses for Report Tab
  const filteredPaymentsForReport = payments.filter(p => {
    if (!p.date) return false;
    if (reportType === "monthly") {
      return p.date.startsWith(selectedReportMonth);
    } else {
      return p.date.startsWith(selectedReportYear);
    }
  });

  const filteredExpensesForReport = expenses.filter(e => {
    if (!e.date) return false;
    if (reportType === "monthly") {
      return e.date.startsWith(selectedReportMonth);
    } else {
      return e.date.startsWith(selectedReportYear);
    }
  });

  const reportCollection = filteredPaymentsForReport.reduce((sum, p) => sum + p.netPaid, 0);
  const reportExpenses = filteredExpensesForReport.reduce((sum, e) => sum + e.amount, 0);
  const reportNetProfit = reportCollection - reportExpenses;

  // Breakdown aggregations
  const reportRevenueByMethod = filteredPaymentsForReport.reduce((acc, p) => {
    const method = p.method || "upi";
    acc[method] = (acc[method] || 0) + p.netPaid;
    return acc;
  }, {} as Record<string, number>);

  const reportExpensesByCategory = filteredExpensesForReport.reduce((acc, e) => {
    const cat = e.category || "Others";
    acc[cat] = (acc[cat] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"}`}>
      
      {/* Top Header Section (No Print) */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 dark:bg-slate-900/95 dark:border-slate-800/90 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-xs no-print h-16">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="shrink-0 md:hidden rounded-lg p-2 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 transition"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-4 w-4 text-indigo-600" /> : <Menu className="h-4 w-4" />}
          </button>

          {organization.logo ? (
            <img
              src={organization.logo}
              alt={organization.name}
              referrerPolicy="no-referrer"
              className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-800"
            />
          ) : (
            <div className="h-9 w-9 shrink-0 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-display font-bold text-lg shadow-sm">
              {organization.name.substring(0, 1)}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {organization.name}
            </h1>
            <span className="hidden sm:block text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase">
              Reading Room Workspace
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Database Status Indicator */}
          <div
            title={dbStatus.details}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold uppercase tracking-wider ${
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

          {/* Mobile-only status dot, no label */}
          <div
            title={dbStatus.details}
            className={`sm:hidden h-2.5 w-2.5 rounded-full shrink-0 ${
              dbStatus.connected === "cloud"
                ? "bg-emerald-500 animate-pulse"
                : dbStatus.connected === "error"
                ? "bg-rose-500 animate-ping"
                : "bg-slate-400"
            }`}
          />

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-lg p-2 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 transition"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="hidden md:flex flex-col items-end text-xs max-w-[9rem]">
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate w-full text-right">{currentUser.name}</span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold uppercase">
              {currentUser.role.replace(/_/g, " ")}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-rose-950/30 dark:hover:border-rose-900/60 dark:hover:text-rose-400 dark:focus-visible:ring-offset-slate-900 transition"
            aria-label="Log out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1440px] mx-auto w-full relative">
        
        {/* Backdrop for mobile menu */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 top-16 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden transition-opacity duration-300"
            aria-hidden="true"
          />
        )}

        {/* Workspace Sidebar Rails (No Print) */}
        <nav
          className={`fixed md:sticky top-16 bottom-0 left-0 z-50 md:z-30 w-72 sm:w-80 max-w-[85vw] md:w-72 shrink-0 h-[calc(100dvh-4rem)] md:h-[calc(100vh-4rem)] border-r border-slate-200/90 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md dark:border-slate-800/90 no-print flex flex-col justify-between transform md:transform-none transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none overflow-hidden overscroll-contain ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
          aria-label="Sidebar navigation"
        >
          
          {/* Scrollable Navigation Items */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-5 overscroll-contain">
            
            {/* Mobile Header Inside Drawer */}
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800 md:hidden space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  {organization.logo ? (
                    <img
                      src={organization.logo}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {organization.name.substring(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate block">
                      {organization.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Workspace Menu</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Logged in User Pill on Mobile Drawer */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{currentUser.name}</p>
                    <p className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 uppercase font-semibold">
                      {currentUser.role.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-xs font-semibold"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* SECTION 1: CORE WORKSPACE */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 block mb-1.5 font-mono">
                Workspace
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => { setActiveTab("dashboard"); setMobileMenuOpen(false); }}
                  className={`w-full min-h-[44px] flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    activeTab === "dashboard"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className={`h-4 w-4 shrink-0 ${activeTab === "dashboard" ? "text-white" : "text-slate-400 dark:text-slate-400"}`} />
                    <span>Overview &amp; Desk</span>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab("students"); setMobileMenuOpen(false); }}
                  className={`w-full min-h-[44px] flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    activeTab === "students"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className={`h-4 w-4 shrink-0 ${activeTab === "students" ? "text-white" : "text-slate-400 dark:text-slate-400"}`} />
                    <span>Students Directory</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    activeTab === "students"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    {students.filter(s => s.status !== "inactive").length}
                  </span>
                </button>

                <button
                  onClick={() => { setActiveTab("seats"); setMobileMenuOpen(false); }}
                  className={`w-full min-h-[44px] flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    activeTab === "seats"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Grid className={`h-4 w-4 shrink-0 ${activeTab === "seats" ? "text-white" : "text-slate-400 dark:text-slate-400"}`} />
                    <span>Visual Seat Layout</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    activeTab === "seats"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    {seats.filter(s => s.status === 'occupied').length}/{seats.length}
                  </span>
                </button>

                <button
                  onClick={() => { setActiveTab("memberships"); setMobileMenuOpen(false); }}
                  className={`w-full min-h-[44px] flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    activeTab === "memberships"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className={`h-4 w-4 shrink-0 ${activeTab === "memberships" ? "text-white" : "text-slate-400 dark:text-slate-400"}`} />
                    <span>Plans &amp; Passes</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    activeTab === "memberships"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    {plans.length}
                  </span>
                </button>
              </div>
            </div>

            {/* SECTION 2: OPERATIONS & DESK */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 block mb-1.5 font-mono">
                Operations
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => { setActiveTab("attendance"); setMobileMenuOpen(false); }}
                  className={`w-full min-h-[44px] flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    activeTab === "attendance"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className={`h-4 w-4 shrink-0 ${activeTab === "attendance" ? "text-white" : "text-slate-400 dark:text-slate-400"}`} />
                    <span>Attendance Logs</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    activeTab === "attendance"
                      ? "bg-white/20 text-white"
                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  }`}>
                    {attendances.filter(a => a.date === todayStr && !a.checkOutTime).length} in
                  </span>
                </button>

                <button
                  onClick={() => { setActiveTab("payments"); setMobileMenuOpen(false); }}
                  className={`w-full min-h-[44px] flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    activeTab === "payments"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className={`h-4 w-4 shrink-0 ${activeTab === "payments" ? "text-white" : "text-slate-400 dark:text-slate-400"}`} />
                    <span>Cashier &amp; Expense</span>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab("reports"); setMobileMenuOpen(false); }}
                  className={`w-full min-h-[44px] flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    activeTab === "reports"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className={`h-4 w-4 shrink-0 ${activeTab === "reports" ? "text-white" : "text-slate-400 dark:text-slate-400"}`} />
                    <span>Business Reports</span>
                  </div>
                </button>
              </div>
            </div>

            {/* SECTION 3: AUTOMATION & ALERTS */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 block mb-1.5 font-mono">
                Alerts &amp; Actions
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => { setActiveTab("expiring"); setMobileMenuOpen(false); }}
                  className={`w-full min-h-[44px] flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    activeTab === "expiring"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className={`h-4 w-4 shrink-0 ${activeTab === "expiring" ? "text-white" : "text-amber-500"}`} />
                    <span>Expiring Soon</span>
                  </div>
                  {expiringMemberships.length > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      activeTab === "expiring"
                        ? "bg-white text-indigo-700"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-800"
                    }`}>
                      {expiringMemberships.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab("pending_actions"); setMobileMenuOpen(false); }}
                  className={`w-full min-h-[44px] flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    activeTab === "pending_actions"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className={`h-4 w-4 shrink-0 ${activeTab === "pending_actions" ? "text-white" : "text-rose-500"}`} />
                    <span>Pending Actions</span>
                  </div>
                  {pendingActions.length > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      activeTab === "pending_actions"
                        ? "bg-white text-indigo-700"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 ring-1 ring-rose-300 dark:ring-rose-800 animate-pulse"
                    }`}>
                      {pendingActions.length}
                    </span>
                  )}
                </button>

                {currentUser.role !== "RECEPTIONIST" && (
                  <button
                    onClick={() => { setActiveTab("whatsapp"); setMobileMenuOpen(false); }}
                    className={`w-full min-h-[44px] flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                      activeTab === "whatsapp"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className={`h-4 w-4 shrink-0 ${activeTab === "whatsapp" ? "text-white" : "text-emerald-500"}`} />
                      <span>WhatsApp Triggers</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* SECTION 4: PLATFORM & LOGS */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 block mb-1.5 font-mono">
                System
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => { setActiveTab("logs"); setMobileMenuOpen(false); }}
                  className={`w-full min-h-[44px] flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    activeTab === "logs"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Activity className={`h-4 w-4 shrink-0 ${activeTab === "logs" ? "text-white" : "text-slate-400 dark:text-slate-400"}`} />
                    <span>Audit Trail Log</span>
                  </div>
                </button>

                {currentUser.role !== "RECEPTIONIST" && (
                  <button
                    onClick={() => { setActiveTab("settings"); setMobileMenuOpen(false); }}
                    className={`w-full min-h-[44px] flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                      activeTab === "settings"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <SettingsIcon className={`h-4 w-4 shrink-0 ${activeTab === "settings" ? "text-white" : "text-slate-400 dark:text-slate-400"}`} />
                      <span>Workspace Settings</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Organization & Notice Status Footer */}
          <div className="p-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-2.5">
            <div className="flex items-center gap-2.5">
              {organization.logo ? (
                <img
                  src={organization.logo}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {organization.name.substring(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{organization.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {organization.city || organization.address || "Branch Active"} • {organization.currency || "INR"}
                  </span>
                </div>
              </div>
            </div>

            {announcements.length > 0 && (
              <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Notice</span>
                  <span className="text-slate-400">{announcements[0].createdAt.split("T")[0]}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5 font-medium">{announcements[0].title}</p>
              </div>
            )}
          </div>

        </nav>

        {/* Content Box */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">

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

          {/* 1. DASHBOARD VIEW */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Workspace Overview</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time indicators and critical occupancy metrics.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsStudentModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    <Plus className="h-4 w-4" /> Add Student
                  </button>
                  <button
                    onClick={() => setIsMembershipModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    <Briefcase className="h-4 w-4 text-indigo-600" /> New Membership
                  </button>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl bg-white border border-slate-200/80 p-4 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Enrollment</span>
                  <span className="text-2xl font-display font-bold text-slate-950 dark:text-white block mt-2">{totalStudents}</span>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Active: <strong className="text-emerald-500">{activeStudents}</strong></span>
                    <span>Expired: <strong className="text-amber-500">{expiredStudents}</strong></span>
                  </div>
                </div>

                <div className="rounded-xl bg-white border border-slate-200/80 p-4 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Seat Occupancy</span>
                  <span className="text-2xl font-display font-bold text-slate-950 dark:text-white block mt-2">
                    {occupiedSeatsCount} / {totalSeats}
                  </span>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Free: <strong className="text-emerald-500">{availableSeatsCount}</strong></span>
                    <span>Maint: <strong className="text-red-500">{maintenanceSeatsCount}</strong></span>
                  </div>
                </div>

                <div className="rounded-xl bg-white border border-slate-200/80 p-4 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Collection</span>
                  <span className="text-2xl font-display font-bold text-slate-950 dark:text-white block mt-2">
                    {currencySymbol}{todayCollection.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Net cashier intake today</span>
                </div>

                <div className="rounded-xl bg-white border border-slate-200/80 p-4 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Profit &amp; Loss</span>
                  <span className={`text-2xl font-display font-bold block mt-2 ${profitAndLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {currencySymbol}{profitAndLoss.toLocaleString()}
                  </span>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Revenue: {currencySymbol}{monthlyCollection}</span>
                    <span>Expenses: {currencySymbol}{totalExpenses}</span>
                  </div>
                </div>
              </div>

              {/* Sub-grid for charts & activity logs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual Analytics */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 lg:col-span-2 flex flex-col h-[320px]">
                  <h3 className="font-display font-bold text-xs text-slate-400 uppercase tracking-wider mb-4">Cash Flow &amp; Expense Breakdown</h3>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: "Membership Inflow", amount: monthlyCollection, fill: "#4f46e5" },
                        { name: "Total Expenses", amount: totalExpenses, fill: "#ef4444" },
                        { name: "Net Surplus", amount: profitAndLoss, fill: "#10b981" }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                          <Cell fill="#4f46e5" />
                          <Cell fill="#ef4444" />
                          <Cell fill="#10b981" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* QR Code Quick Check-In Scanner simulator */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <h3 className="font-display font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">QR Scanner Check-In Desk</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-4">Simulate card scanning by entering a Student ID (e.g., STUD-1001, STUD-1002).</p>
                    
                    <form onSubmit={handleQrAttendanceScan} className="space-y-3">
                      <div className="relative">
                        <QrCode className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="STUD-1001"
                          value={qrCodeInput}
                          onChange={(e) => setQrCodeInput(e.target.value)}
                          className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:bg-white focus:outline-hidden"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                      >
                        Simulate Laser Scan
                      </button>
                    </form>

                    {attendanceMessage && (
                      <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-emerald-700 text-xs flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{attendanceMessage}</span>
                      </div>
                    )}
                    {attendanceError && (
                      <div className="mt-4 rounded-lg bg-red-50 border border-red-100 p-3 text-red-700 text-xs flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{attendanceError}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 mt-4">
                    <span>Today's Attendance:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{todayAttendanceCount} present</strong>
                  </div>
                </div>

              </div>

              {/* Alerts & Actions Quick Glance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500 shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">Expiring Soon</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{expiringMemberships.length} subscriptions end in 10 days</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("expiring")}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    Manage
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-500 shrink-0">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">Pending Actions</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{pendingActions.length} administrative action items</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("pending_actions")}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    Review
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EXPIRING SOON VIEW */}
          {activeTab === "expiring" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Memberships Expiring Soon</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configure automated triggers and dispatch custom WhatsApp renewal warnings to students.</p>
                </div>
                <button
                  onClick={() => setIsMembershipModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" /> New Membership
                </button>
              </div>

              {/* Dynamic Automated Triggers and Control Station */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* Panel 1: WhatsApp Automation Toggle */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Automated Alerts</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        whatsappConfig?.enabled
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {whatsappConfig?.enabled ? "● Active Daily Triggers" : "○ Paused"}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-2">Daily Automated WhatsApp</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                      System automatically scans active plans daily at 8:00 AM and sends WhatsApp messages.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Auto-trigger alert before:</span>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={whatsappConfig?.triggerDaysBefore || 10}
                          onChange={(e) => {
                            if (whatsappConfig) {
                              handleQuickSaveWhatsAppConfig({
                                ...whatsappConfig,
                                triggerDaysBefore: Number(e.target.value)
                              });
                            }
                          }}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden"
                        >
                          <option value={3}>3 Days</option>
                          <option value={5}>5 Days</option>
                          <option value={7}>7 Days</option>
                          <option value={10}>10 Days</option>
                          <option value={15}>15 Days</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (whatsappConfig) {
                          handleQuickSaveWhatsAppConfig({
                            ...whatsappConfig,
                            enabled: !whatsappConfig.enabled
                          });
                        }
                      }}
                      className={`w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${
                        whatsappConfig?.enabled
                          ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:hover:bg-amber-950/30"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      {whatsappConfig?.enabled ? "Pause Daily Automated Job" : "Enable Daily Automated Job"}
                    </button>
                  </div>
                </div>

                {/* Panel 2: Manual System Trigger Simulator */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manual Dispatch</span>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-2">Run Renewal Check Now</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                      Instantly process membership expirations, dispatch pending alerts, and trigger configured auto-renewals.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {renewalResults && (
                      <div className="rounded-lg bg-indigo-50/50 border border-indigo-100 p-2.5 text-[11px] text-indigo-700 dark:bg-indigo-950/10 dark:border-indigo-900/40 dark:text-indigo-400">
                        <p className="font-bold">Last Run Success Metrics:</p>
                        <div className="grid grid-cols-3 gap-1 mt-1 text-center font-mono">
                          <div className="bg-white/80 dark:bg-slate-900 p-1 rounded">
                            <span className="block text-xs font-bold text-indigo-600 dark:text-indigo-400">{renewalResults.warningsSent}</span>
                            <span className="text-[8px] text-slate-400">Alerts</span>
                          </div>
                          <div className="bg-white/80 dark:bg-slate-900 p-1 rounded">
                            <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">{renewalResults.autoRenewalsTriggered}</span>
                            <span className="text-[8px] text-slate-400">Renewed</span>
                          </div>
                          <div className="bg-white/80 dark:bg-slate-900 p-1 rounded">
                            <span className="block text-xs font-bold text-red-600 dark:text-red-400">{renewalResults.expirationsProcessed}</span>
                            <span className="text-[8px] text-slate-400">Expired</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleTriggerRenewals}
                      disabled={triggeringRenewals}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${triggeringRenewals ? "animate-spin" : ""}`} />
                      {triggeringRenewals ? "Executing Scan..." : "Trigger System Check Now"}
                    </button>
                  </div>
                </div>

                {/* Panel 3: Dynamic Template Blueprint */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SMS / Message Blueprint</span>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-2">WhatsApp Alert Template</h3>
                    <div className="mt-1.5 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px] text-slate-500 font-mono line-clamp-3 leading-relaxed">
                      {whatsappConfig?.templates?.upcomingRenewal || "No template configured."}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsExpiringTemplateModalOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    <SettingsIcon className="h-3.5 w-3.5" /> Edit Renewal Template
                  </button>
                </div>

              </div>

              {/* Expiring Table & Responsive Cards */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{expiringMemberships.length} Expiring Memberships</span>
                  </div>
                </div>

                {expiringMemberships.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <CheckCircle className="h-12 w-12 text-emerald-500 mb-3 animate-bounce" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All subscriptions are fully active</p>
                    <p className="text-xs text-slate-400 mt-1">No student memberships are expiring within the configured alerts window.</p>
                  </div>
                ) : (
                  <>
                    {/* Tablet/Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold dark:bg-slate-950/40 dark:border-slate-800">
                            <th className="p-4 pl-6">STUDENT</th>
                            <th className="p-4">CONTACT NO</th>
                            <th className="p-4">EXPIRY DATE</th>
                            <th className="p-4">REMAINING DAYS</th>
                            <th className="p-4 text-right pr-6">QUICK ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {expiringMemberships.map(exp => {
                            const seat = seats.find(s => s.assignedStudentId === exp.student?.id);
                            return (
                              <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                <td className="p-4 pl-6">
                                  <div className="flex items-center gap-3">
                                    <img src={exp.student?.photo} alt="" className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-slate-100 dark:ring-slate-800" referrerPolicy="no-referrer" />
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{exp.student?.name}</p>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[9px] text-slate-400 font-mono font-semibold uppercase">{exp.student?.studentId}</span>
                                        {seat && (
                                          <span className="text-[9px] bg-indigo-50 text-indigo-600 font-semibold px-1 rounded dark:bg-indigo-950/40 dark:text-indigo-400">
                                            Seat {seat.seatNumber}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{exp.student?.phone}</td>
                                <td className="p-4 font-medium text-slate-600 dark:text-slate-400">{exp.membership?.endDate}</td>
                                <td className="p-4">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    exp.daysRemaining <= 2
                                      ? "bg-red-50 text-red-600 dark:bg-red-950/20"
                                      : exp.daysRemaining <= 5
                                      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20"
                                      : "bg-blue-50 text-blue-600 dark:bg-blue-950/20"
                                  }`}>
                                    {exp.daysRemaining === 0 ? "Expires Today" : `${exp.daysRemaining} days left`}
                                  </span>
                                </td>
                                <td className="p-4 text-right pr-6 space-x-2 whitespace-nowrap">
                                  <button
                                    onClick={() => {
                                      if (exp.student) {
                                        const template = whatsappConfig?.templates?.upcomingRenewal || "";
                                        const msg = previewMessageForStudent(template, exp.student, exp.membership, seat?.seatNumber || "Unassigned", exp.daysRemaining);
                                        setSelectedExpiringStudent(exp);
                                        setQuickWhatsAppMessage(msg);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-indigo-400 dark:hover:bg-indigo-950/40 transition"
                                  >
                                    <MessageSquare className="h-3 w-3" /> Send WhatsApp
                                  </button>
                                  <button
                                    onClick={() => {
                                      setMembershipForm({
                                        studentId: exp.student?.id || "",
                                        planId: exp.plan?.id || "",
                                        startDate: new Date().toISOString().split("T")[0],
                                        endDate: "",
                                        paidAmount: "",
                                        paymentMethod: "upi",
                                        discount: "",
                                        couponCode: "",
                                        notes: "Renewal setup from alerts menu",
                                        assignSeatId: seat?.id || "",
                                        status: "active"
                                      });
                                      setIsMembershipModalOpen(true);
                                    }}
                                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                                  >
                                    Configure
                                  </button>
                                  <button
                                    onClick={() => exp.student && handleOneClickRenewal(exp.student)}
                                    className="inline-flex items-center gap-0.5 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 transition"
                                  >
                                    1-Click Renew
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View (Optimized for Small Screens) */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                      {expiringMemberships.map(exp => {
                        const seat = seats.find(s => s.assignedStudentId === exp.student?.id);
                        return (
                          <div key={exp.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                            <div className="flex items-center gap-3">
                              <img src={exp.student?.photo} alt="" className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-slate-100 dark:ring-slate-800" referrerPolicy="no-referrer" />
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{exp.student?.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[9px] text-slate-400 font-mono font-semibold uppercase">{exp.student?.studentId}</span>
                                  {seat && (
                                    <span className="text-[9px] bg-indigo-50 text-indigo-600 font-semibold px-1 rounded dark:bg-indigo-950/40 dark:text-indigo-400">
                                      Seat {seat.seatNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                exp.daysRemaining <= 2
                                  ? "bg-red-50 text-red-600 dark:bg-red-950/20"
                                  : exp.daysRemaining <= 5
                                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20"
                                  : "bg-blue-50 text-blue-600 dark:bg-blue-950/20"
                              }`}>
                                {exp.daysRemaining === 0 ? "Expires Today" : `${exp.daysRemaining}d left`}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs py-2 text-slate-500 dark:text-slate-400 border-t border-b border-slate-50 dark:border-slate-800/40">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Contact</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">{exp.student?.phone}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Ends On</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{exp.membership?.endDate}</span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5 pt-1">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    if (exp.student) {
                                      const template = whatsappConfig?.templates?.upcomingRenewal || "";
                                      const msg = previewMessageForStudent(template, exp.student, exp.membership, seat?.seatNumber || "Unassigned", exp.daysRemaining);
                                      setSelectedExpiringStudent(exp);
                                      setQuickWhatsAppMessage(msg);
                                    }
                                  }}
                                  className="flex-1 justify-center inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 text-indigo-700 px-3 py-2 text-xs font-bold dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-indigo-400"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" /> Message
                                </button>
                                <button
                                  onClick={() => {
                                    setMembershipForm({
                                      studentId: exp.student?.id || "",
                                      planId: exp.plan?.id || "",
                                      startDate: new Date().toISOString().split("T")[0],
                                      endDate: "",
                                      paidAmount: "",
                                      paymentMethod: "upi",
                                      discount: "",
                                      couponCode: "",
                                      notes: "Renewal setup from alerts menu",
                                      assignSeatId: seat?.id || "",
                                      status: "active"
                                    });
                                    setIsMembershipModalOpen(true);
                                  }}
                                  className="flex-1 justify-center inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition"
                                >
                                  Configure
                                </button>
                              </div>
                              <button
                                onClick={() => exp.student && handleOneClickRenewal(exp.student)}
                                className="w-full justify-center inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition"
                              >
                                1-Click Renew
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* MODAL: Edit Template Inline */}
              {isExpiringTemplateModalOpen && whatsappConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                  <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 animate-scale-up space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                      <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                        <SettingsIcon className="h-4 w-4 text-indigo-500" />
                        Edit Renewal Alert Template
                      </h3>
                      <button
                        onClick={() => setIsExpiringTemplateModalOpen(false)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">
                        Customize the text message sent to expiring members. You can include any of these dynamic placeholders:
                      </p>
                      
                      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-lg text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                        <span className="bg-white px-1.5 py-0.5 rounded border border-slate-100 dark:bg-slate-900 dark:border-slate-800">{"{{name}}"}</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border border-slate-100 dark:bg-slate-900 dark:border-slate-800">{"{{org_name}}"}</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border border-slate-100 dark:bg-slate-900 dark:border-slate-800">{"{{end_date}}"}</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border border-slate-100 dark:bg-slate-900 dark:border-slate-800">{"{{seat_number}}"}</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border border-slate-100 dark:bg-slate-900 dark:border-slate-800">{"{{days}}"}</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Upcoming Renewal Template Text</label>
                        <textarea
                          rows={6}
                          value={whatsappConfig.templates.upcomingRenewal}
                          onChange={(e) => {
                            setWhatsappConfig({
                              ...whatsappConfig,
                              templates: {
                                ...whatsappConfig.templates,
                                upcomingRenewal: e.target.value
                              }
                            });
                          }}
                          className="w-full text-xs rounded-lg border border-slate-200 bg-white p-3 text-slate-800 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        onClick={() => setIsExpiringTemplateModalOpen(false)}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          await handleQuickSaveWhatsAppConfig(whatsappConfig);
                          setIsExpiringTemplateModalOpen(false);
                          Swal.fire({
                            icon: "success",
                            title: "Blueprint Saved",
                            text: "Renewal template saved successfully!",
                            timer: 1800,
                            showConfirmButton: false,
                            background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
                            color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
                          });
                        }}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                      >
                        Save Blueprint
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL: Live Preview & Dispatch Quick WhatsApp */}
              {selectedExpiringStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                  <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 animate-scale-up space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                      <div>
                        <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white">
                          Compose WhatsApp Renewal Alert
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Recipient: {selectedExpiringStudent.student?.name} ({selectedExpiringStudent.student?.phone})
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedExpiringStudent(null)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Edit Alert Message Text</label>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">Variables hydrated</span>
                        </div>
                        <textarea
                          rows={6}
                          value={quickWhatsAppMessage}
                          onChange={(e) => setQuickWhatsAppMessage(e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-200 bg-white p-3 text-slate-800 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 font-mono"
                        />
                      </div>

                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-3 text-[11px] text-amber-800 dark:text-amber-400 flex items-start gap-2 leading-relaxed">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Real &amp; Simulation Options:</p>
                          <p className="mt-0.5">
                            <strong>Dispatch API</strong> logs the action in your local system's WhatsApp history.
                            <strong>Open WhatsApp Web</strong> launches a new window with a pre-hydrated message text so you can send it in real-life.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        onClick={() => setSelectedExpiringStudent(null)}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition order-3 sm:order-1"
                      >
                        Cancel
                      </button>
                      
                      <button
                        onClick={async () => {
                          try {
                            setSendingQuickWhatsApp(true);
                            await apiCall(`/api/whatsapp/test`, "POST", {
                              orgId: organization.id,
                              phone: selectedExpiringStudent.student?.phone,
                              type: "upcomingRenewal",
                              studentId: selectedExpiringStudent.student?.id,
                              studentName: selectedExpiringStudent.student?.name,
                              message: quickWhatsAppMessage
                            });
                            // Refresh logs
                            const logsData = await apiCall(`/api/whatsapp/logs?orgId=${organization.id}`);
                            setWhatsappLogs(logsData);
                            setSelectedExpiringStudent(null);
                            Swal.fire({
                              icon: "success",
                              title: "WhatsApp Dispatched",
                              text: "WhatsApp Alert sent and logged successfully!",
                              timer: 2000,
                              showConfirmButton: false,
                              background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
                              color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
                            });
                          } catch (err: any) {
                            Swal.fire({
                              icon: "error",
                              title: "Dispatch Failed",
                              text: err.message || "Failed to dispatch message.",
                              background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
                              color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
                            });
                          } finally {
                            setSendingQuickWhatsApp(false);
                          }
                        }}
                        disabled={sendingQuickWhatsApp}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 text-xs font-semibold dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-950/60 transition order-2"
                      >
                        {sendingQuickWhatsApp ? "Sending..." : "Dispatch API (Mock)"}
                      </button>

                      <button
                        onClick={() => {
                          const cleanedPhone = selectedExpiringStudent.student?.phone.replace(/\D/g, "");
                          const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(quickWhatsAppMessage)}`;
                          window.open(whatsappUrl, "_blank");
                          
                          // Also write log to the backend so the history is preserved!
                          apiCall(`/api/whatsapp/test`, "POST", {
                            orgId: organization.id,
                            phone: selectedExpiringStudent.student?.phone,
                            type: "upcomingRenewal",
                            studentId: selectedExpiringStudent.student?.id,
                            studentName: selectedExpiringStudent.student?.name,
                            message: quickWhatsAppMessage
                          }).then(async () => {
                            const logsData = await apiCall(`/api/whatsapp/logs?orgId=${organization.id}`);
                            setWhatsappLogs(logsData);
                          }).catch(err => console.error("Could not write history log", err));

                          setSelectedExpiringStudent(null);
                        }}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition order-1 sm:order-3"
                      >
                        Open WhatsApp Web
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* PENDING ADMINISTRATIVE ACTIONS VIEW */}
          {activeTab === "pending_actions" && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Administrative Task Center</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Review and resolve registrations without plans, expired subscriptions still holding seats, partial dues, and maintenance blocks.</p>
              </div>

              {/* Task Cards & Dynamic Filters */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{pendingActions.length} Actions Required</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pendingActions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                      <CheckCircle className="h-12 w-12 text-emerald-500 mb-3 animate-bounce" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All caught up! Desk is completely clean.</p>
                      <p className="text-xs text-slate-400 mt-1">No administrative actions are pending at this moment.</p>
                    </div>
                  ) : (
                    <>
                      {pendingActions.slice(0, visibleActionsCount).map(action => (
                        <div key={action.id} className="p-4 pl-6 pr-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                          <div className="flex items-start gap-3 min-w-0">
                            <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                              action.severity === "high"
                                ? "bg-red-500 animate-pulse"
                                : action.severity === "medium"
                                ? "bg-amber-500"
                                : "bg-blue-500"
                            }`} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{action.title}</h4>
                                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                                  action.severity === "high"
                                    ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                                    : action.severity === "medium"
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                                }`}>
                                  {action.severity} Priority
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal mt-1">{action.description}</p>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            <button
                              onClick={() => handlePendingActionClick(action)}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs"
                            >
                              <span>{action.actionLabel}</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Infinite Scroll Trigger & Loader */}
                      <div ref={observerTarget} className="h-2" />

                      {loadingMoreActions && (
                        <div className="p-6 flex items-center justify-center gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 text-slate-500 dark:text-slate-400">
                          <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                          <span className="text-xs font-medium">Loading more actions...</span>
                        </div>
                      )}

                      {!loadingMoreActions && visibleActionsCount < pendingActions.length && (
                        <div className="p-4 flex justify-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10">
                          <button
                            onClick={loadMoreActions}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
                          >
                            Load More Actions ({pendingActions.length - visibleActionsCount} remaining)
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. STUDENTS DIRECTORY TAB */}
          {activeTab === "students" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Students Directory</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Register, update, and manage admissions.</p>
                </div>
                <button
                  onClick={() => setIsStudentModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                >
                  <Plus className="h-4 w-4" /> Register Student
                </button>
              </div>

              {/* Student table cards */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, phone, email, college..."
                      value={globalSearchQuery}
                      onChange={(e) => setGlobalSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>

                  {/* Active/Inactive Switcher Tabs */}
                  <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg self-start md:self-auto">
                    <button
                      type="button"
                      onClick={() => setStudentStatusFilter("active_all")}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                        studentStatusFilter === "active_all"
                          ? "bg-white text-slate-800 shadow-xs dark:bg-slate-900 dark:text-white"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                      }`}
                    >
                      Active / Expired
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentStatusFilter("inactive")}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                        studentStatusFilter === "inactive"
                          ? "bg-white text-slate-800 shadow-xs dark:bg-slate-900 dark:text-white"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                      }`}
                    >
                      Inactive / Archived
                      {students.filter(s => s.status === "inactive").length > 0 && (
                        <span className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 rounded-full px-1.5 py-0.5 text-[10px]">
                          {students.filter(s => s.status === "inactive").length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold dark:bg-slate-950 dark:border-slate-800">
                        <th className="p-4">STUDENT</th>
                        <th className="p-4">ACADEMICS</th>
                        <th className="p-4">GOVT ID</th>
                        <th className="p-4">MEMBERSHIP</th>
                        <th className="p-4">SEAT</th>
                        <th className="p-4 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(() => {
                        const filteredStudents = students.filter(stud => {
                          // Filter by tab toggle
                          if (studentStatusFilter === "active_all") {
                            if (stud.status === "inactive") return false;
                          } else {
                            if (stud.status !== "inactive") return false;
                          }

                          // Search filter
                          if (!globalSearchQuery) return true;
                          const q = globalSearchQuery.toLowerCase();
                          return (
                            stud.name.toLowerCase().includes(q) ||
                            stud.studentId.toLowerCase().includes(q) ||
                            stud.phone.includes(q) ||
                            stud.college.toLowerCase().includes(q)
                          );
                        });

                        if (filteredStudents.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-400">
                                No student profiles matched the criteria.
                              </td>
                            </tr>
                          );
                        }

                        return filteredStudents.map(stud => {
                          const seat = seats.find(s => s.assignedStudentId === stud.id);
                          const isCheckedInToday = attendances.some(a => a.studentId === stud.id && a.date === todayStr && !a.checkOutTime);
                          const isInactive = stud.status === "inactive";
                          return (
                            <tr key={stud.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden flex items-center justify-center text-slate-500 font-bold text-xs">
                                    {stud.photo ? (
                                      <img
                                        src={stud.photo}
                                        alt={stud.name}
                                        className="h-full w-full object-cover"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <span>{stud.name.charAt(0).toUpperCase()}</span>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100">{stud.name}</h4>
                                    <p className="text-[10px] text-slate-400 font-mono">ID: {stud.studentId} | {stud.phone}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <p className="font-medium text-slate-700 dark:text-slate-300">{stud.college || "N/A"}</p>
                                <p className="text-slate-400 text-[10px]">{stud.course} - {stud.year}</p>
                              </td>
                              <td className="p-4">
                                <p className="font-mono">{stud.govIdType}</p>
                                <p className="text-slate-400 text-[10px] font-mono">{stud.govIdNumber || "N/A"}</p>
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${
                                  stud.status === "active"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20"
                                    : stud.status === "expired"
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20"
                                    : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                                }`}>
                                  {stud.status}
                                </span>
                              </td>
                              <td className="p-4 font-mono font-bold text-indigo-600">
                                {seat ? seat.seatNumber : "Unassigned"}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {!isInactive && (
                                    <button
                                      onClick={() => handleManualCheckInOut(stud.id)}
                                      title={isCheckedInToday ? "Manual Check-out" : "Manual Check-in"}
                                      className={`p-1.5 rounded-lg border transition ${
                                        isCheckedInToday
                                          ? "bg-red-50 text-red-600 border-red-100"
                                          : "bg-indigo-50 text-indigo-600 border-indigo-100"
                                      }`}
                                    >
                                      <Clock className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openIDCard(stud)}
                                    title="Student ID Badge"
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800"
                                  >
                                    <Sparkles className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleEditStudentClick(stud)}
                                    title="Edit Student Profile"
                                    className="p-1.5 rounded-lg border border-slate-200 text-indigo-600 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  {isInactive ? (
                                    <>
                                      <button
                                        onClick={() => handleReactivateStudent(stud.id)}
                                        title="Reactivate Student Profile"
                                        className="p-1.5 rounded-lg border border-emerald-100 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/30"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handlePermanentlyDeleteStudent(stud.id)}
                                        title="Permanently Delete Student"
                                        className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleDeleteStudent(stud.id)}
                                      title="Deactivate Student (Soft Delete)"
                                      className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. SEAT WORKSPACE & GRID LAYOUT */}
          {activeTab === "seats" && (
            <div className="space-y-6">
              {/* Header & Quick Action Buttons */}
              <div className="border-b border-slate-100 pb-4 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
                    <Grid className="h-5 w-5 text-indigo-600" />
                    Visual Seat Layout &amp; Desk Maps
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Interactive spatial desk mapping, real-time allocation status &amp; zone management.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (rooms.length > 0) {
                        setBatchSeatForm(prev => ({ ...prev, roomId: rooms[0].id }));
                      }
                      setIsBatchSeatModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition shadow-2xs"
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Batch Generator
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (rooms.length > 0) {
                        setSeatForm(prev => ({ ...prev, roomId: rooms[0].id }));
                      }
                      setIsAddSeatModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5 text-indigo-600" />
                    Add Desk
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddRoomModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Study Zone
                  </button>
                </div>
              </div>

              {/* Statistical KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:bg-slate-900 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Desks</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{seats.length}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{rooms.length} {rooms.length === 1 ? 'Zone' : 'Zones'}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:bg-emerald-950/20 dark:border-emerald-900/30 shadow-2xs">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Available</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                      {seats.filter(s => s.status === 'available').length}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100/80 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded">
                      {seats.length > 0 ? Math.round((seats.filter(s => s.status === 'available').length / seats.length) * 100) : 0}% Free
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:bg-indigo-950/20 dark:border-indigo-900/30 shadow-2xs">
                  <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">Occupied</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-bold font-mono text-indigo-700 dark:text-indigo-300">
                      {seats.filter(s => s.status === 'occupied').length}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100/80 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">
                      {seats.length > 0 ? Math.round((seats.filter(s => s.status === 'occupied').length / seats.length) * 100) : 0}% Filled
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 dark:bg-red-950/20 dark:border-red-900/30 shadow-2xs">
                  <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider block">Maintenance</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-bold font-mono text-red-600 dark:text-red-300">
                      {seats.filter(s => s.status === 'maintenance').length}
                    </span>
                    <span className="text-[10px] text-red-500 font-medium">Blocked</span>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-4 lg:col-span-1 rounded-xl border border-slate-200 bg-white p-4 dark:bg-slate-900 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Occupancy Rate</span>
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">
                        {seats.length > 0 ? Math.round((seats.filter(s => s.status === 'occupied').length / seats.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${seats.length > 0 ? (seats.filter(s => s.status === 'occupied').length / seats.length) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floor/Room Selector Tabs */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedRoomId("all")}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition flex items-center gap-2 border ${
                    selectedRoomId === "all"
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  All Study Zones
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedRoomId === "all" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                    {seats.length}
                  </span>
                </button>

                {rooms.map(rm => {
                  const roomSeats = seats.filter(s => s.roomId === rm.id);
                  const availCount = roomSeats.filter(s => s.status === 'available').length;
                  const isSelected = selectedRoomId === rm.id;
                  return (
                    <div
                      key={rm.id}
                      className={`group flex items-center rounded-xl border transition ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-500 dark:text-indigo-200"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedRoomId(rm.id)}
                        className="px-3.5 py-2 text-xs font-semibold text-left flex items-center gap-2"
                      >
                        <span>{rm.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isSelected ? "bg-indigo-200/70 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                        }`}>
                          {availCount}/{roomSeats.length} Free
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoom(rm.id, rm.name);
                        }}
                        title={`Delete ${rm.name}`}
                        className="pr-2.5 text-slate-400 hover:text-red-500 opacity-60 hover:opacity-100 transition"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsAddRoomModalOpen(true)}
                  className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 transition flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Zone
                </button>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={seatSearchQuery}
                    onChange={(e) => setSeatSearchQuery(e.target.value)}
                    placeholder="Search by Desk No (e.g. D-01) or Student Name..."
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg dark:bg-slate-950 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  {seatSearchQuery && (
                    <button
                      onClick={() => setSeatSearchQuery("")}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
                    <span className="text-slate-400 px-1 font-semibold">Status:</span>
                    {(["all", "available", "occupied", "maintenance", "reserved"] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSeatStatusFilter(st)}
                        className={`px-2 py-0.5 rounded capitalize font-medium transition ${
                          seatStatusFilter === st
                            ? "bg-indigo-600 text-white shadow-2xs font-semibold"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
                    <span className="text-slate-400 px-1 font-semibold">Type:</span>
                    {(["all", "AC", "Non-AC", "Premium", "Window"] as const).map(tp => (
                      <button
                        key={tp}
                        type="button"
                        onClick={() => setSeatTypeFilter(tp)}
                        className={`px-2 py-0.5 rounded font-medium transition ${
                          seatTypeFilter === tp
                            ? "bg-slate-800 text-white dark:bg-slate-700 shadow-2xs font-semibold"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                        }`}
                      >
                        {tp}
                      </button>
                    ))}
                  </div>

                  {(seatSearchQuery || seatStatusFilter !== "all" || seatTypeFilter !== "all" || selectedRoomId !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSeatSearchQuery("");
                        setSeatStatusFilter("all");
                        setSeatTypeFilter("all");
                        setSelectedRoomId("all");
                      }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 px-2 py-1"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Grid Layout map */}
              {(() => {
                const filteredSeats = seats.filter(st => {
                  if (selectedRoomId !== "all" && st.roomId !== selectedRoomId) return false;
                  if (seatStatusFilter !== "all" && st.status !== seatStatusFilter) return false;
                  if (seatTypeFilter !== "all" && st.type !== seatTypeFilter) return false;
                  if (seatSearchQuery.trim()) {
                    const q = seatSearchQuery.toLowerCase();
                    const numMatch = st.seatNumber.toLowerCase().includes(q);
                    const occup = students.find(s => s.id === st.assignedStudentId);
                    const nameMatch = occup && occup.name.toLowerCase().includes(q);
                    const idMatch = occup && occup.studentId.toLowerCase().includes(q);
                    return numMatch || nameMatch || idMatch;
                  }
                  return true;
                });

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Interactive seat grid */}
                    <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between min-h-[420px]">
                      <div>
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Grid className="h-3.5 w-3.5 text-indigo-600" />
                            Study Desk Matrix ({filteredSeats.length} displayed)
                          </span>
                          <span className="text-xs text-slate-400 font-medium">Click any desk for actions</span>
                        </div>

                        {/* If 0 seats in the whole system */}
                        {seats.length === 0 ? (
                          <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center mb-4 shadow-sm">
                              <Grid className="h-8 w-8 text-indigo-600" />
                            </div>
                            <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">
                              Your Study Zone Layout is Empty
                            </h3>
                            <p className="text-xs text-slate-500 max-w-md mt-1 mb-6 leading-relaxed">
                              No study desks or halls are configured yet. Initialize a standard 24-seat layout instantly, or design custom zones and numbered cubicles.
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                              <button
                                type="button"
                                disabled={isQuickSetupLoading}
                                onClick={handleQuickSetupLayout}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm transition disabled:opacity-50"
                              >
                                <Zap className="h-4 w-4 text-amber-300" />
                                {isQuickSetupLoading ? "Initializing 24 Desks..." : "Quick Initialize (24-Desk Hall)"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsAddRoomModalOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 transition"
                              >
                                <Plus className="h-4 w-4" />
                                Create Custom Zone
                              </button>
                            </div>
                          </div>
                        ) : filteredSeats.length === 0 ? (
                          <div className="py-12 text-center text-slate-400">
                            <Filter className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">No desks match your filter criteria.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setSeatSearchQuery("");
                                setSeatStatusFilter("all");
                                setSeatTypeFilter("all");
                                setSelectedRoomId("all");
                              }}
                              className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
                            >
                              Reset Filters
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {filteredSeats.map(st => {
                              const assignedStud = students.find(s => s.id === st.assignedStudentId);
                              const isSelected = selectedSeat?.id === st.id;
                              return (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={() => setSelectedSeat(st)}
                                  className={`aspect-square rounded-xl p-2.5 flex flex-col justify-between items-center transition relative text-left border ${
                                    isSelected
                                      ? "ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-slate-900"
                                      : ""
                                  } ${
                                    st.status === "occupied"
                                      ? "bg-indigo-50/90 border-indigo-200 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-200 shadow-2xs"
                                      : st.status === "maintenance"
                                      ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900/40 dark:text-red-300"
                                      : st.status === "reserved"
                                      ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-300"
                                      : "bg-slate-50/80 border-slate-200 hover:border-indigo-300 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300"
                                  }`}
                                >
                                  {/* Top header inside desk card */}
                                  <div className="w-full flex justify-between items-center">
                                    <span className="text-[11px] font-bold font-mono tracking-tight">{st.seatNumber}</span>
                                    <span className={`text-[8px] uppercase font-bold px-1 py-0.2 rounded ${
                                      st.type === 'AC' ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' :
                                      st.type === 'Premium' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                                      st.type === 'Window' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                                      'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                      {st.type}
                                    </span>
                                  </div>

                                  {/* Middle Content */}
                                  <div className="my-auto text-center w-full truncate px-0.5">
                                    {st.status === "occupied" && assignedStud ? (
                                      <div className="flex flex-col items-center">
                                        <div className="h-5 w-5 rounded-full bg-indigo-200 text-indigo-800 text-[9px] font-bold flex items-center justify-center overflow-hidden mb-0.5">
                                          {assignedStud.photo ? (
                                            <img src={assignedStud.photo} alt="" className="h-full w-full object-cover" />
                                          ) : (
                                            assignedStud.name.charAt(0)
                                          )}
                                        </div>
                                        <span className="text-[10px] font-semibold truncate block w-full text-center">
                                          {assignedStud.name.split(" ")[0]}
                                        </span>
                                      </div>
                                    ) : st.status === "maintenance" ? (
                                      <div className="flex flex-col items-center text-red-500">
                                        <Wrench className="h-4 w-4 mb-0.5" />
                                        <span className="text-[9px] font-medium uppercase tracking-tight">Repair</span>
                                      </div>
                                    ) : st.status === "reserved" ? (
                                      <div className="text-center text-amber-600 text-[10px] font-semibold">
                                        Reserved
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center text-emerald-600 dark:text-emerald-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mb-1"></span>
                                        <span className="text-[10px] font-medium">Available</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Bottom row identifier */}
                                  <div className="w-full text-[9px] text-slate-400 flex justify-between items-center pt-0.5 border-t border-slate-100/60 dark:border-slate-800/60">
                                    <span>{st.row || "Desk"}</span>
                                    {st.status === "occupied" && (
                                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Legend */}
                      <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500">
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 bg-slate-50 border border-slate-300 rounded"></div>
                            <span>Available</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 bg-indigo-100 border border-indigo-300 rounded"></div>
                            <span>Occupied</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 bg-amber-100 border border-amber-300 rounded"></div>
                            <span>Reserved</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 bg-red-100 border border-red-300 rounded"></div>
                            <span>Maintenance</span>
                          </div>
                        </div>

                        {seats.length > 0 && (
                          <button
                            type="button"
                            onClick={handleQuickSetupLayout}
                            disabled={isQuickSetupLoading}
                            className="text-[10px] text-slate-400 hover:text-indigo-600 transition flex items-center gap-1"
                          >
                            <Zap className="h-3 w-3" /> Quick Add Hall
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Seat Detail Inspector Panel */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 h-fit shadow-2xs">
                      {selectedSeat ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-start border-b border-slate-100 pb-3 dark:border-slate-800">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-display font-bold text-base text-slate-800 dark:text-slate-100">
                                  Desk Details
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditSeatForm({
                                      id: selectedSeat.id,
                                      seatNumber: selectedSeat.seatNumber,
                                      type: selectedSeat.type,
                                      row: selectedSeat.row || "Row A",
                                      notes: selectedSeat.notes || "",
                                      status: selectedSeat.status
                                    });
                                    setIsEditSeatModalOpen(true);
                                  }}
                                  title="Edit Desk Details"
                                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSeat(selectedSeat.id, selectedSeat.seatNumber)}
                                  title="Delete Desk"
                                  className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <span className="font-mono text-2xl font-bold text-indigo-600 block mt-0.5">
                                {selectedSeat.seatNumber}
                              </span>
                            </div>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                              selectedSeat.status === 'available'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : selectedSeat.status === 'occupied'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : selectedSeat.status === 'maintenance'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {selectedSeat.status}
                            </span>
                          </div>

                          <div className="space-y-2.5 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-100 dark:bg-slate-950 dark:border-slate-800">
                            <div className="flex justify-between">
                              <span className="text-slate-400 uppercase text-[10px] font-semibold">Study Zone</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {rooms.find(r => r.id === selectedSeat.roomId)?.name || "Main Hall"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 uppercase text-[10px] font-semibold">Desk Category</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedSeat.type} Cubicle</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 uppercase text-[10px] font-semibold">Row Alignment</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedSeat.row || "Row A"}</span>
                            </div>
                            <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                              <span className="text-slate-400 block uppercase text-[10px] font-semibold mb-0.5">Features &amp; Notes</span>
                              <span className="text-slate-600 dark:text-slate-400 leading-relaxed block text-[11px]">
                                {selectedSeat.notes || "Quiet silent zone desk with dedicated power socket."}
                              </span>
                            </div>
                          </div>

                          {/* Seat Occupant Info */}
                          {selectedSeat.assignedStudentId ? (
                            <div className="border-t border-slate-100 pt-4 dark:border-slate-800/80 space-y-3">
                              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                                Currently Assigned Student
                              </span>
                              {(() => {
                                const occup = students.find(s => s.id === selectedSeat.assignedStudentId);
                                if (!occup) return <p className="text-xs text-slate-400">Student profile not found.</p>;
                                const activeMemb = memberships.find(m => m.studentId === occup.id);
                                return (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2.5 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30">
                                      <img src={occup.photo} alt="" className="h-9 w-9 rounded-full object-cover border border-indigo-200" />
                                      <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{occup.name}</h4>
                                        <p className="text-[10px] text-slate-400 font-mono">ID: {occup.studentId} • {occup.phone}</p>
                                      </div>
                                    </div>
                                    <div className="text-[11px] space-y-1 bg-slate-50 p-2.5 rounded-lg dark:bg-slate-950 dark:border dark:border-slate-800">
                                      <p className="text-slate-500">Plan Expiry: <strong className="text-red-500">{activeMemb?.endDate || "No Active Plan"}</strong></p>
                                      <p className="text-slate-500 truncate">Institution: <strong className="text-slate-700 dark:text-slate-300">{occup.college || "Self Prep"}</strong></p>
                                    </div>

                                    <div className="pt-2 flex flex-col gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleReleaseSeat(selectedSeat.id)}
                                        className="w-full rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                                      >
                                        Vacate &amp; Release Seat
                                      </button>

                                      <form onSubmit={handleTransferSeat} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transfer Student Desk</span>
                                        <select
                                          required
                                          value={transferTargetSeatId}
                                          onChange={(e) => setTransferTargetSeatId(e.target.value)}
                                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                                        >
                                          <option value="">Select target available desk...</option>
                                          {seats.filter(s => s.status === 'available' && s.id !== selectedSeat.id).map(s => (
                                            <option key={s.id} value={s.id}>{s.seatNumber} ({s.type} - {rooms.find(r => r.id === s.roomId)?.name || "Hall"})</option>
                                          ))}
                                        </select>
                                        <button
                                          type="submit"
                                          className="w-full rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition flex items-center justify-center gap-1.5"
                                        >
                                          <ArrowRightLeft className="h-3.5 w-3.5" />
                                          Transfer Student
                                        </button>
                                      </form>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : selectedSeat.status === "maintenance" ? (
                            <div className="border-t border-slate-100 pt-4 dark:border-slate-800/80 space-y-3">
                              <p className="text-xs text-red-500 font-medium">This desk is currently blocked for maintenance.</p>
                              <button
                                type="button"
                                onClick={() => handleUnblockSeat(selectedSeat.id)}
                                className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                              >
                                ✅ Restore &amp; Mark Available
                              </button>
                            </div>
                          ) : (
                            <div className="border-t border-slate-100 pt-4 dark:border-slate-800/80 space-y-2.5">
                              <p className="text-xs text-slate-500">This desk is currently empty &amp; ready for assignment.</p>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignStudentId("");
                                  setIsAssignSeatModalOpen(true);
                                }}
                                className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition flex items-center justify-center gap-1.5"
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                                Assign to Enrolled Student
                              </button>

                              <button
                                type="button"
                                onClick={() => handleBlockSeat(selectedSeat.id)}
                                className="w-full rounded-lg border border-red-200 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/30 transition"
                              >
                                🔧 Block for Maintenance
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-6 text-slate-400">
                          <Info className="h-8 w-8 text-slate-300 mb-3" />
                          <p className="text-xs font-medium">Click on any study cubicle in the grid to view details, assign students, vacate, or transfer desks.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 4. PLANS & MEMBERSHIPS TAB */}
          {activeTab === "memberships" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Membership Plans &amp; Passes</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Define business durations, standard seat pricings, and subscription tiers.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPlanModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    <Plus className="h-4 w-4" /> Add Plan Pass
                  </button>
                </div>
              </div>

              {/* Plans Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map(p => (
                  <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700 uppercase dark:bg-indigo-950/20">
                          {p.durationType}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs text-slate-400 font-medium mr-1">{p.durationDays} Days</span>
                          <button
                            type="button"
                            onClick={() => handleStartEditPlan(p)}
                            title="Edit Plan"
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePlan(p.id)}
                            title="Delete Plan"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-display font-bold text-base text-slate-800 dark:text-slate-100 mt-2">
                        {p.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{p.description || "Quiet study pass."}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 mt-4 flex justify-between items-end">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase">Pricing Rate</span>
                        <p className="font-display text-xl font-bold text-indigo-600 dark:text-indigo-400">
                          {currencySymbol}{p.price}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded">
                        {p.seatType} Zone
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Memberships Log Table */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-display font-bold text-xs text-slate-400 uppercase tracking-widest">Active Subscriptions Registry</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold dark:bg-slate-950 dark:border-slate-800">
                        <th className="p-3">STUDENT</th>
                        <th className="p-3">MEMBERSHIP PLAN</th>
                        <th className="p-3">START DATE</th>
                        <th className="p-3">END DATE</th>
                        <th className="p-3">AMOUNT PAID</th>
                        <th className="p-3">STATUS</th>
                        <th className="p-3 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {memberships.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-400">No active/expired subscription history logged yet.</td>
                        </tr>
                      ) : (
                        memberships.map(memb => {
                          const stud = students.find(s => s.id === memb.studentId);
                          const plan = plans.find(p => p.id === memb.planId);
                          return (
                            <tr key={memb.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                              <td className="p-3">
                                <span className="font-bold text-slate-800 dark:text-slate-100">{stud?.name || "Unknown Student"}</span>
                              </td>
                              <td className="p-3 font-medium">{plan?.name || "Standard Pass"}</td>
                              <td className="p-3">{memb.startDate}</td>
                              <td className="p-3 text-amber-600 font-semibold">{memb.endDate}</td>
                              <td className="p-3 font-semibold text-indigo-600">{currencySymbol}{memb.paidAmount}</td>
                              <td className="p-3">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  memb.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {memb.status}
                                </span>
                              </td>
                              <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditMembership(memb)}
                                  title="Edit Subscription"
                                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMembership(memb.id)}
                                  title="Delete Subscription"
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. ATTENDANCE LOGS */}
          {activeTab === "attendance" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Attendance Records</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Monitor check-in &amp; check-out histories.</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Present Desk Log</span>
                  <span className="text-xs font-mono font-bold text-indigo-600">{todayStr}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold dark:bg-slate-950 dark:border-slate-800">
                        <th className="p-3">STUDENT</th>
                        <th className="p-3">DATE</th>
                        <th className="p-3">CHECK IN</th>
                        <th className="p-3">CHECK OUT</th>
                        <th className="p-3">SCAN TYPE</th>
                        <th className="p-3">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {attendances.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">No attendance entries recorded for today. Use the check-in desk to simulate scans.</td>
                        </tr>
                      ) : (
                        attendances.map(att => {
                          const stud = students.find(s => s.id === att.studentId);
                          return (
                            <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                              <td className="p-3">
                                <span className="font-bold text-slate-800 dark:text-slate-100">{stud?.name || "Deleted Student"}</span>
                              </td>
                              <td className="p-3 font-mono">{att.date}</td>
                              <td className="p-3 text-emerald-600 font-semibold">{att.checkInTime || "N/A"}</td>
                              <td className="p-3 text-red-500 font-semibold">{att.checkOutTime || "Logged In"}</td>
                              <td className="p-3 font-mono uppercase text-[10px]">{att.method}</td>
                              <td className="p-3">
                                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Present</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. PAYMENTS & CASHIER & EXPENSES TAB */}
          {activeTab === "payments" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Cashier &amp; Expense Manager</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Log expenses, bill subscriptions, and print receipts.</p>
                </div>
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                >
                  <Plus className="h-4 w-4" /> Log Expense
                </button>
              </div>

              {/* Sub grid dividing payment collections & expense tracking */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Payment History */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-display font-bold text-xs text-slate-400 uppercase tracking-widest">Revenue Collections Log</h3>
                  </div>
                  <div className="overflow-y-auto max-h-[380px]">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold dark:bg-slate-950">
                          <th className="p-3">STUDENT</th>
                          <th className="p-3">NET AMOUNT</th>
                          <th className="p-3">METHOD</th>
                          <th className="p-3 text-right">RECEIPT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {payments.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-slate-400">No revenue collections logged.</td>
                          </tr>
                        ) : (
                          payments.map(pay => {
                            const stud = students.find(s => s.id === pay.studentId);
                            return (
                              <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                <td className="p-3">
                                  <span className="font-bold text-slate-800 dark:text-slate-100 block">{stud?.name || "Registered Student"}</span>
                                  <span className="text-[9px] text-slate-400">{pay.date}</span>
                                </td>
                                <td className="p-3">
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{currencySymbol}{pay.netPaid}</span>
                                  {pay.balance > 0 && <span className="block text-[9px] text-red-500">Bal: {currencySymbol}{pay.balance}</span>}
                                </td>
                                <td className="p-3 uppercase font-mono text-[10px]">{pay.method.replace("_", " ")}</td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => openReceipt(pay)}
                                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600"
                                  >
                                    <Printer className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Expense List */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-display font-bold text-xs text-slate-400 uppercase tracking-widest">Business Expenses</h3>
                  </div>
                  <div className="overflow-y-auto max-h-[380px]">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold dark:bg-slate-950">
                          <th className="p-3">TITLE &amp; CATEGORY</th>
                          <th className="p-3">DATE</th>
                          <th className="p-3 text-right">AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {expenses.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-slate-400">No operational expenses logged for this month.</td>
                          </tr>
                        ) : (
                          expenses.map(exp => (
                            <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                              <td className="p-3">
                                <span className="font-bold text-slate-800 dark:text-slate-100 block">{exp.title}</span>
                                <span className="text-[10px] text-slate-400">{exp.category}</span>
                              </td>
                              <td className="p-3 font-mono text-slate-500">{exp.date}</td>
                              <td className="p-3 text-right font-bold text-red-600">
                                {currencySymbol}{exp.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 7. REPORTS & ANALYTICS TAB */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Business Analytics &amp; Reports</h2>
                  <p className="text-xs text-slate-500 mt-0.5">SaaS analytics, revenue sheets, and printable records divided by cycles.</p>
                </div>

                {/* Monthly/Yearly Toggle */}
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg self-start md:self-auto">
                  <button
                    type="button"
                    onClick={() => setReportType("monthly")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                      reportType === "monthly"
                        ? "bg-white text-slate-800 shadow-xs dark:bg-slate-900 dark:text-white"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Monthly Cycles
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportType("yearly")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                      reportType === "yearly"
                        ? "bg-white text-slate-800 shadow-xs dark:bg-slate-900 dark:text-white"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    Yearly Cycles
                  </button>
                </div>
              </div>

              {/* Cycle Dropdown Selectors */}
              <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Cycle:</span>
                  {reportType === "monthly" ? (
                    <select
                      value={selectedReportMonth}
                      onChange={(e) => setSelectedReportMonth(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    >
                      {availableMonths.map(m => {
                        // Format YYYY-MM into readable format
                        const [y, monthNum] = m.split("-");
                        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        const formatted = `${months[parseInt(monthNum, 10) - 1]} ${y}`;
                        return (
                          <option key={m} value={m}>{formatted}</option>
                        );
                      })}
                    </select>
                  ) : (
                    <select
                      value={selectedReportYear}
                      onChange={(e) => setSelectedReportYear(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    >
                      {availableYears.map(y => (
                        <option key={y} value={y}>{y} Fiscal Year</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="text-xs text-slate-400 font-mono ml-auto">
                  Showing ledger from {reportType === "monthly" ? selectedReportMonth : `${selectedReportYear}-01`} to {reportType === "monthly" ? `${selectedReportMonth}-31` : `${selectedReportYear}-12`}
                </div>
              </div>

              {/* Divided Profit and Loss Metric Widgets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/10 p-5 dark:border-emerald-950/20 dark:bg-emerald-950/5 shadow-xs">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Gross Revenue Inflow</span>
                    <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-1 text-[10px] font-bold">REVENUE</span>
                  </div>
                  <span className="text-3xl font-display font-bold text-emerald-600 dark:text-emerald-500 block mt-3">
                    {currencySymbol}{reportCollection.toLocaleString()}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    {filteredPaymentsForReport.length} membership receipts in this cycle
                  </p>
                </div>

                <div className="rounded-xl border border-red-100 bg-red-50/10 p-5 dark:border-red-950/20 dark:bg-red-950/5 shadow-xs">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Operating Expenses</span>
                    <span className="text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-1 text-[10px] font-bold">OUTFLOW</span>
                  </div>
                  <span className="text-3xl font-display font-bold text-red-600 dark:text-red-500 block mt-3">
                    {currencySymbol}{reportExpenses.toLocaleString()}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    {filteredExpensesForReport.length} bills settled in this cycle
                  </p>
                </div>

                <div className={`rounded-xl border p-5 shadow-xs ${
                  reportNetProfit >= 0 
                    ? "border-indigo-100 bg-indigo-50/10 dark:border-indigo-950/30 dark:bg-indigo-950/5" 
                    : "border-amber-100 bg-amber-50/10 dark:border-amber-950/30 dark:bg-amber-950/5"
                }`}>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Net Cycle Surplus</span>
                    <span className={`rounded-lg p-1 text-[10px] font-bold ${
                      reportNetProfit >= 0 
                        ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" 
                        : "text-amber-500 bg-amber-50 dark:bg-amber-950/30"
                    }`}>
                      SURPLUS
                    </span>
                  </div>
                  <span className={`text-3xl font-display font-bold block mt-3 ${
                    reportNetProfit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-500'
                  }`}>
                    {currencySymbol}{reportNetProfit.toLocaleString()}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Operating margin: {reportCollection > 0 ? ((reportNetProfit / reportCollection) * 100).toFixed(1) : "0.0"}%
                  </p>
                </div>
              </div>

              {/* Cash Flow Comparison Chart */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 flex flex-col h-[360px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-bold text-xs text-slate-400 uppercase tracking-widest">
                      Cycle Trend Analysis ({reportType === "monthly" ? "Daily Breakdown" : "Monthly Breakdown"})
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Visual contrast of cash inflows and operations costs.</p>
                  </div>

                  {/* Chart Legend */}
                  <div className="flex gap-4 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 bg-emerald-500 rounded-xs"></div>
                      <span>Revenue</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 bg-red-500 rounded-xs"></div>
                      <span>Expenses</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 w-full">
                  {(() => {
                    let chartData: any[] = [];
                    if (reportType === "monthly") {
                      chartData = Array.from({ length: 31 }, (_, i) => {
                        const dayNum = String(i + 1).padStart(2, "0");
                        const datePrefix = `${selectedReportMonth}-${dayNum}`;
                        const dayPayments = filteredPaymentsForReport.filter(p => p.date === datePrefix).reduce((sum, p) => sum + p.netPaid, 0);
                        const dayExpenses = filteredExpensesForReport.filter(e => e.date === datePrefix).reduce((sum, e) => sum + e.amount, 0);
                        return {
                          name: `Day ${i + 1}`,
                          Revenue: dayPayments,
                          Expenses: dayExpenses
                        };
                      }).filter(d => d.Revenue > 0 || d.Expenses > 0);
                    } else {
                      const monthsNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      chartData = monthsNames.map((name, index) => {
                        const monthNum = String(index + 1).padStart(2, "0");
                        const monthPrefix = `${selectedReportYear}-${monthNum}`;
                        const monthPayments = filteredPaymentsForReport.filter(p => p.date.startsWith(monthPrefix)).reduce((sum, p) => sum + p.netPaid, 0);
                        const monthExpenses = filteredExpensesForReport.filter(e => e.date.startsWith(monthPrefix)).reduce((sum, e) => sum + e.amount, 0);
                        return {
                          name,
                          Revenue: monthPayments,
                          Expenses: monthExpenses
                        };
                      });
                    }

                    if (chartData.length === 0 || (reportType === "monthly" && chartData.length === 0)) {
                      return (
                        <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                          No transactions recorded during this cycle to graph.
                        </div>
                      );
                    }

                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800/40" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ 
                              background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
                              borderColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#e2e8f0',
                              color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a',
                              borderRadius: '8px',
                              fontSize: '11px'
                            }} 
                          />
                          <Bar dataKey="Revenue" fill="#10b981" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
              </div>

              {/* Analytical Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Revenue Breakdown */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800">
                  <h3 className="font-display font-bold text-xs text-slate-400 uppercase tracking-widest mb-4">
                    Inflow Channels Breakdown
                  </h3>
                  <div className="space-y-4 text-xs">
                    {["upi", "cash", "card", "bank_transfer"].map(method => {
                      const amount = reportRevenueByMethod[method] || 0;
                      const percentage = reportCollection > 0 ? (amount / reportCollection) * 100 : 0;
                      return (
                        <div key={method} className="space-y-1">
                          <div className="flex justify-between font-medium">
                            <span className="uppercase text-[10px] text-slate-500 font-bold">{method.replace("_", " ")}</span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {currencySymbol}{amount.toLocaleString()} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                method === "upi" ? "bg-indigo-500" :
                                method === "cash" ? "bg-emerald-500" :
                                method === "card" ? "bg-amber-500" : "bg-sky-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                    {reportCollection === 0 && (
                      <p className="text-slate-400 text-xs text-center py-6">No collections registered in this cycle.</p>
                    )}
                  </div>
                </div>

                {/* Operating Cost Breakdown */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800">
                  <h3 className="font-display font-bold text-xs text-slate-400 uppercase tracking-widest mb-4">
                    Operating Costs Breakdown
                  </h3>
                  <div className="space-y-4 text-xs">
                    {Object.keys(reportExpensesByCategory).length === 0 ? (
                      <p className="text-slate-400 text-xs text-center py-10">No operational expense reports cataloged.</p>
                    ) : (
                      Object.entries(reportExpensesByCategory).map(([cat, amount]) => {
                        const numericAmount = amount as number;
                        const percentage = reportExpenses > 0 ? (numericAmount / reportExpenses) * 100 : 0;
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between font-medium">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">{cat}</span>
                              <span className="text-slate-700 dark:text-slate-300">
                                {currencySymbol}{numericAmount.toLocaleString()} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-red-500 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Chronological Unified Cycle Ledger (Printable) */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-display font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                      Cycle Consolidated Ledger
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Unified chronological record of cash movements.</p>
                  </div>

                  <button
                    onClick={() => handleExport("Revenue")}
                    className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-900/30 px-3.5 py-1.5 rounded-lg transition"
                  >
                    <Printer className="h-4 w-4" /> Print Ledger
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold dark:bg-slate-950">
                        <th className="p-3 pl-5">DATE</th>
                        <th className="p-3">TRANSACTION TYPE</th>
                        <th className="p-3">PARTICULARS &amp; DESCRIPTION</th>
                        <th className="p-3">CHANNEL / CAT</th>
                        <th className="p-3 text-right pr-5">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(() => {
                        const ledgerItems = [
                          ...filteredPaymentsForReport.map(p => {
                            const stud = students.find(s => s.id === p.studentId);
                            return {
                              id: p.id,
                              type: "revenue" as const,
                              title: `Subscription: ${stud?.name || "Registered Student"}`,
                              subtitle: p.notes || `Receipt with code ${p.couponCode || "None"}`,
                              date: p.date,
                              amount: p.netPaid,
                              channel: p.method
                            };
                          }),
                          ...filteredExpensesForReport.map(e => ({
                            id: e.id,
                            type: "expense" as const,
                            title: e.title,
                            subtitle: e.description || "Operational charge",
                            date: e.date,
                            amount: e.amount,
                            channel: e.category
                          }))
                        ].sort((a, b) => b.date.localeCompare(a.date));

                        if (ledgerItems.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400">
                                No financial ledger entries found for the selected cycle.
                              </td>
                            </tr>
                          );
                        }

                        return ledgerItems.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                            <td className="p-3 pl-5 font-mono text-slate-500 whitespace-nowrap">{item.date}</td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                item.type === "revenue"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${item.type === "revenue" ? "bg-emerald-500" : "bg-red-500"}`}></span>
                                {item.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-slate-800 dark:text-slate-100 block">{item.title}</span>
                              <span className="text-[10px] text-slate-400">{item.subtitle}</span>
                            </td>
                            <td className="p-3">
                              <span className="text-[10px] uppercase font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {item.channel.replace("_", " ")}
                              </span>
                            </td>
                            <td className="p-3 text-right pr-5 whitespace-nowrap">
                              <span className={`font-bold ${item.type === "revenue" ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"}`}>
                                {item.type === "revenue" ? "+" : "-"}{currencySymbol}{item.amount.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* 8. AUDIT TRAILS TAB */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Workspace Audit Logs</h2>
                <p className="text-xs text-slate-500 mt-0.5">Log of administrative mutations and critical data actions.</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 max-h-[500px] overflow-y-auto space-y-4">
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No actions registered in audit logs yet.</p>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} className="flex gap-4 text-xs">
                      <div className="flex flex-col items-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-50"></div>
                        <div className="flex-1 w-0.5 bg-slate-100 mt-2"></div>
                      </div>
                      <div className="flex-1 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{log.action}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{log.timestamp.replace("T", " ").substring(0, 19)}</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5">{log.details}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                          Triggered by: {log.userName}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 9. WORKSPACE SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Workspace Settings</h2>
                <p className="text-xs text-slate-500 mt-0.5">Update organizational details, currencies, and silent center timings.</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 dark:bg-slate-900 dark:border-slate-800 max-w-xl">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await apiCall(`/api/organizations/${organization.id}`, "PUT", organization);
                    setOrganization(res);
                    Swal.fire({
                      icon: "success",
                      title: "Settings Updated",
                      text: "Reading room settings updated successfully!",
                      timer: 1800,
                      showConfirmButton: false,
                      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
                      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
                    });
                  } catch (err: any) {
                    Swal.fire({
                      icon: "error",
                      title: "Update Failed",
                      text: err.message,
                      background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
                      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
                    });
                  }
                }} className="space-y-4 text-xs">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Center Name</label>
                      <input
                        type="text"
                        required
                        value={organization.name}
                        onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Business Phone</label>
                      <input
                        type="text"
                        value={organization.phone}
                        onChange={(e) => setOrganization({ ...organization, phone: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Currency Code</label>
                      <input
                        type="text"
                        value={organization.currency}
                        onChange={(e) => setOrganization({ ...organization, currency: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Opening Time</label>
                      <input
                        type="text"
                        value={organization.openingTime}
                        onChange={(e) => setOrganization({ ...organization, openingTime: e.target.value })}
                        placeholder="06:00"
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Closing Time</label>
                      <input
                        type="text"
                        value={organization.closingTime}
                        onChange={(e) => setOrganization({ ...organization, closingTime: e.target.value })}
                        placeholder="23:00"
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Address Location</label>
                      <input
                        type="text"
                        value={organization.address}
                        onChange={(e) => setOrganization({ ...organization, address: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    Save Changes
                  </button>
                </form>
              </div>

              {/* SaaS Subscription Billing Panel */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 dark:bg-slate-900 dark:border-slate-800 max-w-xl shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4 dark:border-slate-800">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">SaaS Subscription &amp; Billing</h3>
                </div>

                {(() => {
                  const SAAS_PLANS_DATA = [
                    { id: "basic", name: "SaaS Basic Plan", price: 1500, maxStudents: 50, maxSeats: 30, features: ["Seat Allocation", "Basic Attendance", "Cash Payments"] },
                    { id: "standard", name: "SaaS Standard Plan", price: 3000, maxStudents: 150, maxSeats: 100, features: ["AC/Non-AC Spaces", "QR Code Attendance", "UPI/Card Payments", "Basic Reports"] },
                    { id: "premium", name: "SaaS Premium Plan", price: 6000, maxStudents: 500, maxSeats: 400, features: ["Unlimited Rooms", "Student ID Generator", "Receipt Printers", "Advanced Analytics", "Audit Timelines"] }
                  ];

                  const currentPlanId = organization.planId || "basic";
                  const currentPlan = SAAS_PLANS_DATA.find(p => p.id === currentPlanId) || SAAS_PLANS_DATA[0];

                  const studentUsagePercent = Math.min(100, Math.round((students.length / currentPlan.maxStudents) * 100));
                  const seatUsagePercent = Math.min(100, Math.round((seats.length / currentPlan.maxSeats) * 100));

                  return (
                    <div className="space-y-5 text-xs">
                      {/* Active subscription card */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Active Subscription</span>
                            <h4 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{currentPlan.name}</h4>
                            <p className="text-[11px] text-slate-500 mt-1">₹{currentPlan.price}/month billing cycle. Auto-renews next month.</p>
                          </div>
                          <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            Active
                          </span>
                        </div>

                        {/* Features chips */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {currentPlan.features.map(f => (
                            <span key={f} className="text-[9px] px-1.5 py-0.5 bg-slate-200/60 dark:bg-slate-800/80 rounded font-medium text-slate-600 dark:text-slate-300">
                              ✓ {f}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Usage meters */}
                      <div className="space-y-3.5">
                        <h5 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">Plan Quota Utilization</h5>
                        
                        {/* Student quota */}
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                            <span>Registered Students quota</span>
                            <span className="font-bold">{students.length} / {currentPlan.maxStudents} ({studentUsagePercent}%)</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${studentUsagePercent}%` }} 
                              className={`h-full rounded-full transition-all duration-500 ${
                                studentUsagePercent > 90 ? "bg-rose-500" : studentUsagePercent > 75 ? "bg-amber-500" : "bg-indigo-600"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Seats quota */}
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                            <span>Interactive Cabin Seats quota</span>
                            <span className="font-bold">{seats.length} / {currentPlan.maxSeats} ({seatUsagePercent}%)</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${seatUsagePercent}%` }} 
                              className={`h-full rounded-full transition-all duration-500 ${
                                seatUsagePercent > 90 ? "bg-rose-500" : seatUsagePercent > 75 ? "bg-amber-500" : "bg-indigo-600"
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Upgrade Subscription Section */}
                      <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Change Subscription Plan</label>
                        <div className="flex gap-3">
                          <select 
                            id="saas-plan-select"
                            defaultValue={currentPlanId}
                            onChange={(e) => {
                              const planVal = e.target.value;
                              (window as any)._selectedSaaSPlan = planVal;
                            }}
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                          >
                            {SAAS_PLANS_DATA.map(p => (
                              <option key={p.id} value={p.id} disabled={p.id === currentPlanId}>
                                {p.name} (Max {p.maxStudents} Students, {p.maxSeats} Seats) - ₹{p.price}/mo {p.id === currentPlanId ? "— (Current)" : ""}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={async () => {
                              const selectEl = document.getElementById("saas-plan-select") as HTMLSelectElement;
                              const targetPlanId = selectEl?.value || (window as any)._selectedSaaSPlan || currentPlanId;
                              if (targetPlanId === currentPlanId) {
                                Swal.fire({ icon: "info", title: "Select a different plan", text: "Please select a different SaaS plan to upgrade/downgrade." });
                                return;
                              }

                              const targetPlan = SAAS_PLANS_DATA.find(p => p.id === targetPlanId)!;

                              const result = await Swal.fire({
                                title: "Confirm Subscription Change",
                                html: `Are you sure you want to change your SaaS plan to <strong>${targetPlan.name}</strong>?<br/><br/><span class="text-xs text-slate-500">Your account will be instantly scaled. Limits will be adjusted to ${targetPlan.maxStudents} students and ${targetPlan.maxSeats} seats.</span>`,
                                icon: "question",
                                showCancelButton: true,
                                confirmButtonText: "Confirm Change",
                                confirmButtonColor: "#4f46e5"
                              });

                              if (result.isConfirmed) {
                                try {
                                  const res = await apiCall("/api/saas/upgrade", "POST", { planId: targetPlanId });
                                  if (res.success) {
                                    setOrganization({ ...organization, planId: targetPlanId });
                                    Swal.fire({
                                      icon: "success",
                                      title: "Subscription Upgraded",
                                      text: `Congratulations! Your workspace has been successfully migrated to the ${targetPlan.name}.`,
                                      timer: 3000
                                    });
                                  }
                                } catch (err: any) {
                                  Swal.fire({ icon: "error", title: "Action Failed", text: err.message || "Failed to upgrade subscription." });
                                }
                              }
                            }}
                            className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 transition"
                          >
                            Change Plan
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === "whatsapp" && currentUser.role !== "RECEPTIONIST" && (
            <div className="space-y-6 animate-fade-in text-xs">
              <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">WhatsApp &amp; Subscription Renewal Center</h2>
                <p className="text-xs text-slate-500 mt-0.5">Automate student alerts, process membership renewals via student notes, and configure WhatsApp templates.</p>
              </div>

              {loadingWhatsApp && !whatsappConfig ? (
                <div className="flex items-center justify-center p-12">
                  <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
                  <span className="ml-3 text-sm text-slate-500 font-medium">Downloading notification matrices...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Controls Column */}
                  <div className="lg:col-span-7 space-y-6">
                    
                    {/* Sandbox / Manual Renewal Trigger */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
                      <div className="flex items-center gap-2 mb-3">
                        <RefreshCw className="h-4 w-4 text-indigo-600" />
                        <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">
                          Automated Expiry &amp; Renewal Engine
                        </h3>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mb-4 leading-normal">
                        This scanner automatically checks active memberships. It warns students 3 days before expiration, and processes **automatic renewals** if their notes contain <code className="bg-slate-50 border px-1.5 py-0.5 rounded text-indigo-600 font-mono text-[10px]">auto-renew</code> or <code className="bg-slate-50 border px-1.5 py-0.5 rounded text-indigo-600 font-mono text-[10px]">upsc</code>.
                      </p>

                      <div className="flex flex-wrap items-end gap-3 p-3.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 mb-4">
                        <div className="flex-1 min-w-[150px]">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Simulated Process Date</label>
                          <input
                            type="date"
                            value={simulatedDateStr}
                            onChange={(e) => setSimulatedDateStr(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white dark:border-slate-800 dark:bg-slate-900"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={triggeringRenewals}
                          onClick={handleTriggerRenewals}
                          className="rounded-lg bg-indigo-600 text-white font-semibold text-xs px-4 py-2 hover:bg-indigo-700 disabled:opacity-50 transition inline-flex items-center gap-1.5"
                        >
                          {triggeringRenewals ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              <span>Scanning active database...</span>
                            </>
                          ) : (
                            <>
                              <Activity className="h-3.5 w-3.5" />
                              <span>Trigger Renewal Check Now</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Display Results */}
                      {renewalResults && (
                        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-lg space-y-3">
                          <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 text-xs flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            Renewal Engine Summary ({renewalResults.simulatedDate})
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                            <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Checked</span>
                              <span className="text-base font-bold text-slate-800 dark:text-slate-100">{renewalResults.totalMembershipsChecked}</span>
                            </div>
                            <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] text-emerald-500 uppercase tracking-wider block">Auto-Renewed</span>
                              <span className="text-base font-bold text-emerald-600">{renewalResults.autoRenewedCount}</span>
                            </div>
                            <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] text-amber-500 uppercase tracking-wider block">Expiry Alerts</span>
                              <span className="text-base font-bold text-amber-600">{renewalResults.warnAlertsSent}</span>
                            </div>
                            <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] text-rose-500 uppercase tracking-wider block">Expired Plans</span>
                              <span className="text-base font-bold text-rose-600">{renewalResults.expiredCount}</span>
                            </div>
                          </div>

                          {renewalResults.renewedItems && renewalResults.renewedItems.length > 0 && (
                            <div className="pt-2 border-t border-indigo-100/50 dark:border-indigo-900/40">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Newly Activated Memberships:</span>
                              <div className="space-y-1 text-[10px] text-slate-600 dark:text-slate-400 max-h-[120px] overflow-y-auto font-mono">
                                {renewalResults.renewedItems.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between p-1 bg-white dark:bg-slate-900/50 rounded animate-fade-in">
                                    <span>👤 {item.studentName} ({item.planName})</span>
                                    <span className="text-emerald-500 font-bold">Renewed to {item.endDate}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* API Configuration */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <SettingsIcon className="h-4 w-4 text-indigo-600" />
                          <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">
                            WhatsApp Notification Gateway settings
                          </h3>
                        </div>
                        {whatsappConfig && (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={whatsappConfig.enabled}
                              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, enabled: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                            <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {whatsappConfig.enabled ? "ACTIVE" : "PAUSED"}
                            </span>
                          </label>
                        )}
                      </div>

                      {whatsappConfig && (
                        <form onSubmit={handleSaveWhatsAppConfig} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">WhatsApp Cloud API Endpoint URL</label>
                              <input
                                type="text"
                                value={whatsappConfig.apiUrl}
                                onChange={(e) => setWhatsappConfig({ ...whatsappConfig, apiUrl: e.target.value })}
                                placeholder="https://graph.facebook.com/v19.0"
                                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950 animate-fade-in"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Auth Token Key</label>
                              <input
                                type="password"
                                value={whatsappConfig.apiToken}
                                onChange={(e) => setWhatsappConfig({ ...whatsappConfig, apiToken: e.target.value })}
                                placeholder="EAAGx..."
                                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950 animate-fade-in"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone Number ID</label>
                              <input
                                type="text"
                                value={whatsappConfig.phoneId}
                                onChange={(e) => setWhatsappConfig({ ...whatsappConfig, phoneId: e.target.value })}
                                placeholder="2405021..."
                                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950 animate-fade-in"
                              />
                            </div>
                          </div>

                          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2 animate-fade-in">
                            <h4 className="font-display text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
                              Alert Content templates
                            </h4>
                            <p className="text-[10px] text-slate-400 mb-3 leading-normal">
                              The system dynamically crafts alerts using custom placeholders. Available tags: <code className="bg-slate-100 dark:bg-slate-900 text-indigo-500 font-mono font-semibold px-1 py-0.5 rounded">{"{name}"}</code>, <code className="bg-slate-100 dark:bg-slate-900 text-indigo-500 font-mono font-semibold px-1 py-0.5 rounded">{"{org_name}"}</code>, <code className="bg-slate-100 dark:bg-slate-900 text-indigo-500 font-mono font-semibold px-1 py-0.5 rounded">{"{end_date}"}</code>, <code className="bg-slate-100 dark:bg-slate-900 text-indigo-500 font-mono font-semibold px-1 py-0.5 rounded">{"{seat_number}"}</code>, <code className="bg-slate-100 dark:bg-slate-900 text-indigo-500 font-mono font-semibold px-1 py-0.5 rounded">{"{amount}"}</code>, <code className="bg-slate-100 dark:bg-slate-900 text-indigo-500 font-mono font-semibold px-1 py-0.5 rounded">{"{currency}"}</code>, <code className="bg-slate-100 dark:bg-slate-900 text-indigo-500 font-mono font-semibold px-1 py-0.5 rounded">{"{plan_name}"}</code>.
                            </p>

                            <div className="space-y-3.5">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Welcome &amp; Seat Assigned Template</label>
                                <textarea
                                  value={whatsappConfig.templates.welcome}
                                  onChange={(e) => setWhatsappConfig({
                                    ...whatsappConfig,
                                    templates: { ...whatsappConfig.templates, welcome: e.target.value }
                                  })}
                                  rows={3}
                                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950 font-sans leading-normal"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Expiry Warning Notification Template (3 Days Left)</label>
                                <textarea
                                  value={whatsappConfig.templates.expiryWarn}
                                  onChange={(e) => setWhatsappConfig({
                                    ...whatsappConfig,
                                    templates: { ...whatsappConfig.templates, expiryWarn: e.target.value }
                                  })}
                                  rows={3}
                                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950 font-sans leading-normal"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Automatic Renewal Success Template</label>
                                <textarea
                                  value={whatsappConfig.templates.renewalSuccess}
                                  onChange={(e) => setWhatsappConfig({
                                    ...whatsappConfig,
                                    templates: { ...whatsappConfig.templates, renewalSuccess: e.target.value }
                                  })}
                                  rows={3}
                                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950 font-sans leading-normal"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Receipt &amp; Activation Template</label>
                                <textarea
                                  value={whatsappConfig.templates.paymentReceipt}
                                  onChange={(e) => setWhatsappConfig({
                                    ...whatsappConfig,
                                    templates: { ...whatsappConfig.templates, paymentReceipt: e.target.value }
                                  })}
                                  rows={3}
                                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950 font-sans leading-normal"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button
                              type="submit"
                              disabled={loadingWhatsApp}
                              className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 transition"
                            >
                              Save WhatsApp Settings
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Right Column (Dispatch History & Sandbox Test) */}
                  <div className="lg:col-span-5 space-y-6">
                    
                    {/* Sandbox Alert Tester */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
                      <div className="flex items-center gap-2 mb-3">
                        <Plus className="h-4 w-4 text-indigo-600" />
                        <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">
                          WhatsApp Sandbox Alert Tester
                        </h3>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mb-4 leading-normal">
                        Simulate custom messages to evaluate the live WhatsApp delivery agent. No physical API units are consumed in trial mode.
                      </p>

                      <form onSubmit={handleSendTestWhatsApp} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Recipient Phone Number</label>
                          <input
                            type="text"
                            required
                            value={testForm.phone}
                            onChange={(e) => setTestForm({ ...testForm, phone: e.target.value })}
                            placeholder="+91 99999 88888"
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Notification Category</label>
                          <select
                            value={testForm.type}
                            onChange={(e) => setTestForm({ ...testForm, type: e.target.value as any })}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                          >
                            <option value="welcome">Welcome Alert</option>
                            <option value="expiryWarn">Expiry Warn (3 Days)</option>
                            <option value="renewalSuccess">Renewal Success</option>
                            <option value="paymentReceipt">Payment Receipt</option>
                            <option value="custom">Custom Arbitrary message</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Alert Message Copy</label>
                          <textarea
                            required
                            value={testForm.message}
                            onChange={(e) => setTestForm({ ...testForm, message: e.target.value })}
                            placeholder="Hello student, welcome to your silent center workspace!"
                            rows={3}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950 font-sans leading-normal"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={loadingWhatsApp}
                          className="w-full rounded-lg border border-slate-200 bg-white font-semibold text-xs px-3.5 py-2 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Dispatch Test Alert</span>
                        </button>
                      </form>
                    </div>

                    {/* Dispatch History Logs */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 shadow-xs flex flex-col">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-indigo-600" />
                          <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">
                            WhatsApp Notification History
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                          {whatsappLogs.length} Sent
                        </span>
                      </div>

                      <div className="max-h-[500px] overflow-y-auto space-y-3.5 pr-1">
                        {whatsappLogs.length === 0 ? (
                          <div className="text-center py-10 text-slate-400 space-y-2">
                            <MessageSquare className="h-8 w-8 mx-auto stroke-1" />
                            <p className="text-xs">No WhatsApp messages dispatched yet.</p>
                          </div>
                        ) : (
                          [...whatsappLogs].sort((a,b) => b.timestamp.localeCompare(a.timestamp)).map((log) => (
                            <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg space-y-1.5 animate-fade-in">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {log.studentName || "Tester"} ({log.phone})
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {log.timestamp.replace("T", " ").substring(0, 16)}
                                </span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed break-words italic bg-white dark:bg-slate-900 p-2 rounded border border-slate-100/50 dark:border-slate-800/50">
                                "{log.message}"
                              </p>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                                  🏷️ {log.type.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wide text-[9px]">
                                  <CheckCircle className="h-3 w-3" />
                                  {log.status}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* =========================================================
          MODALS & FORM REGISTERS
          ========================================================= */}

      {/* Register Student Modal */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">
                {editingStudentId ? "Edit Student Profile" : "Register New Student Profile"}
              </h3>
              <button onClick={closeStudentModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateStudent} className="overflow-y-auto p-6 space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                    <span className="font-bold text-xs text-slate-500 uppercase">Student Photo Identification</span>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => { stopCamera(); setPhotoMode("upload"); }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium ${
                          photoMode === "upload"
                            ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300"
                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                      >
                        <Upload className="h-3 w-3" />
                        <span>Upload File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPhotoMode("camera"); startCamera(); }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium ${
                          photoMode === "camera"
                            ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300"
                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                      >
                        <Camera className="h-3 w-3" />
                        <span>Live Snap</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { stopCamera(); setPhotoMode("url"); }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium ${
                          photoMode === "url"
                            ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300"
                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                      >
                        <Link className="h-3 w-3" />
                        <span>Photo URL</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Left: Interactive Interface / Controls */}
                    <div className="md:col-span-8">
                      {photoMode === "upload" && (
                        <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-900 text-center hover:bg-indigo-50/10 transition cursor-pointer relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                          />
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <Upload className="h-6 w-6 text-indigo-500" />
                            <p className="font-bold text-xs text-slate-600 dark:text-slate-300">Drag &amp; drop or click to select image</p>
                            <p className="text-[10px] text-slate-400">Supports PNG, JPG (Max 5MB)</p>
                          </div>
                        </div>
                      )}

                      {photoMode === "camera" && (
                        <div className="space-y-2">
                          {cameraActive ? (
                            <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-black aspect-video flex items-center justify-center">
                              <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                              />
                              {/* Overlay Target Guidelines */}
                              <div className="absolute inset-0 border-2 border-indigo-500/20 pointer-events-none flex items-center justify-center">
                                <div className="border-2 border-dashed border-indigo-500/40 rounded-full w-24 h-24 md:w-32 md:h-32" />
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={startCamera}
                              className="w-full py-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-1.5 hover:bg-indigo-50/20 text-indigo-600 transition"
                            >
                              <Camera className="h-6 w-6" />
                              <span className="font-bold text-xs">Enable Webcam &amp; Camera Feed</span>
                            </button>
                          )}

                          {cameraError ? (
                            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 space-y-1 dark:bg-rose-950/20 dark:border-rose-900/40">
                              <p className="text-[10px] font-semibold flex items-center gap-1">
                                <span>⚠️ Camera Error:</span>
                              </p>
                              <p className="text-[10px] leading-relaxed">
                                {cameraError}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                *Note: Most browsers block camera access inside nested sandboxed frames. Opening the app in a separate browser tab resolves this immediately.
                              </p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400">
                              💡 <strong>Tip:</strong> If your browser blocks webcam access inside the embedded AI Studio panel, please open the application in a <strong>New Tab</strong> via the icon on the upper right to enable your camera.
                            </p>
                          )}

                          {cameraActive && (
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={stopCamera}
                                className="px-3 py-1.5 rounded-lg border text-slate-500 hover:bg-slate-100 dark:border-slate-800"
                              >
                                Stop Camera
                              </button>
                              <button
                                type="button"
                                onClick={handleCapturePhoto}
                                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-xs"
                              >
                                <Camera className="h-3.5 w-3.5" />
                                <span>Snap Photo</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {photoMode === "url" && (
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Image Address URL</label>
                          <input
                            type="text"
                            value={studentForm.photo}
                            onChange={(e) => setStudentForm({ ...studentForm, photo: e.target.value })}
                            placeholder="https://images.unsplash.com/photo-..."
                            className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-white dark:border-slate-800 dark:bg-slate-900"
                          />
                        </div>
                      )}
                    </div>

                    {/* Right: Instant High-Fidelity Circle Preview */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-3 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg">
                      {studentForm.photo ? (
                        <div className="relative group w-20 h-20 rounded-full border-2 border-indigo-600/30 overflow-hidden shadow-xs">
                          <img
                            src={studentForm.photo}
                            alt="Student preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setStudentForm(prev => ({ ...prev, photo: "" }))}
                            className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                          <Image className="h-5 w-5 stroke-1" />
                          <span className="text-[8px] uppercase mt-1">No Image</span>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 mt-2 font-medium">Live ID Preview</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    placeholder="Aditya Verma"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={studentForm.phone}
                    onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                    placeholder="+91 90123 45678"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={studentForm.dob}
                    onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Emergency No / Parent Phone</label>
                  <input
                    type="text"
                    value={studentForm.parentPhone}
                    onChange={(e) => setStudentForm({ ...studentForm, parentPhone: e.target.value })}
                    placeholder="+91 90123 45670"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Govt ID Proof Type</label>
                  <select
                    value={studentForm.govIdType}
                    onChange={(e) => setStudentForm({ ...studentForm, govIdType: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Student Card">College ID Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Govt ID Number</label>
                  <input
                    type="text"
                    value={studentForm.govIdNumber}
                    onChange={(e) => setStudentForm({ ...studentForm, govIdNumber: e.target.value })}
                    placeholder="5544-2211-9988"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">School / College Name</label>
                  <input
                    type="text"
                    value={studentForm.college}
                    onChange={(e) => setStudentForm({ ...studentForm, college: e.target.value })}
                    placeholder="Delhi University"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Course Stream</label>
                  <input
                    type="text"
                    value={studentForm.course}
                    onChange={(e) => setStudentForm({ ...studentForm, course: e.target.value })}
                    placeholder="B.Com (Hons)"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Time Batch</label>
                  <input
                    type="text"
                    value={studentForm.batch}
                    onChange={(e) => setStudentForm({ ...studentForm, batch: e.target.value })}
                    placeholder="Morning (6 AM - 2 PM)"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Enrollment Status</label>
                  <select
                    value={studentForm.status}
                    onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950 font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="active">Active (Enrolled)</option>
                    <option value="inactive">Inactive / Archived</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeStudentModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStudent}
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {submittingStudent ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{editingStudentId ? "Saving..." : "Registering..."}</span>
                    </>
                  ) : (
                    <span>{editingStudentId ? "Save Changes" : "Complete Registration"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Membership Pass modal */}
      {isMembershipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">
                {editingMembershipId ? "Edit Subscription Pass" : "Purchase Membership & Seat Pass"}
              </h3>
              <button onClick={() => { setIsMembershipModalOpen(false); setEditingMembershipId(null); }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateMembership} className="overflow-y-auto p-6 space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-2 gap-4">
                
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Select Registered Student *</label>
                  <select
                    required
                    disabled={!!editingMembershipId}
                    value={membershipForm.studentId}
                    onChange={(e) => setMembershipForm({ ...membershipForm, studentId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950 disabled:opacity-75"
                  >
                    <option value="">Choose student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.studentId}) {s.status !== "active" ? `[${s.status.toUpperCase()}]` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Choose Membership Plan *</label>
                  <select
                    required
                    value={membershipForm.planId}
                    onChange={(e) => {
                      const selectedPlan = plans.find(p => p.id === e.target.value);
                      setMembershipForm({
                        ...membershipForm,
                        planId: e.target.value,
                        paidAmount: selectedPlan ? selectedPlan.price.toString() : ""
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="">Choose plan pass...</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({currencySymbol}{p.price})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Assign Study Cubicle Seat</label>
                  <select
                    disabled={!!editingMembershipId}
                    value={membershipForm.assignSeatId}
                    onChange={(e) => setMembershipForm({ ...membershipForm, assignSeatId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950 disabled:opacity-75"
                  >
                    <option value="">Keep unassigned...</option>
                    {seats.filter(s => s.status === 'available').map(s => (
                      <option key={s.id} value={s.id}>{s.seatNumber} ({s.type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Start Active Date *</label>
                  <input
                    type="date"
                    required
                    value={membershipForm.startDate}
                    onChange={(e) => setMembershipForm({ ...membershipForm, startDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>

                {editingMembershipId ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">End Active Date *</label>
                      <input
                        type="date"
                        required
                        value={membershipForm.endDate}
                        onChange={(e) => setMembershipForm({ ...membershipForm, endDate: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Subscription Status *</label>
                      <select
                        value={membershipForm.status}
                        onChange={(e) => setMembershipForm({ ...membershipForm, status: e.target.value as any })}
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                      >
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Coupon Code / Promo</label>
                      <input
                        type="text"
                        value={membershipForm.couponCode}
                        onChange={(e) => setMembershipForm({ ...membershipForm, couponCode: e.target.value })}
                        placeholder="SAVE200"
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Discount Amount</label>
                      <input
                        type="number"
                        value={membershipForm.discount}
                        onChange={(e) => setMembershipForm({ ...membershipForm, discount: e.target.value })}
                        placeholder="0"
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Received Payment *</label>
                  <input
                    type="number"
                    required
                    value={membershipForm.paidAmount}
                    onChange={(e) => setMembershipForm({ ...membershipForm, paidAmount: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Payment Method</label>
                  <select
                    disabled={!!editingMembershipId}
                    value={membershipForm.paymentMethod}
                    onChange={(e) => setMembershipForm({ ...membershipForm, paymentMethod: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950 disabled:opacity-75"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI (GPay/PhonePe)</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="bank_transfer">Net Banking</option>
                  </select>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsMembershipModalOpen(false); setEditingMembershipId(null); }}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMembership}
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {submittingMembership ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>{editingMembershipId ? "Save Changes" : "Collect Cash & Allocate Seat"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Expense modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">
                Log Workspace Expense
              </h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Expense Title / Item *</label>
                <input
                  type="text"
                  required
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  placeholder="AC Maintenance / Filter Switch"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Amount Spent *</label>
                  <input
                    type="number"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    placeholder="2500"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value="Utilities">Utilities (Electricity/Water)</option>
                  <option value="Maintenance">Maintenance &amp; Repairs</option>
                  <option value="Rent">Lease / Rent</option>
                  <option value="Supplies">Daily Supplies / Teabags</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {submittingExpense ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Record Ledger Expense</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Plan modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">
                {editingPlanId ? "Edit Membership Plan Pass" : "Create Membership Plan Pass"}
              </h3>
              <button onClick={() => { setIsPlanModalOpen(false); setEditingPlanId(null); }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePlan} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="Monthly Regular AC Pass"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Duration Days *</label>
                  <input
                    type="number"
                    required
                    value={planForm.durationDays}
                    onChange={(e) => setPlanForm({ ...planForm, durationDays: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Pricing Price *</label>
                  <input
                    type="number"
                    required
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Lounge Zone Type</label>
                  <select
                    value={planForm.seatType}
                    onChange={(e) => setPlanForm({ ...planForm, seatType: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="AC">AC Zone</option>
                    <option value="Non-AC">Non-AC standard</option>
                    <option value="Premium">Premium Cabin</option>
                    <option value="Window">Window Seat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Session Hours</label>
                  <input
                    type="text"
                    value={planForm.timing}
                    onChange={(e) => setPlanForm({ ...planForm, timing: e.target.value })}
                    placeholder="Full Day (6 AM - 11 PM)"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsPlanModalOpen(false); setEditingPlanId(null); }}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPlan}
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {submittingPlan ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <span>{editingPlanId ? "Save Changes" : "Publish Plan Pass"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Study Zone / Room */}
      {isAddRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                Create New Study Zone
              </h3>
              <button
                type="button"
                onClick={() => setIsAddRoomModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRoom} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Zone / Room Name *</label>
                <input
                  type="text"
                  required
                  value={roomNameInput}
                  onChange={(e) => setRoomNameInput(e.target.value)}
                  placeholder="e.g. Quiet Zone A, Silent Hall 2, Premium Lounge"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddRoomModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRoom}
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {submittingRoom ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Study Zone</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Single Desk */}
      {isAddSeatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Plus className="h-4 w-4 text-indigo-600" />
                Add Study Desk
              </h3>
              <button
                type="button"
                onClick={() => setIsAddSeatModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSingleSeat} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Study Zone / Room *</label>
                <select
                  required
                  value={seatForm.roomId || (rooms[0]?.id || "")}
                  onChange={(e) => setSeatForm({ ...seatForm, roomId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                >
                  {rooms.length === 0 && <option value="">Auto-create Default Study Hall</option>}
                  {rooms.map(rm => (
                    <option key={rm.id} value={rm.id}>{rm.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Desk Number *</label>
                  <input
                    type="text"
                    required
                    value={seatForm.seatNumber}
                    onChange={(e) => setSeatForm({ ...seatForm, seatNumber: e.target.value })}
                    placeholder="e.g. D-01"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-mono bg-slate-50 dark:border-slate-800 dark:bg-slate-950 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Desk Type</label>
                  <select
                    value={seatForm.type}
                    onChange={(e) => setSeatForm({ ...seatForm, type: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="AC">AC Zone</option>
                    <option value="Non-AC">Non-AC</option>
                    <option value="Premium">Premium Cabin</option>
                    <option value="Window">Window View</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Row Alignment</label>
                <input
                  type="text"
                  value={seatForm.row}
                  onChange={(e) => setSeatForm({ ...seatForm, row: e.target.value })}
                  placeholder="e.g. Row A, Left Wing"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Features / Notes</label>
                <textarea
                  rows={2}
                  value={seatForm.notes}
                  onChange={(e) => setSeatForm({ ...seatForm, notes: e.target.value })}
                  placeholder="e.g. Dedicated charging plug, reading light, ergonomic cushion"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddSeatModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSingleSeat}
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {submittingSingleSeat ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Desk</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Batch Generate Desks */}
      {isBatchSeatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Batch Desk Generator
              </h3>
              <button
                type="button"
                onClick={() => setIsBatchSeatModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleBatchCreateSeats} className="p-5 space-y-4 text-xs">
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Quickly generate a sequence of numbered desks (e.g. D-01 through D-24) mapped directly to your study hall.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Target Study Zone *</label>
                <select
                  required
                  value={batchSeatForm.roomId || (rooms[0]?.id || "")}
                  onChange={(e) => setBatchSeatForm({ ...batchSeatForm, roomId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                >
                  {rooms.length === 0 && <option value="">Auto-create Default Study Hall</option>}
                  {rooms.map(rm => (
                    <option key={rm.id} value={rm.id}>{rm.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Prefix</label>
                  <input
                    type="text"
                    value={batchSeatForm.prefix}
                    onChange={(e) => setBatchSeatForm({ ...batchSeatForm, prefix: e.target.value })}
                    placeholder="D-"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono bg-slate-50 dark:border-slate-800 dark:bg-slate-950 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Start No.</label>
                  <input
                    type="number"
                    min={1}
                    value={batchSeatForm.startNumber}
                    onChange={(e) => setBatchSeatForm({ ...batchSeatForm, startNumber: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Total Desks</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={batchSeatForm.count}
                    onChange={(e) => setBatchSeatForm({ ...batchSeatForm, count: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono bg-slate-50 dark:border-slate-800 dark:bg-slate-950 font-bold text-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Desk Type</label>
                  <select
                    value={batchSeatForm.type}
                    onChange={(e) => setBatchSeatForm({ ...batchSeatForm, type: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="AC">AC Zone</option>
                    <option value="Non-AC">Non-AC</option>
                    <option value="Premium">Premium Cabin</option>
                    <option value="Window">Window View</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Row Alignment</label>
                  <input
                    type="text"
                    value={batchSeatForm.row}
                    onChange={(e) => setBatchSeatForm({ ...batchSeatForm, row: e.target.value })}
                    placeholder="Row A"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Features / Notes</label>
                <textarea
                  rows={2}
                  value={batchSeatForm.notes}
                  onChange={(e) => setBatchSeatForm({ ...batchSeatForm, notes: e.target.value })}
                  placeholder="Features included with these desks..."
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 text-[11px] text-indigo-800 dark:text-indigo-300">
                Preview: Will generate desks from <strong className="font-mono">{batchSeatForm.prefix}{String(batchSeatForm.startNumber).padStart(2, '0')}</strong> to <strong className="font-mono">{batchSeatForm.prefix}{String(batchSeatForm.startNumber + Number(batchSeatForm.count) - 1).padStart(2, '0')}</strong> ({batchSeatForm.count} desks).
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBatchSeatModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBatchSeat}
                  className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {submittingBatchSeat ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Generating Desks...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 text-amber-300" />
                      <span>Generate {batchSeatForm.count} Desks</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Student to Desk */}
      {isAssignSeatModalOpen && selectedSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <div>
                <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-indigo-600" />
                  Assign Desk {selectedSeat.seatNumber}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Allocate this {selectedSeat.type} desk to an enrolled student.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignSeatModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAssignStudentToSeat} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Select Student *</label>
                <select
                  required
                  value={assignStudentId}
                  onChange={(e) => setAssignStudentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950 font-medium"
                >
                  <option value="">Select an enrolled student...</option>
                  {students.filter(s => s.status === 'active').map(s => {
                    const existingSeat = seats.find(st => st.assignedStudentId === s.id);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.studentId}) {existingSeat ? `[Already on ${existingSeat.seatNumber}]` : "[No Desk]"}
                      </option>
                    );
                  })}
                </select>
                {students.filter(s => s.status === 'active').length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No active students enrolled yet. Add students in the Students tab first.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignSeatModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!assignStudentId || submittingAssignSeat}
                  className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {submittingAssignSeat ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Allocating Desk...</span>
                    </>
                  ) : (
                    <span>Confirm Allocation</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Desk */}
      {isEditSeatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Edit className="h-4 w-4 text-indigo-600" />
                Edit Desk {editSeatForm.seatNumber}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditSeatModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditSeatSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Desk Number *</label>
                  <input
                    type="text"
                    required
                    value={editSeatForm.seatNumber}
                    onChange={(e) => setEditSeatForm({ ...editSeatForm, seatNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-mono bg-slate-50 dark:border-slate-800 dark:bg-slate-950 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Status</label>
                  <select
                    value={editSeatForm.status}
                    onChange={(e) => setEditSeatForm({ ...editSeatForm, status: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Desk Type</label>
                  <select
                    value={editSeatForm.type}
                    onChange={(e) => setEditSeatForm({ ...editSeatForm, type: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="AC">AC Zone</option>
                    <option value="Non-AC">Non-AC</option>
                    <option value="Premium">Premium Cabin</option>
                    <option value="Window">Window View</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Row Alignment</label>
                  <input
                    type="text"
                    value={editSeatForm.row}
                    onChange={(e) => setEditSeatForm({ ...editSeatForm, row: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Features / Notes</label>
                <textarea
                  rows={2}
                  value={editSeatForm.notes}
                  onChange={(e) => setEditSeatForm({ ...editSeatForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditSeatModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEditSeat}
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {submittingEditSeat ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice & Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        payment={selectedPayment}
        student={selectedStudent}
        invoice={selectedInvoice}
        organization={organization}
      />

      {/* Student ID Badge Badge Generator */}
      <IDCardGenerator
        isOpen={isIDCardOpen}
        onClose={() => setIsIDCardOpen(false)}
        student={selectedStudent}
        organization={organization}
      />

    </div>
  );
};
