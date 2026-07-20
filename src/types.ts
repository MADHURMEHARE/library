/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "SUPER_ADMIN" | "ORG_ADMIN" | "RECEPTIONIST";

export interface Organization {
  id: string;
  name: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  openingTime: string;
  closingTime: string;
  currency: string;
  timezone: string;
  status: "active" | "suspended";
  planId: string; // "basic" | "standard" | "premium"
  createdAt: string;
}

export interface User {
  id: string;
  orgId: string | null;
  email: string;
  passwordHash?: string;
  name: string;
  role: UserRole;
  phone: string;
  status: "active" | "inactive";
  emailVerified: boolean;
  createdAt: string;
}

export interface Student {
  id: string;
  orgId: string;
  studentId: string; // e.g. STUD-1001
  name: string;
  gender: "male" | "female" | "other";
  dob: string;
  phone: string;
  parentPhone: string;
  email: string;
  address: string;
  emergencyContact: string;
  govIdType: string; // "Aadhaar", "Passport", "Driving License", "Other"
  govIdNumber: string;
  photo: string;
  notes: string;
  college: string;
  course: string;
  year: string;
  batch: string;
  joinDate: string;
  qrCode: string; // text representation
  status: "active" | "inactive" | "expired";
  createdAt: string;
}

export interface MembershipPlan {
  id: string;
  orgId: string;
  name: string;
  durationType: "daily" | "weekly" | "monthly" | "quarterly" | "half-yearly" | "annual" | "custom";
  durationDays: number;
  price: number;
  seatType: "AC" | "Non-AC" | "Premium" | "Window";
  timing: string;
  description: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Membership {
  id: string;
  orgId: string;
  studentId: string;
  planId: string;
  startDate: string;
  endDate: string;
  price: number;
  paidAmount: number;
  status: "active" | "paused" | "expired" | "cancelled";
  createdAt: string;
}

export interface Building {
  id: string;
  orgId: string;
  name: string;
  createdAt: string;
}

export interface Floor {
  id: string;
  orgId: string;
  buildingId: string;
  name: string;
  createdAt: string;
}

export interface Room {
  id: string;
  orgId: string;
  floorId: string;
  name: string;
  createdAt: string;
}

export interface Seat {
  id: string;
  orgId: string;
  roomId: string;
  seatNumber: string;
  type: "AC" | "Non-AC" | "Premium" | "Window";
  status: "available" | "occupied" | "reserved" | "maintenance";
  assignedStudentId: string | null;
  notes: string;
  row: string;
  createdAt: string;
}

export interface SeatAssignmentHistory {
  id: string;
  orgId: string;
  seatId: string;
  studentId: string;
  action: "assign" | "release" | "transfer";
  targetSeatId: string | null;
  timestamp: string;
}

export interface Attendance {
  id: string;
  orgId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string | null;
  checkOutTime: string | null;
  method: "manual" | "qr";
  status: "present" | "absent";
}

export interface Payment {
  id: string;
  orgId: string;
  studentId: string;
  membershipId: string;
  amount: number;
  discount: number;
  couponCode: string;
  netPaid: number;
  balance: number;
  method: "cash" | "upi" | "card" | "bank_transfer";
  notes: string;
  date: string;
  status: "paid" | "partial" | "refunded";
  createdAt: string;
}

export interface Invoice {
  id: string;
  orgId: string;
  paymentId: string;
  invoiceNumber: string;
  receiptNumber: string;
  issuedAt: string;
}

export interface Notification {
  id: string;
  orgId: string;
  title: string;
  message: string;
  type: "expiry" | "payment" | "welcome" | "reminder";
  status: "unread" | "sent";
  studentId: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  orgId: string | null;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Announcement {
  id: string;
  orgId: string | null;
  title: string;
  content: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  orgId: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  description: string;
}

export interface SaaSPlan {
  id: string;
  name: string;
  price: number;
  maxStudents: number;
  maxSeats: number;
  features: string[];
}

export interface WhatsAppConfig {
  id: string;
  orgId: string;
  enabled: boolean;
  provider: "twilio" | "meta" | "sandbox";
  apiKey: string;
  phoneId: string;
  senderNumber: string;
  templates: {
    welcome: string;
    upcomingRenewal: string;
    expiredAlert: string;
    paymentReceipt: string;
  };
  triggerDaysBefore: number;
}

export interface WhatsAppLog {
  id: string;
  orgId: string;
  studentId: string;
  studentName: string;
  phone: string;
  type: "welcome" | "upcomingRenewal" | "expiredAlert" | "paymentReceipt";
  message: string;
  status: "sent" | "delivered" | "failed";
  errorMessage?: string;
  timestamp: string;
}

