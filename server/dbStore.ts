import fs from "fs";
import path from "path";
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
} from "../src/types";

const DB_FILE = path.join(process.cwd(), "db.json");

interface DBStructure {
  organizations: Organization[];
  users: User[];
  students: Student[];
  membershipPlans: MembershipPlan[];
  memberships: Membership[];
  buildings: Building[];
  floors: Floor[];
  rooms: Room[];
  seats: Seat[];
  seatHistory: SeatAssignmentHistory[];
  attendances: Attendance[];
  payments: Payment[];
  invoices: Invoice[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  announcements: Announcement[];
  expenses: Expense[];
  whatsappConfigs: WhatsAppConfig[];
  whatsappLogs: WhatsAppLog[];
}

const DEFAULT_DB: DBStructure = {
  organizations: [],
  users: [],
  students: [],
  membershipPlans: [],
  memberships: [],
  buildings: [],
  floors: [],
  rooms: [],
  seats: [],
  seatHistory: [],
  attendances: [],
  payments: [],
  invoices: [],
  notifications: [],
  auditLogs: [],
  announcements: [],
  expenses: [],
  whatsappConfigs: [],
  whatsappLogs: []
};

class DBStore {
  private data: DBStructure = { ...DEFAULT_DB };

  public async initialize(): Promise<void> {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(content);
        this.data = {
          organizations: parsed.organizations || [],
          users: parsed.users || [],
          students: parsed.students || [],
          membershipPlans: parsed.membershipPlans || [],
          memberships: parsed.memberships || [],
          buildings: parsed.buildings || [],
          floors: parsed.floors || [],
          rooms: parsed.rooms || [],
          seats: parsed.seats || [],
          seatHistory: parsed.seatHistory || [],
          attendances: parsed.attendances || [],
          payments: parsed.payments || [],
          invoices: parsed.invoices || [],
          notifications: parsed.notifications || [],
          auditLogs: parsed.auditLogs || [],
          announcements: parsed.announcements || [],
          expenses: parsed.expenses || [],
          whatsappConfigs: parsed.whatsappConfigs || [],
          whatsappLogs: parsed.whatsappLogs || []
        };
      } else {
        this.save();
      }
    } catch (error) {
      console.error("Failed to initialize database store:", error);
      this.data = { ...DEFAULT_DB };
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (error) {
      console.error("Failed to save database state:", error);
    }
  }

  public getStatus() {
    return {
      connected: "local",
      type: "JSON Local File",
      details: `Connected to local db.json database. Records: ${this.data.students.length} students, ${this.data.organizations.length} organizations.`
    };
  }

  // 1. Organizations
  public getOrganizations(): Organization[] {
    return this.data.organizations;
  }
  public addOrganization(org: Organization): void {
    this.data.organizations.push(org);
    this.save();
  }
  public updateOrganization(id: string, update: Partial<Organization>): void {
    const idx = this.data.organizations.findIndex(o => o.id === id);
    if (idx !== -1) {
      this.data.organizations[idx] = { ...this.data.organizations[idx], ...update };
      this.save();
    }
  }
  public deleteOrganization(id: string): void {
    this.data.organizations = this.data.organizations.filter(o => o.id !== id);
    this.save();
  }

  // 2. Users
  public getUsers(): User[] {
    return this.data.users;
  }
  public addUser(user: User): void {
    this.data.users.push(user);
    this.save();
  }
  public updateUser(id: string, update: Partial<User>): void {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...update };
      this.save();
    }
  }

  // 3. Students
  public getStudents(): Student[] {
    return this.data.students;
  }
  public addStudent(student: Student): void {
    this.data.students.push(student);
    this.save();
  }
  public updateStudent(id: string, update: Partial<Student>): void {
    const idx = this.data.students.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.students[idx] = { ...this.data.students[idx], ...update };
      this.save();
    }
  }
  public deleteStudent(id: string): void {
    // Soft-delete/deactivate student
    const idx = this.data.students.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.students[idx].status = "inactive";
      this.save();
    }
  }
  public permanentlyDeleteStudent(id: string): void {
    this.data.students = this.data.students.filter(s => s.id !== id);
    this.save();
  }

  // 4. Membership Plans
  public getPlans(): MembershipPlan[] {
    return this.data.membershipPlans;
  }
  public addPlan(plan: MembershipPlan): void {
    this.data.membershipPlans.push(plan);
    this.save();
  }
  public updatePlan(id: string, update: Partial<MembershipPlan>): void {
    const idx = this.data.membershipPlans.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.membershipPlans[idx] = { ...this.data.membershipPlans[idx], ...update };
      this.save();
    }
  }
  public deletePlan(id: string): void {
    this.data.membershipPlans = this.data.membershipPlans.filter(p => p.id !== id);
    this.save();
  }

  // 5. Memberships
  public getMemberships(): Membership[] {
    return this.data.memberships;
  }
  public addMembership(memb: Membership): void {
    this.data.memberships.push(memb);
    this.save();
  }
  public updateMembership(id: string, update: Partial<Membership>): void {
    const idx = this.data.memberships.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.data.memberships[idx] = { ...this.data.memberships[idx], ...update };
      this.save();
    }
  }
  public deleteMembership(id: string): void {
    this.data.memberships = this.data.memberships.filter(m => m.id !== id);
    this.save();
  }

  // 6. Payments
  public getPayments(): Payment[] {
    return this.data.payments;
  }
  public addPayment(payment: Payment): void {
    this.data.payments.push(payment);
    this.save();
  }
  public updatePayment(id: string, update: Partial<Payment>): void {
    const idx = this.data.payments.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.payments[idx] = { ...this.data.payments[idx], ...update };
      this.save();
    }
  }

  // 7. Invoices
  public getInvoices(): Invoice[] {
    return this.data.invoices;
  }
  public addInvoice(invoice: Invoice): void {
    this.data.invoices.push(invoice);
    this.save();
  }

  // 8. Expenses
  public getExpenses(): Expense[] {
    return this.data.expenses;
  }
  public addExpense(expense: Expense): void {
    this.data.expenses.push(expense);
    this.save();
  }
  public deleteExpense(id: string): void {
    this.data.expenses = this.data.expenses.filter(e => e.id !== id);
    this.save();
  }

  // 9. Notifications
  public getNotifications(): Notification[] {
    return this.data.notifications;
  }
  public addNotification(notification: Notification): void {
    this.data.notifications.push(notification);
    this.save();
  }
  public updateNotification(id: string, update: Partial<Notification>): void {
    const idx = this.data.notifications.findIndex(n => n.id === id);
    if (idx !== -1) {
      this.data.notifications[idx] = { ...this.data.notifications[idx], ...update };
      this.save();
    }
  }

  // 10. WhatsApp Configs
  public getWhatsAppConfigs(): WhatsAppConfig[] {
    return this.data.whatsappConfigs;
  }
  public updateWhatsAppConfig(orgId: string, update: Partial<WhatsAppConfig>): void {
    const idx = this.data.whatsappConfigs.findIndex(c => c.orgId === orgId);
    if (idx !== -1) {
      this.data.whatsappConfigs[idx] = { ...this.data.whatsappConfigs[idx], ...update };
    } else {
      const newConfig: WhatsAppConfig = {
        id: `wac-${Date.now()}`,
        orgId,
        enabled: update.enabled ?? false,
        provider: update.provider ?? "sandbox",
        apiKey: update.apiKey ?? "",
        phoneId: update.phoneId ?? "",
        senderNumber: update.senderNumber ?? "",
        templates: update.templates ?? {
          welcome: "Welcome to our Silence Lounge! We are glad to have you.",
          upcomingRenewal: "Your membership is expiring soon on {expiry_date}. Please renew to continue.",
          expiredAlert: "Your membership has expired. Please renew to keep your assigned seat.",
          paymentReceipt: "Thank you for the payment of {amount}. Receipt No: {receipt_no}."
        },
        triggerDaysBefore: update.triggerDaysBefore ?? 3
      };
      this.data.whatsappConfigs.push(newConfig);
    }
    this.save();
  }

  // 11. WhatsApp Logs
  public getWhatsAppLogs(): WhatsAppLog[] {
    return this.data.whatsappLogs;
  }
  public addWhatsAppLog(log: WhatsAppLog): void {
    this.data.whatsappLogs.push(log);
    this.save();
  }

  // 12. Audit Logs
  public getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }
  public addAuditLog(log: AuditLog): void {
    this.data.auditLogs.push(log);
    this.save();
  }

  // 13. Announcements
  public getAnnouncements(): Announcement[] {
    return this.data.announcements;
  }
  public addAnnouncement(announcement: Announcement): void {
    this.data.announcements.push(announcement);
    this.save();
  }
  public deleteAnnouncement(id: string): void {
    this.data.announcements = this.data.announcements.filter(a => a.id !== id);
    this.save();
  }

  // 14. Buildings
  public getBuildings(): Building[] {
    return this.data.buildings;
  }
  public addBuilding(bld: Building): void {
    this.data.buildings.push(bld);
    this.save();
  }

  // 15. Floors
  public getFloors(): Floor[] {
    return this.data.floors;
  }
  public addFloor(flr: Floor): void {
    this.data.floors.push(flr);
    this.save();
  }

  // 16. Rooms
  public getRooms(): Room[] {
    return this.data.rooms;
  }
  public addRoom(rm: Room): void {
    this.data.rooms.push(rm);
    this.save();
  }

  // 17. Seats
  public getSeats(): Seat[] {
    return this.data.seats;
  }
  public addSeat(seat: Seat): void {
    this.data.seats.push(seat);
    this.save();
  }
  public updateSeat(id: string, update: Partial<Seat>): void {
    const idx = this.data.seats.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.seats[idx] = { ...this.data.seats[idx], ...update };
      this.save();
    }
  }

  // 18. Seat History
  public getSeatHistory(): SeatAssignmentHistory[] {
    return this.data.seatHistory;
  }
  public addSeatHistory(sh: SeatAssignmentHistory): void {
    this.data.seatHistory.push(sh);
    this.save();
  }

  // 19. Attendances
  public getAttendances(): Attendance[] {
    return this.data.attendances;
  }
  public addAttendance(attendance: Attendance): void {
    this.data.attendances.push(attendance);
    this.save();
  }
  public updateAttendance(id: string, update: Partial<Attendance>): void {
    const idx = this.data.attendances.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.data.attendances[idx] = { ...this.data.attendances[idx], ...update };
      this.save();
    }
  }
}

export const dbStore = new DBStore();
