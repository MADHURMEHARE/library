import fs from "fs";
import path from "path";
import { getMongoDb, initializeMongoIndexes, closeMongoClient } from "./mongo";
import { COLLECTION_NAMES } from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");

export async function runSeed(): Promise<void> {
  console.log("==================================================");
  console.log(" StudySphere Multi-Tenant Database Seeding");
  console.log("==================================================");

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 1. ORGANIZATIONS
  const organizations = [
    {
      _id: "org-1",
      id: "org-1",
      name: "Athena Silent Study Center",
      logo: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=200&auto=format&fit=crop",
      address: "Suite 404, Education Enclave, New Delhi, India",
      phone: "+91 98765 43210",
      email: "contact@athenastudy.com",
      openingTime: "06:00",
      closingTime: "23:00",
      currency: "INR",
      timezone: "Asia/Kolkata",
      status: "active",
      planId: "premium",
      createdAt: "2026-01-10T10:00:00Z",
      updatedAt: "2026-01-10T10:00:00Z"
    },
    {
      _id: "org-2",
      id: "org-2",
      name: "Horizon Reading Room",
      logo: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=200&auto=format&fit=crop",
      address: "7th Avenue, Near Central Library, Bangalore, India",
      phone: "+91 88888 77777",
      email: "info@horizonreading.com",
      openingTime: "07:00",
      closingTime: "22:00",
      currency: "INR",
      timezone: "Asia/Kolkata",
      status: "active",
      planId: "standard",
      createdAt: "2026-02-15T08:30:00Z",
      updatedAt: "2026-02-15T08:30:00Z"
    }
  ];

  // 2. USERS
  const users = [
    {
      _id: "user-super",
      id: "user-super",
      organizationId: null,
      orgId: null,
      email: "superadmin@platform.com",
      name: "Aarav Sharma (Super Admin)",
      role: "SUPER_ADMIN",
      phone: "+91 99999 99999",
      status: "active",
      emailVerified: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z"
    },
    {
      _id: "user-admin-1",
      id: "user-admin-1",
      organizationId: "org-1",
      orgId: "org-1",
      email: "admin@athena.com",
      name: "Vikram Malhotra",
      role: "ORG_ADMIN",
      phone: "+91 98765 11111",
      status: "active",
      emailVerified: true,
      createdAt: "2026-01-10T11:00:00Z",
      updatedAt: "2026-01-10T11:00:00Z"
    },
    {
      _id: "user-staff-1",
      id: "user-staff-1",
      organizationId: "org-1",
      orgId: "org-1",
      email: "staff@athena.com",
      name: "Priya Patel",
      role: "RECEPTIONIST",
      phone: "+91 98765 22222",
      status: "active",
      emailVerified: true,
      createdAt: "2026-01-12T09:00:00Z",
      updatedAt: "2026-01-12T09:00:00Z"
    },
    {
      _id: "user-admin-2",
      id: "user-admin-2",
      organizationId: "org-2",
      orgId: "org-2",
      email: "admin@horizon.com",
      name: "Rohan Das",
      role: "ORG_ADMIN",
      phone: "+91 88888 11111",
      status: "active",
      emailVerified: true,
      createdAt: "2026-02-15T09:00:00Z",
      updatedAt: "2026-02-15T09:00:00Z"
    }
  ];

  // 3. STUDENTS
  const students = [
    {
      _id: "stud-2",
      id: "stud-2",
      organizationId: "org-1",
      orgId: "org-1",
      studentId: "STUD-1002",
      name: "Ananya Iyer",
      gender: "female",
      dob: "2001-09-22",
      phone: "+91 91234 56789",
      parentPhone: "+91 91234 56780",
      email: "ananya.iyer@gmail.com",
      address: "Block C-3, Green Park, New Delhi",
      emergencyContact: "Sridhar Iyer (Father) - +91 91234 56780",
      govIdType: "Passport",
      govIdNumber: "Z9876543",
      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
      notes: "Preparing for CAT Exam. Needs continuous silent slot.",
      college: "SRCC",
      course: "B.Com (Hons)",
      year: "Graduate",
      batch: "Full Day batch",
      joinDate: "2026-01-15",
      qrCode: "STUD-1002-org-1",
      status: "active",
      createdAt: "2026-01-15T10:00:00Z",
      updatedAt: "2026-01-15T10:00:00Z"
    },
    {
      _id: "stud-3",
      id: "stud-3",
      organizationId: "org-1",
      orgId: "org-1",
      studentId: "STUD-1003",
      name: "Rahul Verma",
      gender: "male",
      dob: "1999-04-12",
      phone: "+91 98111 22334",
      parentPhone: "+91 98111 22330",
      email: "rahul.verma@outlook.com",
      address: "Flat 12, Sunrise Apts, Rohini, Delhi",
      emergencyContact: "Anita Verma (Mother) - +91 98111 22330",
      govIdType: "Aadhaar",
      govIdNumber: "4521-8965-3214",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
      notes: "UPSC Civil Services Aspirant. Reserved Seat 02.",
      college: "Hansraj College",
      course: "BA History",
      year: "Post-Graduate",
      batch: "Morning Slot (6 AM - 2 PM)",
      joinDate: "2026-01-20",
      qrCode: "STUD-1003-org-1",
      status: "active",
      createdAt: "2026-01-20T11:30:00Z",
      updatedAt: "2026-01-20T11:30:00Z"
    },
    {
      _id: "stud-4",
      id: "stud-4",
      organizationId: "org-1",
      orgId: "org-1",
      studentId: "STUD-1004",
      name: "Sneha Mukherjee",
      gender: "female",
      dob: "2002-11-05",
      phone: "+91 97777 66554",
      parentPhone: "+91 97777 66550",
      email: "sneha.m@yahoo.com",
      address: "H-88, South Extension Part 2, New Delhi",
      emergencyContact: "Debashis Mukherjee - +91 97777 66550",
      govIdType: "Driving License",
      govIdNumber: "DL-0420180012345",
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
      notes: "CA Final Preparation.",
      college: "Delhi University",
      course: "Chartered Accountancy",
      year: "Final Year",
      batch: "Evening Slot (2 PM - 11 PM)",
      joinDate: "2026-02-01",
      qrCode: "STUD-1004-org-1",
      status: "active",
      createdAt: "2026-02-01T09:15:00Z",
      updatedAt: "2026-02-01T09:15:00Z"
    },
    {
      _id: "stud-5",
      id: "stud-5",
      organizationId: "org-2",
      orgId: "org-2",
      studentId: "STUD-2001",
      name: "Kavya Menon",
      gender: "female",
      dob: "2000-08-14",
      phone: "+91 99444 33221",
      parentPhone: "+91 99444 33220",
      email: "kavya.menon@gmail.com",
      address: "Indiranagar, Bangalore",
      emergencyContact: "Gopal Menon - +91 99444 33220",
      govIdType: "Aadhaar",
      govIdNumber: "8877-6655-4433",
      photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=150&auto=format&fit=crop",
      notes: "NEET PG Candidate.",
      college: "BMCRI",
      course: "MBBS",
      year: "Graduate",
      batch: "Full Day batch",
      joinDate: "2026-02-18",
      qrCode: "STUD-2001-org-2",
      status: "active",
      createdAt: "2026-02-18T10:00:00Z",
      updatedAt: "2026-02-18T10:00:00Z"
    }
  ];

  // 4. MEMBERSHIP PLANS
  const membershipPlans = [
    {
      _id: "plan-1",
      id: "plan-1",
      organizationId: "org-1",
      orgId: "org-1",
      name: "Monthly Full Day Silent Pass",
      durationType: "monthly",
      durationDays: 30,
      price: 2500,
      seatType: "AC",
      timing: "Full Day (6:00 AM - 11:00 PM)",
      description: "Dedicated reserved seat in central quiet zone with high-speed WiFi and locker.",
      status: "active",
      createdAt: "2026-01-10T11:00:00Z",
      updatedAt: "2026-01-10T11:00:00Z"
    },
    {
      _id: "plan-2",
      id: "plan-2",
      organizationId: "org-1",
      orgId: "org-1",
      name: "Quarterly UPSC / Study Special",
      durationType: "quarterly",
      durationDays: 90,
      price: 6500,
      seatType: "Premium",
      timing: "Full Day (6:00 AM - 11:00 PM)",
      description: "Extra-wide ergonomic workstation with private power socket, task lamp & unlimited tea/coffee.",
      status: "active",
      createdAt: "2026-01-10T11:00:00Z",
      updatedAt: "2026-01-10T11:00:00Z"
    },
    {
      _id: "plan-3",
      id: "plan-3",
      organizationId: "org-2",
      orgId: "org-2",
      name: "Standard Monthly Pass",
      durationType: "monthly",
      durationDays: 30,
      price: 2200,
      seatType: "AC",
      timing: "Full Day (7:00 AM - 10:00 PM)",
      description: "Quiet library desk with dedicated charging ports.",
      status: "active",
      createdAt: "2026-02-15T09:00:00Z",
      updatedAt: "2026-02-15T09:00:00Z"
    }
  ];

  // 5. MEMBERSHIPS
  const memberships = [
    {
      _id: "memb-1",
      id: "memb-1",
      organizationId: "org-1",
      orgId: "org-1",
      studentId: "stud-2",
      planId: "plan-1",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      price: 2500,
      paidAmount: 2500,
      status: "active",
      createdAt: "2026-08-01T10:00:00Z",
      updatedAt: "2026-08-01T10:00:00Z"
    },
    {
      _id: "memb-2",
      id: "memb-2",
      organizationId: "org-1",
      orgId: "org-1",
      studentId: "stud-3",
      planId: "plan-2",
      startDate: "2026-07-01",
      endDate: "2026-09-30",
      price: 6500,
      paidAmount: 6500,
      status: "active",
      createdAt: "2026-07-01T11:00:00Z",
      updatedAt: "2026-07-01T11:00:00Z"
    },
    {
      _id: "memb-3",
      id: "memb-3",
      organizationId: "org-1",
      orgId: "org-1",
      studentId: "stud-4",
      planId: "plan-1",
      startDate: "2026-08-10",
      endDate: "2026-08-20", // Expiring soon in live testing
      price: 2500,
      paidAmount: 2000,
      status: "active",
      createdAt: "2026-08-10T09:00:00Z",
      updatedAt: "2026-08-10T09:00:00Z"
    },
    {
      _id: "memb-4",
      id: "memb-4",
      organizationId: "org-2",
      orgId: "org-2",
      studentId: "stud-5",
      planId: "plan-3",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      price: 2200,
      paidAmount: 2200,
      status: "active",
      createdAt: "2026-08-01T09:30:00Z",
      updatedAt: "2026-08-01T09:30:00Z"
    }
  ];

  // 6. BUILDINGS
  const buildings = [
    {
      _id: "bld-1",
      id: "bld-1",
      organizationId: "org-1",
      orgId: "org-1",
      name: "Main Study Campus (Block A)",
      createdAt: "2026-01-10T10:30:00Z",
      updatedAt: "2026-01-10T10:30:00Z"
    },
    {
      _id: "bld-2",
      id: "bld-2",
      organizationId: "org-2",
      orgId: "org-2",
      name: "Horizon Center Building",
      createdAt: "2026-02-15T09:00:00Z",
      updatedAt: "2026-02-15T09:00:00Z"
    }
  ];

  // 7. FLOORS
  const floors = [
    {
      _id: "flr-1",
      id: "flr-1",
      organizationId: "org-1",
      orgId: "org-1",
      buildingId: "bld-1",
      name: "1st Floor (Central Silence Wing)",
      createdAt: "2026-01-10T10:35:00Z",
      updatedAt: "2026-01-10T10:35:00Z"
    },
    {
      _id: "flr-2",
      id: "flr-2",
      organizationId: "org-2",
      orgId: "org-2",
      buildingId: "bld-2",
      name: "Ground Floor Lounge",
      createdAt: "2026-02-15T09:05:00Z",
      updatedAt: "2026-02-15T09:05:00Z"
    }
  ];

  // 8. ROOMS
  const rooms = [
    {
      _id: "rm-1",
      id: "rm-1",
      organizationId: "org-1",
      orgId: "org-1",
      floorId: "flr-1",
      name: "Chamber of Silence (AC Zone)",
      createdAt: "2026-01-10T10:40:00Z",
      updatedAt: "2026-01-10T10:40:00Z"
    },
    {
      _id: "rm-2",
      id: "rm-2",
      organizationId: "org-2",
      orgId: "org-2",
      floorId: "flr-2",
      name: "Horizon Main Hall",
      createdAt: "2026-02-15T09:10:00Z",
      updatedAt: "2026-02-15T09:10:00Z"
    }
  ];

  // 9. SEATS
  const seats = [
    {
      _id: "seat-1",
      id: "seat-1",
      organizationId: "org-1",
      orgId: "org-1",
      roomId: "rm-1",
      seatNumber: "S-01",
      type: "AC",
      status: "occupied",
      assignedStudentId: "stud-2",
      notes: "Corner desk near natural window ventilation.",
      row: "Row A",
      createdAt: "2026-01-10T10:45:00Z",
      updatedAt: "2026-01-10T10:45:00Z"
    },
    {
      _id: "seat-2",
      id: "seat-2",
      organizationId: "org-1",
      orgId: "org-1",
      roomId: "rm-1",
      seatNumber: "S-02",
      type: "Premium",
      status: "occupied",
      assignedStudentId: "stud-3",
      notes: "Ergonomic leather chair with private cabinet.",
      row: "Row A",
      createdAt: "2026-01-10T10:45:00Z",
      updatedAt: "2026-01-10T10:45:00Z"
    },
    {
      _id: "seat-3",
      id: "seat-3",
      organizationId: "org-1",
      orgId: "org-1",
      roomId: "rm-1",
      seatNumber: "S-03",
      type: "AC",
      status: "occupied",
      assignedStudentId: "stud-4",
      notes: "Standard quiet desk.",
      row: "Row A",
      createdAt: "2026-01-10T10:45:00Z",
      updatedAt: "2026-01-10T10:45:00Z"
    },
    {
      _id: "seat-4",
      id: "seat-4",
      organizationId: "org-1",
      orgId: "org-1",
      roomId: "rm-1",
      seatNumber: "S-04",
      type: "Premium",
      status: "available",
      assignedStudentId: null,
      notes: "High-spec desk with secondary display arm.",
      row: "Row A",
      createdAt: "2026-01-10T10:45:00Z",
      updatedAt: "2026-01-10T10:45:00Z"
    },
    {
      _id: "seat-5",
      id: "seat-5",
      organizationId: "org-1",
      orgId: "org-1",
      roomId: "rm-1",
      seatNumber: "S-05",
      type: "Non-AC",
      status: "maintenance",
      assignedStudentId: null,
      notes: "Electrical socket undergoing repair.",
      row: "Row B",
      createdAt: "2026-01-10T10:45:00Z",
      updatedAt: "2026-01-10T10:45:00Z"
    },
    {
      _id: "seat-6",
      id: "seat-6",
      organizationId: "org-2",
      orgId: "org-2",
      roomId: "rm-2",
      seatNumber: "H-01",
      type: "AC",
      status: "occupied",
      assignedStudentId: "stud-5",
      notes: "Horizon primary seat.",
      row: "Row A",
      createdAt: "2026-02-15T09:15:00Z",
      updatedAt: "2026-02-15T09:15:00Z"
    }
  ];

  // 10. SEAT HISTORY
  const seatHistory = [
    {
      _id: "sh-1",
      id: "sh-1",
      organizationId: "org-1",
      orgId: "org-1",
      seatId: "seat-1",
      studentId: "stud-2",
      action: "assign",
      targetSeatId: null,
      timestamp: "2026-08-01T10:00:00Z",
      createdAt: "2026-08-01T10:00:00Z"
    },
    {
      _id: "sh-2",
      id: "sh-2",
      organizationId: "org-1",
      orgId: "org-1",
      seatId: "seat-2",
      studentId: "stud-3",
      action: "assign",
      targetSeatId: null,
      timestamp: "2026-07-01T11:00:00Z",
      createdAt: "2026-07-01T11:00:00Z"
    }
  ];

  // 11. ATTENDANCES
  const attendances = [
    {
      _id: "att-1",
      id: "att-1",
      organizationId: "org-1",
      orgId: "org-1",
      studentId: "stud-2",
      date: new Date().toISOString().split("T")[0],
      checkInTime: "07:15 AM",
      checkOutTime: null,
      method: "qr",
      status: "present",
      createdAt: new Date().toISOString()
    },
    {
      _id: "att-2",
      id: "att-2",
      organizationId: "org-1",
      orgId: "org-1",
      studentId: "stud-3",
      date: new Date().toISOString().split("T")[0],
      checkInTime: "06:30 AM",
      checkOutTime: "02:00 PM",
      method: "manual",
      status: "present",
      createdAt: new Date().toISOString()
    }
  ];

  // 12. PAYMENTS
  const payments = [
    {
      _id: "pay-1",
      id: "pay-1",
      organizationId: "org-1",
      orgId: "org-1",
      studentId: "stud-2",
      membershipId: "memb-1",
      amount: 2500,
      discount: 0,
      couponCode: "",
      netPaid: 2500,
      balance: 0,
      method: "upi",
      notes: "Google Pay Txn #99881122",
      date: "2026-08-01",
      status: "paid",
      createdAt: "2026-08-01T10:05:00Z"
    },
    {
      _id: "pay-2",
      id: "pay-2",
      organizationId: "org-1",
      orgId: "org-1",
      studentId: "stud-3",
      membershipId: "memb-2",
      amount: 6500,
      discount: 500,
      couponCode: "EARLYBIRD",
      netPaid: 6000,
      balance: 0,
      method: "card",
      notes: "HDFC POS Terminal #412",
      date: "2026-07-01",
      status: "paid",
      createdAt: "2026-07-01T11:05:00Z"
    },
    {
      _id: "pay-3",
      id: "pay-3",
      organizationId: "org-1",
      orgId: "org-1",
      studentId: "stud-4",
      membershipId: "memb-3",
      amount: 2500,
      discount: 0,
      couponCode: "",
      netPaid: 2000,
      balance: 500, // Pending balance for testing dues collection
      method: "cash",
      notes: "Cash on desk. 500 pending due next week.",
      date: "2026-08-10",
      status: "partial",
      createdAt: "2026-08-10T09:05:00Z"
    }
  ];

  // 13. INVOICES
  const invoices = [
    {
      _id: "inv-1",
      id: "inv-1",
      organizationId: "org-1",
      orgId: "org-1",
      paymentId: "pay-1",
      invoiceNumber: "INV-ATH-2026-001",
      receiptNumber: "REC-2026-101",
      issuedAt: "2026-08-01T10:06:00Z",
      createdAt: "2026-08-01T10:06:00Z"
    },
    {
      _id: "inv-2",
      id: "inv-2",
      organizationId: "org-1",
      orgId: "org-1",
      paymentId: "pay-2",
      invoiceNumber: "INV-ATH-2026-002",
      receiptNumber: "REC-2026-102",
      issuedAt: "2026-07-01T11:06:00Z",
      createdAt: "2026-07-01T11:06:00Z"
    }
  ];

  // 14. NOTIFICATIONS
  const notifications = [
    {
      _id: "not-1",
      id: "not-1",
      organizationId: "org-1",
      orgId: "org-1",
      title: "Silent Hours Enforced",
      message: "Please ensure mobile phones are kept on silent mode inside the central hall.",
      type: "reminder",
      status: "unread",
      studentId: null,
      createdAt: "2026-08-15T08:00:00Z"
    },
    {
      _id: "not-2",
      id: "not-2",
      organizationId: "org-1",
      orgId: "org-1",
      title: "Membership Expiring Soon",
      message: "Dear Sneha, your pass expires on 2026-08-20. Please renew to keep your reserved seat S-03.",
      type: "expiry",
      status: "unread",
      studentId: "stud-4",
      createdAt: "2026-08-15T09:00:00Z"
    }
  ];

  // 15. AUDIT LOGS
  const auditLogs = [
    {
      _id: "aud-1",
      id: "aud-1",
      organizationId: "org-1",
      orgId: "org-1",
      userId: "user-admin-1",
      userName: "Vikram Malhotra",
      action: "ASSIGN_SEAT",
      details: "Assigned Seat S-01 to Ananya Iyer (STUD-1002)",
      timestamp: "2026-08-01T10:00:00Z",
      createdAt: "2026-08-01T10:00:00Z"
    },
    {
      _id: "aud-2",
      id: "aud-2",
      organizationId: "org-1",
      orgId: "org-1",
      userId: "user-staff-1",
      userName: "Priya Patel",
      action: "CHECK_IN",
      details: "Checked in student Ananya Iyer (STUD-1002) via QR",
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  ];

  // 16. ANNOUNCEMENTS
  const announcements = [
    {
      _id: "ann-1",
      id: "ann-1",
      organizationId: null,
      orgId: null,
      title: "⚡ StudySphere System Upgrade v3.4",
      content: "All reading rooms now feature instant QR seat checks, automated WhatsApp notifications, and multi-tenant isolation.",
      createdAt: "2026-08-10T12:00:00Z"
    },
    {
      _id: "ann-2",
      id: "ann-2",
      organizationId: "org-1",
      orgId: "org-1",
      title: "High-Speed WiFi Bandwidth Doubled",
      content: "Dedicated 300 Mbps fiber line has been activated for the main reading hall.",
      createdAt: "2026-08-12T10:00:00Z"
    }
  ];

  // 17. EXPENSES
  const expenses = [
    {
      _id: "exp-1",
      id: "exp-1",
      organizationId: "org-1",
      orgId: "org-1",
      title: "Commercial High-Speed Internet (Fiber 300Mbps)",
      category: "Internet & WiFi",
      amount: 2400,
      date: "2026-08-05",
      description: "Airtel Xstream Monthly Fiber Bill",
      createdAt: "2026-08-05T10:00:00Z"
    },
    {
      _id: "exp-2",
      id: "exp-2",
      organizationId: "org-1",
      orgId: "org-1",
      title: "Central AC Duct Cleaning & Filter Service",
      category: "Maintenance",
      amount: 4500,
      date: "2026-08-08",
      description: "Quarterly HVAC filter servicing and sanitization",
      createdAt: "2026-08-08T14:00:00Z"
    }
  ];

  // 18. WHATSAPP CONFIGS
  const whatsappConfigs = [
    {
      _id: "wac-org-1",
      id: "wac-org-1",
      organizationId: "org-1",
      orgId: "org-1",
      enabled: true,
      provider: "sandbox",
      apiKey: "sb_demo_key_99812",
      phoneId: "919876543210",
      senderNumber: "+91 98765 43210",
      templates: {
        welcome: "Welcome to Athena Silent Study Center, {student_name}! Your ID is {student_id}. Happy Studying!",
        upcomingRenewal: "Hi {student_name}, your membership at Athena Study Center expires on {expiry_date}. Please renew to keep your reserved seat {seat_number}.",
        expiredAlert: "Hello {student_name}, your study pass expired on {expiry_date}. Please renew today to prevent seat release.",
        paymentReceipt: "Payment Received: INR {amount} for plan {plan_name}. Receipt No: {receipt_no}. Thank you!"
      },
      triggerDaysBefore: 3,
      createdAt: "2026-01-10T11:00:00Z"
    }
  ];

  // 19. WHATSAPP LOGS
  const whatsappLogs = [
    {
      _id: "wal-1",
      id: "wal-1",
      organizationId: "org-1",
      orgId: "org-1",
      studentId: "stud-2",
      studentName: "Ananya Iyer",
      phone: "+91 91234 56789",
      type: "welcome",
      message: "Welcome to Athena Silent Study Center, Ananya Iyer! Your ID is STUD-1002. Happy Studying!",
      status: "delivered",
      errorMessage: "",
      timestamp: "2026-08-01T10:06:00Z",
      createdAt: "2026-08-01T10:06:00Z"
    }
  ];

  const allSeedData: Record<string, any[]> = {
    [COLLECTION_NAMES.ORGANIZATIONS]: organizations,
    [COLLECTION_NAMES.USERS]: users,
    [COLLECTION_NAMES.STUDENTS]: students,
    [COLLECTION_NAMES.MEMBERSHIP_PLANS]: membershipPlans,
    [COLLECTION_NAMES.MEMBERSHIPS]: memberships,
    [COLLECTION_NAMES.BUILDINGS]: buildings,
    [COLLECTION_NAMES.FLOORS]: floors,
    [COLLECTION_NAMES.ROOMS]: rooms,
    [COLLECTION_NAMES.SEATS]: seats,
    [COLLECTION_NAMES.SEAT_HISTORY]: seatHistory,
    [COLLECTION_NAMES.ATTENDANCES]: attendances,
    [COLLECTION_NAMES.PAYMENTS]: payments,
    [COLLECTION_NAMES.INVOICES]: invoices,
    [COLLECTION_NAMES.NOTIFICATIONS]: notifications,
    [COLLECTION_NAMES.AUDIT_LOGS]: auditLogs,
    [COLLECTION_NAMES.ANNOUNCEMENTS]: announcements,
    [COLLECTION_NAMES.EXPENSES]: expenses,
    [COLLECTION_NAMES.WHATSAPP_CONFIGS]: whatsappConfigs,
    [COLLECTION_NAMES.WHATSAPP_LOGS]: whatsappLogs
  };

  // Write separate files to data/
  for (const [colName, docs] of Object.entries(allSeedData)) {
    const filePath = path.join(DATA_DIR, `${colName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf-8");
    console.log(`   [Seeded] ${colName.padEnd(20)} -> ${docs.length.toString().padStart(4)} records into data/${colName}.json`);
  }

  // If MongoDB is connected, seed to live MongoDB
  const mongoDb = await getMongoDb();
  if (mongoDb) {
    console.log(" [MongoDB] Seeding live MongoDB database collections...");
    await initializeMongoIndexes(mongoDb);

    for (const [colName, docs] of Object.entries(allSeedData)) {
      const col = mongoDb.collection(colName);
      for (const doc of docs) {
        const { _id, ...docWithoutId } = doc;
        if (colName === COLLECTION_NAMES.WHATSAPP_CONFIGS && doc.organizationId) {
          await col.updateOne({ organizationId: doc.organizationId }, { $set: docWithoutId }, { upsert: true });
        } else {
          await col.updateOne({ id: doc.id }, { $set: docWithoutId }, { upsert: true });
        }
      }
      console.log(`   [MongoDB] Populated collection '${colName}' with ${docs.length} items.`);
    }
  }

  console.log("==================================================");
  console.log(" Multi-Tenant Seeding Complete!");
  console.log("==================================================");
}

// Standalone execution support
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  runSeed().then(async () => {
    await closeMongoClient();
    console.log("Seeding process terminated successfully.");
    process.exit(0);
  }).catch(async (err) => {
    await closeMongoClient();
    console.error("Seeding error:", err);
    process.exit(1);
  });
}
