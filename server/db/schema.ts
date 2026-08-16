import { ObjectId } from "mongodb";
import {
  Organization,
  User,
  Student,
  MembershipPlan,
  Membership,
  Building,
  Floor,
  Room,
  Seat,
  SeatAssignmentHistory,
  Attendance,
  Payment,
  Invoice,
  Notification,
  AuditLog,
  Announcement,
  Expense,
  WhatsAppConfig,
  WhatsAppLog
} from "../../src/types";

/**
 * Multi-Tenant MongoDB Collection Schemas & Model Definitions for StudySphere
 * Every tenant-specific collection explicitly indexes and scopes by `organizationId`.
 */

export interface BaseDoc {
  _id?: string | ObjectId;
  id: string;
  createdAt: string;
  updatedAt?: string;
}

// 1. Organizations Collection
export interface OrganizationDoc extends BaseDoc {
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
  planId: string;
}

// 2. Users Collection (Platform Admins & Reading Room Staff)
export interface UserDoc extends BaseDoc {
  organizationId: string | null; // null for platform SUPER_ADMIN
  orgId: string | null;          // compatibility alias
  email: string;
  passwordHash?: string;
  name: string;
  role: "SUPER_ADMIN" | "ORG_ADMIN" | "RECEPTIONIST";
  phone: string;
  status: "active" | "inactive";
  emailVerified: boolean;
}

// 3. Students Collection
export interface StudentDoc extends BaseDoc {
  organizationId: string;
  orgId: string;
  studentId: string; // Unique within organization, e.g. STUD-1001
  name: string;
  gender: "male" | "female" | "other";
  dob: string;
  phone: string;
  parentPhone: string;
  email: string;
  address: string;
  emergencyContact: string;
  govIdType: string;
  govIdNumber: string;
  photo: string;
  notes: string;
  college: string;
  course: string;
  year: string;
  batch: string;
  joinDate: string;
  qrCode: string;
  status: "active" | "inactive" | "expired";
}

// 4. Membership Plans Collection
export interface MembershipPlanDoc extends BaseDoc {
  organizationId: string;
  orgId: string;
  name: string;
  durationType: "daily" | "weekly" | "monthly" | "quarterly" | "half-yearly" | "annual" | "custom";
  durationDays: number;
  price: number;
  seatType: "AC" | "Non-AC" | "Premium" | "Window";
  timing: string;
  description: string;
  status: "active" | "inactive";
}

// 5. Memberships Collection
export interface MembershipDoc extends BaseDoc {
  organizationId: string;
  orgId: string;
  studentId: string; // Ref -> students.id
  planId: string;    // Ref -> membershipPlans.id
  startDate: string;
  endDate: string;
  price: number;
  paidAmount: number;
  status: "active" | "paused" | "expired" | "cancelled";
}

// 6. Buildings Collection
export interface BuildingDoc extends BaseDoc {
  organizationId: string;
  orgId: string;
  name: string;
}

// 7. Floors Collection
export interface FloorDoc extends BaseDoc {
  organizationId: string;
  orgId: string;
  buildingId: string; // Ref -> buildings.id
  name: string;
}

// 8. Rooms Collection
export interface RoomDoc extends BaseDoc {
  organizationId: string;
  orgId: string;
  floorId: string;    // Ref -> floors.id
  name: string;
}

// 9. Seats Collection
export interface SeatDoc extends BaseDoc {
  organizationId: string;
  orgId: string;
  roomId: string;     // Ref -> rooms.id
  seatNumber: string; // e.g. S-01
  type: "AC" | "Non-AC" | "Premium" | "Window";
  status: "available" | "occupied" | "reserved" | "maintenance";
  assignedStudentId: string | null; // Ref -> students.id
  notes: string;
  row: string;
}

// 10. Seat History Collection
export interface SeatAssignmentHistoryDoc extends BaseDoc {
  organizationId: string;
  orgId: string;
  seatId: string;       // Ref -> seats.id
  studentId: string;    // Ref -> students.id
  action: "assign" | "release" | "transfer";
  targetSeatId: string | null; // Ref -> seats.id
  timestamp: string;
}

// 11. Attendances Collection
export interface AttendanceDoc extends BaseDoc {
  organizationId: string;
  orgId: string;
  studentId: string;    // Ref -> students.id
  date: string;         // YYYY-MM-DD
  checkInTime: string | null;
  checkOutTime: string | null;
  method: "manual" | "qr";
  status: "present" | "absent";
}

// 12. Payments Collection
export interface PaymentDoc extends BaseDoc {
  organizationId: string;
  orgId: string;
  studentId: string;    // Ref -> students.id
  membershipId: string; // Ref -> memberships.id
  amount: number;
  discount: number;
  couponCode: string;
  netPaid: number;
  balance: number;
  method: "cash" | "upi" | "card" | "bank_transfer";
  notes: string;
  date: string;
  status: "paid" | "partial" | "refunded";
}

// 13. Invoices Collection
export interface InvoiceDoc extends BaseDoc {
  organizationId: string;
  orgId: string;
  paymentId: string;    // Ref -> payments.id
  invoiceNumber: string;
  receiptNumber: string;
  issuedAt: string;
}

// 14. Notifications Collection
export interface NotificationDoc extends BaseDoc {
  organizationId: string;
  orgId: string;
  title: string;
  message: string;
  type: "expiry" | "payment" | "welcome" | "reminder";
  status: "unread" | "sent";
  studentId: string | null;
}

// 15. Audit Logs Collection
export interface AuditLogDoc extends BaseDoc {
  organizationId: string | null; // null for platform level
  orgId: string | null;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

// 16. Announcements Collection
export interface AnnouncementDoc extends BaseDoc {
  organizationId: string | null; // null for platform-wide
  orgId: string | null;
  title: string;
  content: string;
}

// 17. Expenses Collection
export interface ExpenseDoc extends BaseDoc {
  organizationId: string;
  orgId: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  description: string;
}

// 18. WhatsApp Configs Collection
export interface WhatsAppConfigDoc extends BaseDoc {
  organizationId: string;
  orgId: string;
  enabled: boolean;
  provider: "twilio" | "meta" | "sandbox";
  apiKey: string;
  phoneId: string;
  senderNumber: string;
  apiUrl?: string;
  apiToken?: string;
  templates: {
    welcome: string;
    upcomingRenewal: string;
    expiredAlert: string;
    paymentReceipt: string;
    expiryWarn?: string;
    renewalSuccess?: string;
  };
  triggerDaysBefore: number;
}

// 19. WhatsApp Logs Collection
export interface WhatsAppLogDoc extends BaseDoc {
  organizationId: string;
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

export const COLLECTION_NAMES = {
  ORGANIZATIONS: "organizations",
  USERS: "users",
  STUDENTS: "students",
  MEMBERSHIP_PLANS: "membershipPlans",
  MEMBERSHIPS: "memberships",
  BUILDINGS: "buildings",
  FLOORS: "floors",
  ROOMS: "rooms",
  SEATS: "seats",
  SEAT_HISTORY: "seatHistory",
  ATTENDANCES: "attendances",
  PAYMENTS: "payments",
  INVOICES: "invoices",
  NOTIFICATIONS: "notifications",
  AUDIT_LOGS: "auditLogs",
  ANNOUNCEMENTS: "announcements",
  EXPENSES: "expenses",
  WHATSAPP_CONFIGS: "whatsappConfigs",
  WHATSAPP_LOGS: "whatsappLogs"
} as const;

export type CollectionName = typeof COLLECTION_NAMES[keyof typeof COLLECTION_NAMES];
