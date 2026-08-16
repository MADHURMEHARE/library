/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { dbStore } from "./server/dbStore";
import jwt from "jsonwebtoken";
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
  Attendance,
  Payment,
  Invoice,
  Notification,
  AuditLog,
  Announcement,
  Expense,
  UserRole,
  WhatsAppConfig,
  WhatsAppLog
} from "./src/types";

// Setup Server
const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// JWT Authentication Secret
const JWT_SECRET = process.env.JWT_SECRET || "saas-secret-jwt-key-2026-omnipass";

// SaaS Platform Subscriptions and Tiers
const SAAS_PLANS = [
  { id: "basic", name: "SaaS Basic Plan", price: 1500, maxStudents: 50, maxSeats: 30, features: ["Seat Allocation", "Basic Attendance", "Cash Payments"] },
  { id: "standard", name: "SaaS Standard Plan", price: 3000, maxStudents: 150, maxSeats: 100, features: ["AC/Non-AC Spaces", "QR Code Attendance", "UPI/Card Payments", "Basic Reports"] },
  { id: "premium", name: "SaaS Premium Plan", price: 6000, maxStudents: 500, maxSeats: 400, features: ["Unlimited Rooms", "Student ID Generator", "Receipt Printers", "Advanced Analytics", "Audit Timelines"] }
];

// Helper function to write audit log
function logAction(userId: string, userName: string, orgId: string | null, action: string, details: string) {
  dbStore.addAuditLog({
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    orgId,
    userId,
    userName,
    action,
    details,
    timestamp: new Date().toISOString()
  });
}

// Authentication Middleware
const authenticateToken = (req: any, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Your session has expired or the token is invalid. Please log in again." });
    }
    req.user = decoded;
    next();
  });
};

// SaaS Multi-Tenant Isolation / Scope Guard Middleware
const requireTenant = (req: any, res: express.Response, next: express.NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  // Super Admins bypass tenant scope unless querying/modifying a specific tenant
  if (req.user.role === "SUPER_ADMIN") {
    next();
    return;
  }

  const userOrgId = req.user.orgId;
  if (!userOrgId) {
    return res.status(403).json({ error: "No organization associated with this account." });
  }

  // Enforce SaaS data isolation
  if (req.method === "GET") {
    req.query.orgId = userOrgId;
  } else {
    req.body.orgId = userOrgId;
  }

  next();
};

// Super Admin Privileges Guard Middleware
const requireSuperAdmin = (req: any, res: express.Response, next: express.NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Access denied. Platform Administrator privileges required." });
  }
  next();
};

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  // Find user
  const user = dbStore.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (user.status === "inactive") {
    return res.status(403).json({ error: "Your account is inactive. Please contact your administrator." });
  }

  // Retrieve tenant info if applicable
  let org: Organization | null = null;
  if (user.orgId) {
    const foundOrg = dbStore.getOrganizations().find(o => o.id === user.orgId);
    if (foundOrg) {
      if (foundOrg.status === "suspended") {
        return res.status(403).json({ error: "This Reading Room organization is suspended. Please contact platform owner." });
      }
      org = foundOrg;
    }
  }

  // Generate a real signed JWT token
  const token = jwt.sign(
    { id: user.id, orgId: user.orgId, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  logAction(user.id, user.name, user.orgId, "LOGIN", "User logged in successfully.");

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      emailVerified: user.emailVerified,
      status: user.status,
      orgId: user.orgId
    },
    organization: org
  });
});

app.post("/api/auth/reset-password-request", (req, res) => {
  const { email } = req.body;
  const user = dbStore.getUsers().find(u => u.email.toLowerCase() === email?.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "No account found with this email" });
  }
  res.json({ message: "Password reset link has been dispatched to your email address (simulated)." });
});

app.post("/api/auth/reset-password", (req, res) => {
  const { email, password } = req.body;
  const user = dbStore.getUsers().find(u => u.email.toLowerCase() === email?.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  logAction(user.id, user.name, user.orgId, "RESET_PASSWORD", "User successfully changed password.");
  res.json({ message: "Password updated successfully!" });
});

app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const user = dbStore.getUsers().find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User profile not found." });
  }

  if (user.status === "inactive") {
    return res.status(403).json({ error: "Your account is inactive. Please contact support." });
  }

  let org: Organization | null = null;
  if (user.orgId) {
    const foundOrg = dbStore.getOrganizations().find(o => o.id === user.orgId);
    if (foundOrg) {
      if (foundOrg.status === "suspended") {
        return res.status(403).json({ error: "This Reading Room organization is suspended." });
      }
      org = foundOrg;
    }
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      emailVerified: user.emailVerified,
      status: user.status,
      orgId: user.orgId
    },
    organization: org
  });
});

app.post("/api/auth/signup", (req, res) => {
  const { name, email, adminName, adminEmail, adminPhone, planId } = req.body;
  if (!name || !email || !adminEmail || !adminName) {
    return res.status(400).json({ error: "All fields are required to register your organization." });
  }

  // Check if user email already exists
  const emailExists = dbStore.getUsers().some(u => u.email.toLowerCase() === adminEmail.toLowerCase());
  if (emailExists) {
    return res.status(400).json({ error: "An account with this email address already exists." });
  }

  const orgId = `org-${Date.now()}`;
  const newOrg: Organization = {
    id: orgId,
    name,
    logo: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=200&auto=format&fit=crop",
    address: "Default Address",
    phone: adminPhone || "+123456789",
    email,
    openingTime: "06:00",
    closingTime: "23:00",
    currency: "INR",
    timezone: "Asia/Kolkata",
    status: "active",
    planId: planId || "basic",
    createdAt: new Date().toISOString()
  };

  dbStore.addOrganization(newOrg);

  const adminId = `user-admin-${Date.now()}`;
  const newAdmin: User = {
    id: adminId,
    orgId: orgId,
    email: adminEmail,
    name: adminName,
    role: "ORG_ADMIN",
    phone: adminPhone || "+123456789",
    status: "active",
    emailVerified: true,
    createdAt: new Date().toISOString()
  };
  dbStore.addUser(newAdmin);

  // Auto-generate basic layout structures so the room is ready out of the box!
  const bldId = `bld-${Date.now()}`;
  dbStore.addBuilding({ id: bldId, orgId, name: "Alpha Block", createdAt: new Date().toISOString() });

  const flrId = `flr-${Date.now()}`;
  dbStore.addFloor({ id: flrId, orgId, buildingId: bldId, name: "1st Floor", createdAt: new Date().toISOString() });

  const rmId = `rm-${Date.now()}`;
  dbStore.addRoom({ id: rmId, orgId, floorId: flrId, name: "Hall A (Silent)", createdAt: new Date().toISOString() });

  // Generate 8 basic seats
  for (let i = 1; i <= 8; i++) {
    dbStore.addSeat({
      id: `seat-${orgId}-rm-${i}`,
      orgId,
      roomId: rmId,
      seatNumber: `S-${i.toString().padStart(2, "0")}`,
      type: i % 4 === 0 ? "Premium" : "AC",
      status: "available",
      assignedStudentId: null,
      notes: "Newly provisioned silent desk.",
      row: "Row A",
      createdAt: new Date().toISOString()
    });
  }

  // Pre-generate standard membership plans
  dbStore.addPlan({
    id: `plan-${orgId}-monthly`,
    orgId,
    name: "Standard Monthly Pass",
    durationType: "monthly",
    durationDays: 30,
    price: 2000,
    seatType: "AC",
    status: "active",
    timing: "Full Day (6 AM - 11 PM)",
    description: "Full day seat reservation with central air-conditioning.",
    createdAt: new Date().toISOString()
  });

  logAction(adminId, adminName, orgId, "SIGNUP", `Signed up organization ${name} under ${planId} plan`);

  const token = jwt.sign(
    { id: adminId, orgId, role: "ORG_ADMIN", name: adminName },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      id: adminId,
      email: newAdmin.email,
      name: newAdmin.name,
      role: newAdmin.role,
      phone: newAdmin.phone,
      emailVerified: newAdmin.emailVerified,
      status: newAdmin.status,
      orgId
    },
    organization: newOrg
  });
});

app.post("/api/auth/profile", authenticateToken, (req: any, res) => {
  const { name, phone, email } = req.body;
  const userId = req.user.id;
  const user = dbStore.getUsers().find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  
  dbStore.updateUser(userId, { name, phone, email });
  const updatedUser = dbStore.getUsers().find(u => u.id === userId);
  
  logAction(userId, name, updatedUser?.orgId || null, "PROFILE_UPDATE", "Updated profile details.");
  res.json({ user: updatedUser });
});


// ==========================================
// TENANT / ORGANIZATION MANAGEMENT (SUPER ADMIN)
// ==========================================

app.get("/api/organizations", authenticateToken, requireSuperAdmin, (req, res) => {
  res.json(dbStore.getOrganizations());
});

app.post("/api/organizations", authenticateToken, requireSuperAdmin, (req, res) => {
  const { name, logo, address, phone, email, currency, timezone, planId, adminName, adminEmail } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Organization name and email are required" });
  }

  const orgId = `org-${Date.now()}`;
  const newOrg: Organization = {
    id: orgId,
    name,
    logo: logo || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=200&auto=format&fit=crop",
    address: address || "Default Address",
    phone: phone || "+123456789",
    email,
    openingTime: "06:00",
    closingTime: "23:00",
    currency: currency || "INR",
    timezone: timezone || "Asia/Kolkata",
    status: "active",
    planId: planId || "basic",
    createdAt: new Date().toISOString()
  };

  dbStore.addOrganization(newOrg);

  // Auto-generate an Organization Admin account
  const adminId = `user-admin-${Date.now()}`;
  const newAdmin: User = {
    id: adminId,
    orgId: orgId,
    email: adminEmail || `admin@${name.toLowerCase().replace(/\s+/g, "")}.com`,
    name: adminName || `${name} Owner`,
    role: "ORG_ADMIN",
    phone: phone || "+123456789",
    status: "active",
    emailVerified: true,
    createdAt: new Date().toISOString()
  };
  dbStore.addUser(newAdmin);

  // Auto-generate basic layout structures so the room is ready out of the box!
  const bldId = `bld-${Date.now()}`;
  dbStore.addBuilding({ id: bldId, orgId, name: "Alpha Block", createdAt: new Date().toISOString() });

  const flrId = `flr-${Date.now()}`;
  dbStore.addFloor({ id: flrId, orgId, buildingId: bldId, name: "1st Floor", createdAt: new Date().toISOString() });

  const rmId = `rm-${Date.now()}`;
  dbStore.addRoom({ id: rmId, orgId, floorId: flrId, name: "Hall A (Silent)", createdAt: new Date().toISOString() });

  // Generate 8 basic seats
  for (let i = 1; i <= 8; i++) {
    dbStore.addSeat({
      id: `seat-${orgId}-rm-${i}`,
      orgId,
      roomId: rmId,
      seatNumber: `S-${i.toString().padStart(2, "0")}`,
      type: i % 4 === 0 ? "Premium" : "AC",
      status: "available",
      assignedStudentId: null,
      notes: "Newly provisioned silent desk.",
      row: "Row A",
      createdAt: new Date().toISOString()
    });
  }

  // Pre-generate standard membership plans
  dbStore.addPlan({
    id: `plan-${orgId}-monthly`,
    orgId,
    name: "Standard Monthly Pass",
    durationType: "monthly",
    durationDays: 30,
    price: 2000,
    seatType: "AC",
    timing: "Full Day (6 AM - 11 PM)",
    description: "Full day seat reservation with central air-conditioning.",
    status: "active",
    createdAt: new Date().toISOString()
  });

  logAction("user-super", "Super Admin", null, "CREATE_ORGANIZATION", `Created organization ${name} with ID ${orgId}`);

  res.json({ organization: newOrg, admin: newAdmin });
});

app.put("/api/organizations/:id", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const data = req.body;
  if (req.user.role !== "SUPER_ADMIN" && req.user.orgId !== id) {
    return res.status(403).json({ error: "Access denied. You can only update your own organization details." });
  }
  dbStore.updateOrganization(id, data);
  const updated = dbStore.getOrganizations().find(o => o.id === id);
  res.json(updated);
});

app.delete("/api/organizations/:id", authenticateToken, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const orgName = dbStore.getOrganizations().find(o => o.id === id)?.name || "Unknown Organization";
  dbStore.deleteOrganization(id);
  logAction("user-super", "Super Admin", null, "DELETE_ORGANIZATION", `Deleted organization ${orgName} (ID: ${id})`);
  res.json({ success: true });
});


// ==========================================
// STUDENT MANAGEMENT
// ==========================================

app.get("/api/students", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });

  const students = dbStore.getStudents().filter(s => s.orgId === orgId);
  res.json(students);
});

app.post("/api/students", authenticateToken, requireTenant, (req: any, res) => {
  const {
    orgId, name, gender, dob, phone, parentPhone, email, address,
    emergencyContact, govIdType, govIdNumber, notes, college, course,
    year, batch, joinDate, photo
  } = req.body;

  if (!orgId || !name || !phone) {
    return res.status(400).json({ error: "Missing required fields (orgId, name, phone)" });
  }

  // SaaS limits enforcement
  const org = dbStore.getOrganizations().find(o => o.id === orgId);
  const planId = org?.planId || "basic";
  const limitObj = SAAS_PLANS.find(p => p.id === planId) || SAAS_PLANS[0];
  
  const currentStudentsCount = dbStore.getStudents().filter(s => s.orgId === orgId).length;
  if (currentStudentsCount >= limitObj.maxStudents) {
    return res.status(403).json({
      error: `Upgrade Required: Your current plan (${limitObj.name}) allows a maximum of ${limitObj.maxStudents} students. You have currently registered ${currentStudentsCount} students. Please upgrade your SaaS plan to add more students.`
    });
  }

  const code = Math.floor(1000 + Math.random() * 9000);
  const studentId = `STUD-${code}`;

  const newStudent: Student = {
    id: `stud-${Date.now()}`,
    orgId,
    studentId,
    name,
    gender,
    dob: dob || "2000-01-01",
    phone,
    parentPhone: parentPhone || "",
    email: email || "",
    address: address || "",
    emergencyContact: emergencyContact || "",
    govIdType: govIdType || "Aadhaar",
    govIdNumber: govIdNumber || "",
    photo: photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop",
    notes: notes || "",
    college: college || "",
    course: course || "",
    year: year || "1st Year",
    batch: batch || "Full Day",
    joinDate: joinDate || new Date().toISOString().split("T")[0],
    qrCode: `${studentId}-${orgId}`,
    status: "inactive", // inactive until membership plan is purchased
    createdAt: new Date().toISOString()
  };

  dbStore.addStudent(newStudent);

  // Send a simulated Welcome Notification
  dbStore.addNotification({
    id: `not-${Date.now()}`,
    orgId,
    title: "Welcome to our Reading Room!",
    message: `Welcome ${name}! Your student registration is complete. Student ID: ${studentId}. Please purchase a membership plan to assign a silent seat.`,
    type: "welcome",
    status: "unread",
    studentId: newStudent.id,
    createdAt: new Date().toISOString()
  });

  const creatorId = req.user.id;
  const creatorName = req.user.name || "Staff";
  logAction(creatorId, creatorName, orgId, "CREATE_STUDENT", `Registered student ${name} (${studentId})`);

  res.json(newStudent);
});

app.put("/api/students/:id", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const { ...data } = req.body;
  
  const studentBefore = dbStore.getStudents().find(s => s.id === id);
  if (!studentBefore) return res.status(404).json({ error: "Student not found" });

  if (req.user.role !== "SUPER_ADMIN" && studentBefore.orgId !== req.user.orgId) {
    return res.status(403).json({ error: "Access denied. You do not have permission to modify this student." });
  }

  dbStore.updateStudent(id, data);
  const updated = dbStore.getStudents().find(s => s.id === id);

  const editorId = req.user.id;
  const editorName = req.user.name || "Staff";
  logAction(editorId, editorName, studentBefore.orgId, "UPDATE_STUDENT", `Updated student details for ${updated?.name} (${updated?.studentId})`);
  res.json(updated);
});

app.delete("/api/students/:id", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const { permanent } = req.query;
  const student = dbStore.getStudents().find(s => s.id === id);
  if (!student) return res.status(404).json({ error: "Student not found" });

  if (req.user.role !== "SUPER_ADMIN" && student.orgId !== req.user.orgId) {
    return res.status(403).json({ error: "Access denied. You do not have permission to delete this student." });
  }

  const editorId = req.user.id;
  const editorName = req.user.name || "Staff";

  if (permanent === "true") {
    dbStore.permanentlyDeleteStudent(id);
    logAction(editorId, editorName, student.orgId, "PERMANENT_DELETE_STUDENT", `Permanently deleted student ${student.name} (${student.studentId})`);
  } else {
    dbStore.deleteStudent(id);
    logAction(editorId, editorName, student.orgId, "DELETE_STUDENT", `Deactivated/Soft-deleted student ${student.name} (${student.studentId})`);
  }
  res.json({ success: true });
});


// ==========================================
// MEMBERSHIP PLAN MANAGEMENT
// ==========================================

app.post("/api/saas/upgrade", authenticateToken, requireTenant, (req: any, res) => {
  const { planId } = req.body;
  const userOrgId = req.user.orgId;
  if (!userOrgId) {
    return res.status(400).json({ error: "No organization associated with this account." });
  }

  const validPlan = SAAS_PLANS.find(p => p.id === planId);
  if (!validPlan) {
    return res.status(400).json({ error: "Invalid SaaS plan selected." });
  }

  dbStore.updateOrganization(userOrgId, { planId });
  const updatedOrg = dbStore.getOrganizations().find(o => o.id === userOrgId);

  logAction(req.user.id, req.user.name || "Admin", userOrgId, "SAAS_UPGRADE", `Upgraded organization subscription to plan: ${validPlan.name}`);
  res.json({ success: true, organization: updatedOrg });
});

app.get("/api/plans", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });
  res.json(dbStore.getPlans().filter(p => p.orgId === orgId));
});

app.post("/api/plans", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId, name, durationType, durationDays, price, seatType, timing, description } = req.body;
  if (!orgId || !name || !price) {
    return res.status(400).json({ error: "Missing required plan parameters." });
  }

  const newPlan: MembershipPlan = {
    id: `plan-${Date.now()}`,
    orgId,
    name,
    durationType,
    durationDays: Number(durationDays),
    price: Number(price),
    seatType,
    timing,
    description,
    status: "active",
    createdAt: new Date().toISOString()
  };

  dbStore.addPlan(newPlan);
  logAction(req.user.id, req.user.name || "Admin", orgId, "CREATE_PLAN", `Created plan ${name} for ${price} INR.`);
  res.json(newPlan);
});

app.put("/api/plans/:id", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const data = req.body;

  const plan = dbStore.getPlans().find(p => p.id === id);
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  if (req.user.role !== "SUPER_ADMIN" && plan.orgId !== req.user.orgId) {
    return res.status(403).json({ error: "Access denied. You do not have permission to modify this plan." });
  }

  dbStore.updatePlan(id, data);
  const updated = dbStore.getPlans().find(p => p.id === id);
  res.json(updated);
});

app.delete("/api/plans/:id", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const plan = dbStore.getPlans().find(p => p.id === id);
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  if (req.user.role !== "SUPER_ADMIN" && plan.orgId !== req.user.orgId) {
    return res.status(403).json({ error: "Access denied. You do not have permission to delete this plan." });
  }

  dbStore.deletePlan(id);
  logAction(req.user.id, req.user.name || "Admin", plan.orgId, "DELETE_PLAN", `Deleted membership plan: ${plan.name}`);
  res.json({ success: true });
});


// ==========================================
// MEMBERSHIPS & RENEWALS
// ==========================================

app.get("/api/memberships", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });
  res.json(dbStore.getMemberships().filter(m => m.orgId === orgId));
});

// Create / Purchase / Renew Membership
app.post("/api/memberships", authenticateToken, requireTenant, (req: any, res) => {
  const {
    orgId, studentId, planId, startDate, price, paidAmount, paymentMethod,
    discount, couponCode, notes, assignSeatId
  } = req.body;

  const creatorId = req.user.id;
  const creatorName = req.user.name || "Staff";

  if (!orgId || !studentId || !planId || !startDate) {
    return res.status(400).json({ error: "Missing required membership parameters." });
  }

  const student = dbStore.getStudents().find(s => s.id === studentId);
  const plan = dbStore.getPlans().find(p => p.id === planId);
  if (!student || !plan) {
    return res.status(404).json({ error: "Student or Plan not found." });
  }

  // Calculate End Date
  const start = new Date(startDate);
  start.setDate(start.getDate() + plan.durationDays);
  const endDate = start.toISOString().split("T")[0];

  const membershipId = `memb-${Date.now()}`;
  const newMembership: Membership = {
    id: membershipId,
    orgId,
    studentId,
    planId,
    startDate,
    endDate,
    price: Number(price),
    paidAmount: Number(paidAmount),
    status: "active",
    createdAt: new Date().toISOString()
  };

  dbStore.addMembership(newMembership);

  // Update student status to active
  dbStore.updateStudent(studentId, { status: "active" });

  // Record Payment
  const netPaid = Number(paidAmount);
  const totalDue = Number(price) - Number(discount || 0);
  const balance = Math.max(0, totalDue - netPaid);

  const paymentId = `pay-${Date.now()}`;
  const newPayment: Payment = {
    id: paymentId,
    orgId,
    studentId,
    membershipId,
    amount: Number(price),
    discount: Number(discount || 0),
    couponCode: couponCode || "",
    netPaid,
    balance,
    method: paymentMethod || "cash",
    notes: notes || "Membership fee collection",
    date: startDate,
    status: balance === 0 ? "paid" : "partial",
    createdAt: new Date().toISOString()
  };
  dbStore.addPayment(newPayment);

  // Generate Invoice/Receipt details
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  dbStore.addInvoice({
    id: `inv-${Date.now()}`,
    orgId,
    paymentId,
    invoiceNumber: `INV-${student.studentId}-${randomNum}`,
    receiptNumber: `REC-${student.studentId}-${randomNum}`,
    issuedAt: new Date().toISOString()
  });

  // Assign Seat if provided
  if (assignSeatId) {
    // Unassign student from any existing seats first
    dbStore.getSeats()
      .filter(s => s.assignedStudentId === studentId)
      .forEach(s => dbStore.updateSeat(s.id, { status: "available", assignedStudentId: null }));

    // Assign new seat
    dbStore.updateSeat(assignSeatId, {
      status: "occupied",
      assignedStudentId: studentId
    });

    // Record seat assignment history
    dbStore.addSeatHistory({
      id: `sh-${Date.now()}`,
      orgId,
      seatId: assignSeatId,
      studentId,
      action: "assign",
      targetSeatId: null,
      timestamp: new Date().toISOString()
    });
  }

  // Generate Notification
  dbStore.addNotification({
    id: `not-${Date.now()}`,
    orgId,
    title: "Membership Active!",
    message: `Dear ${student.name}, your membership plan '${plan.name}' has been activated until ${endDate}. Invoice invoice generated successfully.`,
    type: "welcome",
    status: "unread",
    studentId,
    createdAt: new Date().toISOString()
  });

  // Trigger WhatsApp Welcome & Payment Receipt Alert if enabled
  try {
    const config = dbStore.getWhatsAppConfigs().find(c => c.orgId === orgId);
    if (config && config.enabled) {
      const org = dbStore.getOrganizations().find(o => o.id === orgId);
      const seatNo = assignSeatId 
        ? (dbStore.getSeats().find(s => s.id === assignSeatId)?.seatNumber || "Unassigned")
        : "Unassigned";
      
      const welcomeMsg = replaceTemplatePlaceholders(config.templates.welcome, {
        name: student.name,
        org_name: org ? org.name : "Reading Room",
        end_date: endDate,
        seat_number: seatNo
      });

      dbStore.addWhatsAppLog({
        id: `wal-${Date.now()}`,
        orgId,
        studentId: student.id,
        studentName: student.name,
        phone: student.phone,
        type: "welcome",
        message: welcomeMsg,
        status: "delivered",
        timestamp: new Date().toISOString()
      });

      const receiptMsg = replaceTemplatePlaceholders(config.templates.paymentReceipt, {
        name: student.name,
        org_name: org ? org.name : "Reading Room",
        end_date: endDate,
        seat_number: seatNo,
        amount: Number(paidAmount),
        currency: org ? org.currency : "INR",
        plan_name: plan.name
      });

      dbStore.addWhatsAppLog({
        id: `wal-rec-${Date.now()}`,
        orgId,
        studentId: student.id,
        studentName: student.name,
        phone: student.phone,
        type: "paymentReceipt",
        message: receiptMsg,
        status: "delivered",
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("Failed to auto-send WhatsApp alert on membership activation:", err);
  }

  logAction(creatorId || "unknown", creatorName || "Staff", orgId, "CREATE_MEMBERSHIP", `Activated membership for student ${student.name} (${student.studentId}) on plan ${plan.name}`);

  res.json({ membership: newMembership, payment: newPayment });
});

// Update membership status (pause, cancel)
app.put("/api/memberships/:id/status", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body; // paused, cancelled, expired, active
  const updaterId = req.user.id;
  const updaterName = req.user.name || "Staff";

  const memb = dbStore.getMemberships().find(m => m.id === id);
  if (!memb) return res.status(404).json({ error: "Membership not found" });

  if (req.user.role !== "SUPER_ADMIN" && memb.orgId !== req.user.orgId) {
    return res.status(403).json({ error: "Access denied. You do not have permission to modify this membership status." });
  }

  dbStore.updateMembership(id, { status });

  // If paused or cancelled, free up the seat
  if (status === "paused" || status === "cancelled" || status === "expired") {
    const assignedSeat = dbStore.getSeats().find(s => s.assignedStudentId === memb.studentId);
    if (assignedSeat) {
      dbStore.updateSeat(assignedSeat.id, { status: "available", assignedStudentId: null });
      dbStore.addSeatHistory({
        id: `sh-${Date.now()}`,
        orgId: memb.orgId,
        seatId: assignedSeat.id,
        studentId: memb.studentId,
        action: "release",
        targetSeatId: null,
        timestamp: new Date().toISOString()
      });
    }

    if (status === "expired" || status === "cancelled") {
      dbStore.updateStudent(memb.studentId, { status: "expired" });
    }
  }

  logAction(updaterId, updaterName, memb.orgId, "MEMBERSHIP_STATUS_CHANGE", `Updated membership ID ${id} status to ${status}`);
  res.json({ success: true });
});

app.put("/api/memberships/:id", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const { planId, startDate, endDate, price, paidAmount, status } = req.body;
  const updaterId = req.user.id;
  const updaterName = req.user.name || "Staff";

  const memb = dbStore.getMemberships().find(m => m.id === id);
  if (!memb) return res.status(404).json({ error: "Membership not found" });

  if (req.user.role !== "SUPER_ADMIN" && memb.orgId !== req.user.orgId) {
    return res.status(403).json({ error: "Access denied. You do not have permission to modify this membership." });
  }

  dbStore.updateMembership(id, {
    planId,
    startDate,
    endDate,
    price: Number(price),
    paidAmount: Number(paidAmount),
    status
  });

  const updated = dbStore.getMemberships().find(m => m.id === id);
  logAction(updaterId, updaterName, memb.orgId, "UPDATE_MEMBERSHIP", `Updated membership details for ID: ${id}`);
  res.json(updated);
});

app.delete("/api/memberships/:id", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const memb = dbStore.getMemberships().find(m => m.id === id);
  if (!memb) return res.status(404).json({ error: "Membership not found" });

  if (req.user.role !== "SUPER_ADMIN" && memb.orgId !== req.user.orgId) {
    return res.status(403).json({ error: "Access denied. You do not have permission to delete this membership." });
  }

  const editorId = req.user.id;
  const editorName = req.user.name || "Staff";

  dbStore.deleteMembership(id);
  logAction(editorId, editorName, memb.orgId, "DELETE_MEMBERSHIP", `Deleted membership with ID: ${id}`);
  res.json({ success: true });
});


// ==========================================
// REPORTS & ALERTS (EXPIRING & PENDING ACTIONS)
// ==========================================

// Get memberships expiring soon
app.get("/api/reports/expiring", (req, res) => {
  const { orgId, days = 10 } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });

  const today = new Date();
  const limitDate = new Date();
  limitDate.setDate(today.getDate() + Number(days));

  const memberships = dbStore.getMemberships().filter(m => m.orgId === orgId && m.status === "active");
  const students = dbStore.getStudents().filter(s => s.orgId === orgId);
  const plans = dbStore.getPlans().filter(p => p.orgId === orgId);
  const seats = dbStore.getSeats().filter(s => s.orgId === orgId);

  const expiringList = memberships
    .filter(m => {
      const end = new Date(m.endDate);
      return end >= today && end <= limitDate;
    })
    .map(m => {
      const student = students.find(s => s.id === m.studentId);
      const plan = plans.find(p => p.id === m.planId);
      const seat = seats.find(s => s.assignedStudentId === m.studentId);
      const daysRemaining = Math.max(0, Math.ceil((new Date(m.endDate).getTime() - today.getTime()) / (1000 * 3600 * 24)));
      return {
        id: m.id,
        membership: m,
        student,
        plan,
        seat,
        daysRemaining
      };
    });

  res.json(expiringList);
});

// Get pending administrative actions
app.get("/api/reports/pending-actions", (req, res) => {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });

  const students = dbStore.getStudents().filter(s => s.orgId === orgId);
  const memberships = dbStore.getMemberships().filter(m => m.orgId === orgId);
  const seats = dbStore.getSeats().filter(s => s.orgId === orgId);
  const payments = dbStore.getPayments().filter(p => p.orgId === orgId);
  const org = dbStore.getOrganizations().find(o => o.id === orgId);
  const currencySymbol = org?.currency === "USD" ? "$" : "₹";

  const actions: any[] = [];

  // 1. Registered students who are inactive and have no memberships
  students
    .filter(s => s.status === "inactive")
    .forEach(s => {
      actions.push({
        id: `pending-inactive-${s.id}`,
        type: "inactive_student",
        title: "Registration Pending Plan",
        description: `${s.name} (${s.studentId}) is registered but does not have any active subscription plan setup.`,
        severity: "medium",
        student: s,
        targetId: s.id,
        actionLabel: "Assign Pass"
      });
    });

  // 2. Students who are expired
  students
    .filter(s => s.status === "expired")
    .forEach(s => {
      const seat = seats.find(st => st.assignedStudentId === s.id);
      const lastMemb = memberships
        .filter(m => m.studentId === s.id)
        .sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
      actions.push({
        id: `pending-expired-${s.id}`,
        type: "expired_student",
        title: "Membership Expired",
        description: `${s.name}'s subscription expired on ${lastMemb?.endDate || "N/A"}.${
          seat ? ` Seat ${seat.seatNumber} is still occupied.` : " Seat released."
        }`,
        severity: "high",
        student: s,
        seat: seat,
        targetId: s.id,
        actionLabel: "Renew Pass"
      });
    });

  // 3. Partial payments
  payments
    .filter(p => p.status === "partial" && p.balance > 0)
    .forEach(p => {
      const student = students.find(s => s.id === p.studentId);
      actions.push({
        id: `pending-balance-${p.id}`,
        type: "pending_balance",
        title: "Balance Payment Due",
        description: `${student?.name || "Student"} has a pending balance of ${currencySymbol}${p.balance} for registration / seat purchase.`,
        severity: "medium",
        student,
        payment: p,
        targetId: p.id,
        actionLabel: "Collect Dues"
      });
    });

  // 4. Seats blocked for maintenance
  seats
    .filter(s => s.status === "maintenance")
    .forEach(s => {
      actions.push({
        id: `pending-maint-${s.id}`,
        type: "seat_maintenance",
        title: "Seat Blocked",
        description: `Silent Seat ${s.seatNumber} is blocked for maintenance.`,
        severity: "low",
        seat: s,
        targetId: s.id,
        actionLabel: "Restore Seat"
      });
    });

  const total = actions.length;
  const limitStr = req.query.limit as string | undefined;
  const offsetStr = req.query.offset as string | undefined;

  if (limitStr !== undefined) {
    const limit = parseInt(limitStr, 10);
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
    const slicedActions = actions.slice(offset, offset + limit);
    return res.json({
      actions: slicedActions,
      total,
      hasMore: offset + limit < total
    });
  }

  res.json(actions);
});

// Settle outstanding payment balance dues
app.put("/api/payments/:id/settle", (req, res) => {
  const { id } = req.params;
  const pay = dbStore.getPayments().find(p => p.id === id);
  if (!pay) return res.status(404).json({ error: "Payment record not found" });

  dbStore.updatePayment(id, {
    netPaid: pay.amount - pay.discount,
    balance: 0,
    status: "paid"
  });

  const updated = dbStore.getPayments().find(p => p.id === id);
  logAction("unknown", "Staff", pay?.orgId || null, "SETTLE_PAYMENT", `Settled outstanding dues balance for payment receipt ${pay.id}`);
  res.json({ success: true, payment: updated });
});


// ==========================================
// SEAT & LAYOUT MANAGEMENT
// ==========================================

app.get("/api/layout/structures", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });

  res.json({
    buildings: dbStore.getBuildings().filter(b => b.orgId === orgId),
    floors: dbStore.getFloors().filter(f => f.orgId === orgId),
    rooms: dbStore.getRooms().filter(r => r.orgId === orgId),
    seats: dbStore.getSeats().filter(s => s.orgId === orgId),
    seatHistory: dbStore.getSeatHistory().filter(sh => sh.orgId === orgId)
  });
});

app.post("/api/layout/buildings", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId, name } = req.body;
  const newBld = { id: `bld-${Date.now()}`, orgId, name, createdAt: new Date().toISOString() };
  dbStore.addBuilding(newBld);
  res.json(newBld);
});

app.post("/api/layout/floors", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId, buildingId, name } = req.body;
  const newFlr = { id: `flr-${Date.now()}`, orgId, buildingId, name, createdAt: new Date().toISOString() };
  dbStore.addFloor(newFlr);
  res.json(newFlr);
});

app.post("/api/layout/rooms", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId, floorId, name } = req.body;
  const newRm = { id: `rm-${Date.now()}`, orgId, floorId, name, createdAt: new Date().toISOString() };
  dbStore.addRoom(newRm);
  res.json(newRm);
});

app.post("/api/seats", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId, roomId, seatNumber, type, notes, row } = req.body;
  
  // SaaS seat limits enforcement
  const org = dbStore.getOrganizations().find(o => o.id === orgId);
  const planId = org?.planId || "basic";
  const limitObj = SAAS_PLANS.find(p => p.id === planId) || SAAS_PLANS[0];
  
  const currentSeatsCount = dbStore.getSeats().filter(s => s.orgId === orgId).length;
  if (currentSeatsCount >= limitObj.maxSeats) {
    return res.status(403).json({
      error: `Upgrade Required: Your current plan (${limitObj.name}) allows a maximum of ${limitObj.maxSeats} seats. You have currently generated ${currentSeatsCount} seats. Please upgrade your SaaS plan to create more seats.`
    });
  }

  const newSeat: Seat = {
    id: `seat-${Date.now()}`,
    orgId,
    roomId,
    seatNumber,
    type: type || "AC",
    status: "available",
    assignedStudentId: null,
    notes: notes || "",
    row: row || "Row A",
    createdAt: new Date().toISOString()
  };
  dbStore.addSeat(newSeat);
  res.json(newSeat);
});

app.put("/api/seats/:id", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const data = req.body;
  
  const seat = dbStore.getSeats().find(s => s.id === id);
  if (!seat) return res.status(404).json({ error: "Seat not found" });

  if (req.user.role !== "SUPER_ADMIN" && seat.orgId !== req.user.orgId) {
    return res.status(403).json({ error: "Access denied. You do not have permission to modify this seat." });
  }

  dbStore.updateSeat(id, data);
  res.json(dbStore.getSeats().find(s => s.id === id));
});

// Seat Transfers, Blocks, Releases
app.post("/api/seats/actions", (req, res) => {
  const { action, orgId, seatId, studentId, targetSeatId, notes, creatorId, creatorName } = req.body;
  if (!orgId || !action) return res.status(400).json({ error: "Missing parameters" });

  const seat = dbStore.getSeats().find(s => s.id === seatId);

  if (action === "release") {
    if (!seat) return res.status(404).json({ error: "Seat not found" });
    const formerStudentId = seat.assignedStudentId;
    dbStore.updateSeat(seatId, { status: "available", assignedStudentId: null });
    
    if (formerStudentId) {
      dbStore.addSeatHistory({
        id: `sh-${Date.now()}`,
        orgId,
        seatId,
        studentId: formerStudentId,
        action: "release",
        targetSeatId: null,
        timestamp: new Date().toISOString()
      });
    }
    logAction(creatorId || "unknown", creatorName || "Staff", orgId, "RELEASE_SEAT", `Released seat ${seat.seatNumber}`);
    return res.json({ success: true });
  }

  if (action === "block") {
    if (!seat) return res.status(404).json({ error: "Seat not found" });
    dbStore.updateSeat(seatId, { status: "maintenance", assignedStudentId: null });
    logAction(creatorId || "unknown", creatorName || "Staff", orgId, "BLOCK_SEAT", `Blocked seat ${seat.seatNumber} for maintenance`);
    return res.json({ success: true });
  }

  if (action === "transfer") {
    if (!seat || !targetSeatId || !studentId) {
      return res.status(400).json({ error: "Missing transfer details (seatId, targetSeatId, studentId)" });
    }
    const targetSeat = dbStore.getSeats().find(s => s.id === targetSeatId);
    if (!targetSeat) return res.status(404).json({ error: "Target seat not found" });

    // Free the source seat
    dbStore.updateSeat(seatId, { status: "available", assignedStudentId: null });

    // Occupy target seat
    dbStore.updateSeat(targetSeatId, { status: "occupied", assignedStudentId: studentId });

    // Add seat assignment transfer logs
    dbStore.addSeatHistory({
      id: `sh-${Date.now()}`,
      orgId,
      seatId,
      studentId,
      action: "transfer",
      targetSeatId: targetSeatId,
      timestamp: new Date().toISOString()
    });

    logAction(creatorId || "unknown", creatorName || "Staff", orgId, "TRANSFER_SEAT", `Transferred student ID ${studentId} from seat ${seat.seatNumber} to ${targetSeat.seatNumber}`);
    return res.json({ success: true });
  }

  if (action === "assign") {
    if (!seat || !studentId) return res.status(400).json({ error: "Missing assignment details" });
    
    // Free existing seats for this student
    dbStore.getSeats()
      .filter(s => s.assignedStudentId === studentId)
      .forEach(s => dbStore.updateSeat(s.id, { status: "available", assignedStudentId: null }));

    // Occupy
    dbStore.updateSeat(seatId, { status: "occupied", assignedStudentId: studentId });

    dbStore.addSeatHistory({
      id: `sh-${Date.now()}`,
      orgId,
      seatId,
      studentId,
      action: "assign",
      targetSeatId: null,
      timestamp: new Date().toISOString()
    });

    logAction(creatorId || "unknown", creatorName || "Staff", orgId, "ASSIGN_SEAT", `Assigned seat ${seat.seatNumber} to student ${studentId}`);
    return res.json({ success: true });
  }

  res.status(400).json({ error: "Unsupported action" });
});


// ==========================================
// ATTENDANCE MANAGEMENT
// ==========================================

app.get("/api/attendance", (req, res) => {
  const { orgId, date } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });

  let attendances = dbStore.getAttendances().filter(a => a.orgId === orgId);
  if (date) {
    attendances = attendances.filter(a => a.date === date);
  }
  res.json(attendances);
});

// Scan QR or Manual Check-in / Check-out
app.post("/api/attendance/check", (req, res) => {
  const { orgId, studentId, qrCode, method, creatorId, creatorName } = req.body;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });

  let student: Student | undefined;
  if (qrCode) {
    student = dbStore.getStudents().find(s => s.orgId === orgId && s.qrCode === qrCode);
  } else if (studentId) {
    student = dbStore.getStudents().find(s => s.id === studentId);
  }

  if (!student) {
    return res.status(404).json({ error: "Student not found or unrecognized QR code." });
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const currentTimeStr = new Date().toLocaleTimeString("en-US", { hour12: false }).substr(0, 5);

  // Check if attendance record exists for today
  let attendance = dbStore.getAttendances().find(a => a.orgId === orgId && a.studentId === student!.id && a.date === todayStr);

  if (!attendance) {
    // Record Check-in
    attendance = {
      id: `att-${Date.now()}`,
      orgId,
      studentId: student.id,
      date: todayStr,
      checkInTime: currentTimeStr,
      checkOutTime: null,
      method: method || "manual",
      status: "present"
    };
    dbStore.addAttendance(attendance);
    logAction(creatorId || "unknown", creatorName || "Attendance System", orgId, "CHECK_IN", `Checked in student ${student.name} (${student.studentId}) via ${method || 'manual'}`);
    return res.json({ message: `${student.name} checked in successfully at ${currentTimeStr}.`, attendance });
  } else if (!attendance.checkOutTime) {
    // Record Check-out
    dbStore.updateAttendance(attendance.id, { checkOutTime: currentTimeStr });
    attendance = dbStore.getAttendances().find(a => a.id === attendance!.id);
    logAction(creatorId || "unknown", creatorName || "Attendance System", orgId, "CHECK_OUT", `Checked out student ${student.name} (${student.studentId})`);
    return res.json({ message: `${student.name} checked out successfully at ${currentTimeStr}.`, attendance });
  } else {
    return res.status(400).json({ error: "Student has already completed check-in and check-out for today." });
  }
});


// ==========================================
// REVENUE & EXPENSE & PAYMENTS
// ==========================================

app.get("/api/payments", (req, res) => {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });
  res.json(dbStore.getPayments().filter(p => p.orgId === orgId));
});

app.get("/api/payments/invoices", (req, res) => {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });
  res.json(dbStore.getInvoices().filter(i => i.orgId === orgId));
});

// Expenses
app.get("/api/expenses", (req, res) => {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });
  res.json(dbStore.getExpenses().filter(e => e.orgId === orgId));
});

app.post("/api/expenses", (req, res) => {
  const { orgId, title, category, amount, date, description } = req.body;
  if (!orgId || !title || !amount) return res.status(400).json({ error: "Missing required parameters." });

  const newExp: Expense = {
    id: `exp-${Date.now()}`,
    orgId,
    title,
    category: category || "General",
    amount: Number(amount),
    date: date || new Date().toISOString().split("T")[0],
    description: description || ""
  };
  dbStore.addExpense(newExp);
  logAction("unknown", "Admin", orgId, "RECORD_EXPENSE", `Recorded expense: ${title} (${amount} INR)`);
  res.json(newExp);
});

app.delete("/api/expenses/:id", (req, res) => {
  const { id } = req.params;
  const exp = dbStore.getExpenses().find(e => e.id === id);
  if (!exp) return res.status(404).json({ error: "Expense not found" });
  dbStore.deleteExpense(id);
  res.json({ success: true });
});


// ==========================================
// NOTIFICATIONS
// ==========================================

app.get("/api/notifications", (req, res) => {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });
  res.json(dbStore.getNotifications().filter(n => n.orgId === orgId));
});

app.put("/api/notifications/:id", (req, res) => {
  const { id } = req.params;
  dbStore.updateNotification(id, { status: "sent" });
  res.json({ success: true });
});


// ==========================================
// WHATSAPP & AUTOMATED RENEWAL SYSTEM
// ==========================================

function replaceTemplatePlaceholders(
  template: string,
  data: {
    name: string;
    org_name: string;
    end_date: string;
    seat_number: string;
    days?: number;
    amount?: number;
    currency?: string;
    plan_name?: string;
  }
): string {
  let text = template;
  text = text.replace(/\{\{\s*name\s*\}\}/g, data.name || "");
  text = text.replace(/\{\{\s*org_name\s*\}\}/g, data.org_name || "");
  text = text.replace(/\{\{\s*end_date\s*\}\}/g, data.end_date || "");
  text = text.replace(/\{\{\s*seat_number\s*\}\}/g, data.seat_number || "Unassigned");
  if (data.days !== undefined) {
    text = text.replace(/\{\{\s*days\s*\}\}/g, String(data.days));
  }
  if (data.amount !== undefined) {
    text = text.replace(/\{\{\s*amount\s*\}\}/g, String(data.amount));
  }
  if (data.currency !== undefined) {
    text = text.replace(/\{\{\s*currency\s*\}\}/g, data.currency || "INR");
  }
  if (data.plan_name !== undefined) {
    text = text.replace(/\{\{\s*plan_name\s*\}\}/g, data.plan_name || "");
  }
  return text;
}

app.get("/api/whatsapp/config", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });

  let config = dbStore.getWhatsAppConfigs().find(c => c.orgId === orgId);
  if (!config) {
    dbStore.updateWhatsAppConfig(orgId as string, {});
    config = dbStore.getWhatsAppConfigs().find(c => c.orgId === orgId);
  }
  res.json(config);
});

app.put("/api/whatsapp/config", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId, enabled, provider, apiKey, phoneId, senderNumber, templates, triggerDaysBefore } = req.body;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });

  dbStore.updateWhatsAppConfig(orgId, {
    enabled,
    provider,
    apiKey,
    phoneId,
    senderNumber,
    templates,
    triggerDaysBefore: Number(triggerDaysBefore)
  });

  res.json({ success: true, config: dbStore.getWhatsAppConfigs().find(c => c.orgId === orgId) });
});

app.get("/api/whatsapp/logs", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });
  res.json(dbStore.getWhatsAppLogs().filter(l => l.orgId === orgId));
});

app.post("/api/whatsapp/test", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId, phone, type, studentId, studentName, message } = req.body;
  if (!orgId || !phone) return res.status(400).json({ error: "orgId and phone are required" });

  const logId = `wal-${Date.now()}`;
  const newLog: WhatsAppLog = {
    id: logId,
    orgId,
    studentId: studentId || "unknown",
    studentName: studentName || "Test User",
    phone,
    type: type || "welcome",
    message: message || "This is a test WhatsApp alert from Reading Room SaaS.",
    status: "delivered",
    timestamp: new Date().toISOString()
  };

  dbStore.addWhatsAppLog(newLog);
  res.json({ success: true, log: newLog });
});

app.post("/api/whatsapp/trigger-renewals", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId, simulateDate } = req.body;
  const creatorId = req.user.id;
  const creatorName = req.user.name || "Staff";
  if (!orgId) return res.status(400).json({ error: "orgId is required" });

  const org = dbStore.getOrganizations().find(o => o.id === orgId);
  if (!org) return res.status(404).json({ error: "Organization not found" });

  const whatsappConfigList = dbStore.getWhatsAppConfigs();
  let config = whatsappConfigList.find(c => c.orgId === orgId);
  if (!config) {
    dbStore.updateWhatsAppConfig(orgId, {});
    config = dbStore.getWhatsAppConfigs().find(c => c.orgId === orgId)!;
  }

  const today = simulateDate ? new Date(simulateDate) : new Date();
  const todayStr = today.toISOString().split("T")[0];

  const memberships = dbStore.getMemberships().filter(m => m.orgId === orgId);
  const students = dbStore.getStudents().filter(s => s.orgId === orgId);
  const plans = dbStore.getPlans().filter(p => p.orgId === orgId);
  const seats = dbStore.getSeats().filter(s => s.orgId === orgId);

  const results = {
    warningsSent: 0,
    expirationsProcessed: 0,
    autoRenewalsTriggered: 0,
    logs: [] as string[]
  };

  memberships.forEach(m => {
    const student = students.find(s => s.id === m.studentId);
    if (!student) return;

    const plan = plans.find(p => p.id === m.planId);
    if (!plan) return;

    const seat = seats.find(s => s.assignedStudentId === student.id);
    const seatNumber = seat ? seat.seatNumber : "Unassigned";

    const end = new Date(m.endDate);
    const timeDiff = end.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (m.status === "active" && daysDiff > 0 && daysDiff <= config!.triggerDaysBefore) {
      const logs = dbStore.getWhatsAppLogs().filter(l => l.orgId === orgId && l.studentId === student.id && l.type === "upcomingRenewal");
      const alreadySent = logs.some(l => {
        const logDate = l.timestamp.split("T")[0];
        return logDate === todayStr;
      });

      if (!alreadySent) {
        const template = config!.templates.upcomingRenewal;
        const msg = replaceTemplatePlaceholders(template, {
          name: student.name,
          org_name: org.name,
          end_date: m.endDate,
          seat_number: seatNumber,
          days: daysDiff
        });

        dbStore.addWhatsAppLog({
          id: `wal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          orgId,
          studentId: student.id,
          studentName: student.name,
          phone: student.phone,
          type: "upcomingRenewal",
          message: msg,
          status: "delivered",
          timestamp: new Date().toISOString()
        });

        dbStore.addNotification({
          id: `not-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          orgId,
          title: "WhatsApp Renewal Alert Dispatched",
          message: `Auto-triggered subscription warning to ${student.name} (${daysDiff} days remaining).`,
          type: "expiry",
          status: "unread",
          studentId: student.id,
          createdAt: new Date().toISOString()
        });

        results.warningsSent++;
        results.logs.push(`Sent upcoming renewal warning to ${student.name} (${daysDiff} days left).`);
      }
    }

    if (m.status === "active" && daysDiff <= 0) {
      const isAutoRenewEnabled = student.notes.toLowerCase().includes("auto-renew") || student.notes.toLowerCase().includes("upsc") || false;

      if (isAutoRenewEnabled) {
        const newStart = m.endDate;
        const newEnd = new Date(new Date(m.endDate).getTime() + (plan.durationDays * 24 * 3600 * 1000)).toISOString().split("T")[0];

        dbStore.updateMembership(m.id, { status: "expired" });

        const newMembId = `memb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        dbStore.addMembership({
          id: newMembId,
          orgId,
          studentId: student.id,
          planId: plan.id,
          startDate: newStart,
          endDate: newEnd,
          price: plan.price,
          paidAmount: plan.price,
          status: "active",
          createdAt: new Date().toISOString()
        });

        const payId = `pay-${Date.now()}`;
        dbStore.addPayment({
          id: payId,
          orgId,
          studentId: student.id,
          membershipId: newMembId,
          amount: plan.price,
          discount: 0,
          couponCode: "",
          netPaid: plan.price,
          balance: 0,
          method: "upi",
          notes: "Automated recurring UPI subscription renewal.",
          date: todayStr,
          status: "paid",
          createdAt: new Date().toISOString()
        });

        dbStore.addInvoice({
          id: `inv-${Date.now()}`,
          orgId,
          paymentId: payId,
          invoiceNumber: `INV-AUT-${Date.now().toString().substr(7)}`,
          receiptNumber: `REC-AUT-${Date.now().toString().substr(7)}`,
          issuedAt: new Date().toISOString()
        });

        const template = config!.templates.paymentReceipt;
        const msg = replaceTemplatePlaceholders(template, {
          name: student.name,
          org_name: org.name,
          end_date: newEnd,
          seat_number: seatNumber,
          amount: plan.price,
          currency: org.currency,
          plan_name: plan.name
        });

        dbStore.addWhatsAppLog({
          id: `wal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          orgId,
          studentId: student.id,
          studentName: student.name,
          phone: student.phone,
          type: "paymentReceipt",
          message: msg,
          status: "delivered",
          timestamp: new Date().toISOString()
        });

        dbStore.addNotification({
          id: `not-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          orgId,
          title: "WhatsApp Subscription Auto-Renewed",
          message: `Auto-renewed subscription for ${student.name}. Seat ${seatNumber} retained. WhatsApp receipt dispatched.`,
          type: "payment",
          status: "unread",
          studentId: student.id,
          createdAt: new Date().toISOString()
        });

        dbStore.addAuditLog({
          id: `aud-${Date.now()}`,
          orgId,
          userId: creatorId || "system-cron",
          userName: creatorName || "Automated Renewal Scheduler",
          action: "AUTO_RENEW_MEMBERSHIP",
          details: `Successfully auto-renewed plan '${plan.name}' for ${student.name}. Retained seat ${seatNumber}. Total billed: ${plan.price} ${org.currency}`,
          timestamp: new Date().toISOString()
        });

        results.autoRenewalsTriggered++;
        results.logs.push(`Auto-renewed subscription for ${student.name} till ${newEnd}.`);
      } else {
        dbStore.updateMembership(m.id, { status: "expired" });

        if (seat) {
          dbStore.updateSeat(seat.id, { status: "available", assignedStudentId: null });
          dbStore.addSeatHistory({
            id: `sh-${Date.now()}`,
            orgId,
            seatId: seat.id,
            studentId: student.id,
            action: "release",
            targetSeatId: null,
            timestamp: new Date().toISOString()
          });
        }

        dbStore.updateStudent(student.id, { status: "expired" });

        const template = config!.templates.expiredAlert;
        const msg = replaceTemplatePlaceholders(template, {
          name: student.name,
          org_name: org.name,
          end_date: m.endDate,
          seat_number: seatNumber
        });

        dbStore.addWhatsAppLog({
          id: `wal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          orgId,
          studentId: student.id,
          studentName: student.name,
          phone: student.phone,
          type: "expiredAlert",
          message: msg,
          status: "delivered",
          timestamp: new Date().toISOString()
        });

        dbStore.addNotification({
          id: `not-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          orgId,
          title: "Membership Expired (WhatsApp Sent)",
          message: `Membership expired for ${student.name}. Seat ${seatNumber} has been released.`,
          type: "expiry",
          status: "unread",
          studentId: student.id,
          createdAt: new Date().toISOString()
        });

        dbStore.addAuditLog({
          id: `aud-${Date.now()}`,
          orgId,
          userId: creatorId || "system-cron",
          userName: creatorName || "Automated Renewal Scheduler",
          action: "MEMBERSHIP_EXPIRED",
          details: `Membership for ${student.name} expired on ${m.endDate}. Seat ${seatNumber} released.`,
          timestamp: new Date().toISOString()
        });

        results.expirationsProcessed++;
        results.logs.push(`Processed expiration for ${student.name}. Seat ${seatNumber} released.`);
      }
    }
  });

  res.json({ success: true, results });
});



// ==========================================
// AUDIT LOGS & ANNOUNCEMENTS
// ==========================================

app.get("/api/audit-logs", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId } = req.query;
  // If no orgId is supplied and user is superadmin, return all logs.
  // Otherwise, it was forced to their own orgId by requireTenant.
  if (!orgId && req.user.role === "SUPER_ADMIN") {
    return res.json(dbStore.getAuditLogs());
  }
  res.json(dbStore.getAuditLogs().filter(a => a.orgId === orgId));
});

app.get("/api/announcements", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId } = req.query;
  // Get platform-wide (null) + org-specific announcements
  const announcements = dbStore.getAnnouncements().filter(a => a.orgId === null || a.orgId === orgId);
  res.json(announcements);
});

app.post("/api/announcements", authenticateToken, requireTenant, (req: any, res) => {
  const { orgId, title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Missing announcement title or content" });

  const finalOrgId = req.user.role === "SUPER_ADMIN" ? (orgId || null) : req.user.orgId;

  const newAnn = {
    id: `ann-${Date.now()}`,
    orgId: finalOrgId,
    title,
    content,
    createdAt: new Date().toISOString()
  };
  dbStore.addAnnouncement(newAnn);
  res.json(newAnn);
});

app.delete("/api/announcements/:id", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const ann = dbStore.getAnnouncements().find(a => a.id === id);
  if (!ann) return res.status(404).json({ error: "Announcement not found" });

  if (req.user.role !== "SUPER_ADMIN" && ann.orgId !== req.user.orgId) {
    return res.status(403).json({ error: "Access denied." });
  }

  dbStore.deleteAnnouncement(id);
  res.json({ success: true });
});


// ==========================================
// SEEDING BACKWARD PATH
// ==========================================
app.post("/api/reset-db", authenticateToken, requireSuperAdmin, (req, res) => {
  // Simple safety endpoint to reset DB
  try {
    const DB_FILE = path.join(process.cwd(), "db.json");
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
    res.json({ success: true, message: "Database reset to defaults. Please reload the app." });
  } catch (e) {
    res.status(500).json({ error: "Reset failed" });
  }
});


// ==========================================
// DB STATUS / INTERACTIVE APIs
// ==========================================
app.get("/api/db-status", authenticateToken, requireSuperAdmin, (req, res) => {
  res.json(dbStore.getStatus());
});

// ==========================================
// VITE MIDDLEWARE / SPA FALLBACK
// ==========================================

async function startServer() {
  await dbStore.initialize();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
