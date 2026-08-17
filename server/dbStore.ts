import { Filter, Document } from "mongodb";
import { getMongoDb, getCollection, initializeMongoIndexes } from "./db/mongo";
import { COLLECTION_NAMES } from "./db/schema";
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

/**
 * Multi-Tenant MongoDB Collection Repository
 * Direct connection to MongoDB Atlas as the single source of truth.
 * Ensures data persistence, tenant isolation, and atomic operations.
 */
export class CollectionRepository<T extends { id: string; organizationId?: string | null; orgId?: string | null }> {
  public readonly collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  private async getCol() {
    return await getCollection<T & Document>(this.collectionName);
  }

  public async getAll(filter: Filter<T> = {}): Promise<T[]> {
    const col = await this.getCol();
    const docs = await col.find(filter, { projection: { _id: 0 } }).toArray();
    return docs as unknown as T[];
  }

  public async find(filter: Filter<T> = {}): Promise<T[]> {
    const col = await this.getCol();
    const docs = await col.find(filter, { projection: { _id: 0 } }).toArray();
    return docs as unknown as T[];
  }

  public async findById(id: string): Promise<T | null> {
    const col = await this.getCol();
    const doc = await col.findOne({ id } as any, { projection: { _id: 0 } });
    return doc ? (doc as unknown as T) : null;
  }

  public async findOne(filter: Filter<T>): Promise<T | null> {
    const col = await this.getCol();
    const doc = await col.findOne(filter, { projection: { _id: 0 } });
    return doc ? (doc as unknown as T) : null;
  }

  public async findByOrg(orgId: string, additionalFilter: Filter<T> = {}): Promise<T[]> {
    const col = await this.getCol();
    const query: any = {
      $and: [
        { $or: [{ organizationId: orgId }, { orgId: orgId }] },
        additionalFilter
      ]
    };
    const docs = await col.find(query, { projection: { _id: 0 } }).toArray();
    return docs as unknown as T[];
  }

  public async findByIdAndOrg(id: string, orgId: string): Promise<T | null> {
    const col = await this.getCol();
    const query: any = {
      id,
      $or: [{ organizationId: orgId }, { orgId: orgId }]
    };
    const doc = await col.findOne(query, { projection: { _id: 0 } });
    return doc ? (doc as unknown as T) : null;
  }

  public async insert(doc: T): Promise<T> {
    const col = await this.getCol();
    const cleanDoc: any = { ...doc };
    delete cleanDoc._id;

    // Harmonize organizationId and orgId for tenant isolation compatibility
    if (cleanDoc.orgId && !cleanDoc.organizationId) {
      cleanDoc.organizationId = cleanDoc.orgId;
    } else if (cleanDoc.organizationId && !cleanDoc.orgId) {
      cleanDoc.orgId = cleanDoc.organizationId;
    }

    if (!cleanDoc.createdAt) {
      cleanDoc.createdAt = new Date().toISOString();
    }
    cleanDoc.updatedAt = new Date().toISOString();

    await col.updateOne(
      { id: cleanDoc.id } as any,
      { $set: cleanDoc },
      { upsert: true }
    );

    return cleanDoc as T;
  }

  public async update(id: string, update: Partial<T>): Promise<T | null> {
    const col = await this.getCol();
    const cleanUpdate: any = {};
    for (const [k, v] of Object.entries(update)) {
      if (v !== undefined && k !== "_id") {
        cleanUpdate[k] = v;
      }
    }
    cleanUpdate.updatedAt = new Date().toISOString();

    await col.updateOne({ id } as any, { $set: cleanUpdate });
    return this.findById(id);
  }

  public async updateByOrg(id: string, orgId: string, update: Partial<T>): Promise<T | null> {
    const col = await this.getCol();
    const cleanUpdate: any = {};
    for (const [k, v] of Object.entries(update)) {
      if (v !== undefined && k !== "_id") {
        cleanUpdate[k] = v;
      }
    }
    cleanUpdate.updatedAt = new Date().toISOString();

    const query: any = {
      id,
      $or: [{ organizationId: orgId }, { orgId: orgId }]
    };

    await col.updateOne(query, { $set: cleanUpdate });
    return this.findByIdAndOrg(id, orgId);
  }

  public async delete(id: string): Promise<boolean> {
    const col = await this.getCol();
    const res = await col.deleteOne({ id } as any);
    return (res.deletedCount ?? 0) > 0;
  }

  public async deleteByOrg(id: string, orgId: string): Promise<boolean> {
    const col = await this.getCol();
    const query: any = {
      id,
      $or: [{ organizationId: orgId }, { orgId: orgId }]
    };
    const res = await col.deleteOne(query);
    return (res.deletedCount ?? 0) > 0;
  }

  public async deleteMany(filter: Filter<T>): Promise<number> {
    const col = await this.getCol();
    const res = await col.deleteMany(filter);
    return res.deletedCount ?? 0;
  }

  public async count(filter: Filter<T> = {}): Promise<number> {
    const col = await this.getCol();
    return await col.countDocuments(filter);
  }
}

export class DBStore {
  // 19 Independent Collection Repositories connected directly to MongoDB Atlas
  public readonly repos = {
    organizations: new CollectionRepository<Organization>(COLLECTION_NAMES.ORGANIZATIONS),
    users: new CollectionRepository<User>(COLLECTION_NAMES.USERS),
    students: new CollectionRepository<Student>(COLLECTION_NAMES.STUDENTS),
    membershipPlans: new CollectionRepository<MembershipPlan>(COLLECTION_NAMES.MEMBERSHIP_PLANS),
    memberships: new CollectionRepository<Membership>(COLLECTION_NAMES.MEMBERSHIPS),
    buildings: new CollectionRepository<Building>(COLLECTION_NAMES.BUILDINGS),
    floors: new CollectionRepository<Floor>(COLLECTION_NAMES.FLOORS),
    rooms: new CollectionRepository<Room>(COLLECTION_NAMES.ROOMS),
    seats: new CollectionRepository<Seat>(COLLECTION_NAMES.SEATS),
    seatHistory: new CollectionRepository<SeatAssignmentHistory>(COLLECTION_NAMES.SEAT_HISTORY),
    attendances: new CollectionRepository<Attendance>(COLLECTION_NAMES.ATTENDANCES),
    payments: new CollectionRepository<Payment>(COLLECTION_NAMES.PAYMENTS),
    invoices: new CollectionRepository<Invoice>(COLLECTION_NAMES.INVOICES),
    notifications: new CollectionRepository<Notification>(COLLECTION_NAMES.NOTIFICATIONS),
    auditLogs: new CollectionRepository<AuditLog>(COLLECTION_NAMES.AUDIT_LOGS),
    announcements: new CollectionRepository<Announcement>(COLLECTION_NAMES.ANNOUNCEMENTS),
    expenses: new CollectionRepository<Expense>(COLLECTION_NAMES.EXPENSES),
    whatsappConfigs: new CollectionRepository<WhatsAppConfig>(COLLECTION_NAMES.WHATSAPP_CONFIGS),
    whatsappLogs: new CollectionRepository<WhatsAppLog>(COLLECTION_NAMES.WHATSAPP_LOGS)
  };

  public async initialize(): Promise<void> {
    console.log(" [DBStore] Initializing StudySphere MongoDB Atlas repository layer...");
    try {
      const db = await getMongoDb();
      await initializeMongoIndexes(db);
      console.log(" [DBStore] All 19 MongoDB collections connected & indexes verified successfully.");
    } catch (error: any) {
      console.error(" [DBStore] Failed during database initialization:", error.message);
      throw error;
    }
  }

  public async getStatus() {
    try {
      const [studentsCount, orgsCount, seatsCount, attendancesCount, paymentsCount] = await Promise.all([
        this.repos.students.count(),
        this.repos.organizations.count(),
        this.repos.seats.count(),
        this.repos.attendances.count(),
        this.repos.payments.count()
      ]);

      return {
        connected: "active",
        type: "MongoDB Atlas Single Source of Truth",
        collectionsCount: 19,
        details: `Active MongoDB Atlas storage. Total: ${studentsCount} students, ${orgsCount} organizations, ${seatsCount} seats, ${attendancesCount} attendance logs, ${paymentsCount} payments.`
      };
    } catch (error: any) {
      return {
        connected: "error",
        type: "MongoDB Atlas",
        collectionsCount: 19,
        details: `Connection error: ${error.message}`
      };
    }
  }

  // 1. Organizations
  public async getOrganizations(): Promise<Organization[]> {
    return await this.repos.organizations.getAll();
  }
  public async getOrganizationById(id: string): Promise<Organization | null> {
    return await this.repos.organizations.findById(id);
  }
  public async addOrganization(org: Organization): Promise<Organization> {
    return await this.repos.organizations.insert(org);
  }
  public async updateOrganization(id: string, update: Partial<Organization>): Promise<Organization | null> {
    return await this.repos.organizations.update(id, update);
  }
  public async deleteOrganization(id: string): Promise<boolean> {
    return await this.repos.organizations.delete(id);
  }

  // 2. Users
  public async getUsers(): Promise<User[]> {
    return await this.repos.users.getAll();
  }
  public async getUserById(id: string): Promise<User | null> {
    return await this.repos.users.findById(id);
  }
  public async getUserByEmail(email: string): Promise<User | null> {
    return await this.repos.users.findOne({ email: (email || "").toLowerCase().trim() } as any);
  }
  public async getUsersByOrg(orgId: string): Promise<User[]> {
    return await this.repos.users.findByOrg(orgId);
  }
  public async addUser(user: User): Promise<User> {
    return await this.repos.users.insert(user);
  }
  public async updateUser(id: string, update: Partial<User>): Promise<User | null> {
    return await this.repos.users.update(id, update);
  }
  public async deleteUser(id: string): Promise<boolean> {
    return await this.repos.users.delete(id);
  }

  // 3. Students
  public async getStudents(): Promise<Student[]> {
    return await this.repos.students.getAll();
  }
  public async getStudentById(id: string): Promise<Student | null> {
    return await this.repos.students.findById(id);
  }
  public async getStudentsByOrg(orgId: string): Promise<Student[]> {
    return await this.repos.students.findByOrg(orgId);
  }
  public async addStudent(student: Student): Promise<Student> {
    return await this.repos.students.insert(student);
  }
  public async updateStudent(id: string, update: Partial<Student>): Promise<Student | null> {
    return await this.repos.students.update(id, update);
  }
  public async deleteStudent(id: string): Promise<boolean> {
    const updated = await this.repos.students.update(id, { status: "inactive" } as any);
    return updated !== null;
  }
  public async permanentlyDeleteStudent(id: string): Promise<boolean> {
    return await this.repos.students.delete(id);
  }

  // 4. Membership Plans
  public async getPlans(): Promise<MembershipPlan[]> {
    return await this.repos.membershipPlans.getAll();
  }
  public async getPlanById(id: string): Promise<MembershipPlan | null> {
    return await this.repos.membershipPlans.findById(id);
  }
  public async getPlansByOrg(orgId: string): Promise<MembershipPlan[]> {
    return await this.repos.membershipPlans.findByOrg(orgId);
  }
  public async addPlan(plan: MembershipPlan): Promise<MembershipPlan> {
    return await this.repos.membershipPlans.insert(plan);
  }
  public async updatePlan(id: string, update: Partial<MembershipPlan>): Promise<MembershipPlan | null> {
    return await this.repos.membershipPlans.update(id, update);
  }
  public async deletePlan(id: string): Promise<boolean> {
    return await this.repos.membershipPlans.delete(id);
  }

  // 5. Memberships
  public async getMemberships(): Promise<Membership[]> {
    return await this.repos.memberships.getAll();
  }
  public async getMembershipById(id: string): Promise<Membership | null> {
    return await this.repos.memberships.findById(id);
  }
  public async getMembershipsByOrg(orgId: string): Promise<Membership[]> {
    return await this.repos.memberships.findByOrg(orgId);
  }
  public async addMembership(memb: Membership): Promise<Membership> {
    return await this.repos.memberships.insert(memb);
  }
  public async updateMembership(id: string, update: Partial<Membership>): Promise<Membership | null> {
    return await this.repos.memberships.update(id, update);
  }
  public async deleteMembership(id: string): Promise<boolean> {
    return await this.repos.memberships.delete(id);
  }

  // 6. Payments
  public async getPayments(): Promise<Payment[]> {
    return await this.repos.payments.getAll();
  }
  public async getPaymentById(id: string): Promise<Payment | null> {
    return await this.repos.payments.findById(id);
  }
  public async getPaymentsByOrg(orgId: string): Promise<Payment[]> {
    return await this.repos.payments.findByOrg(orgId);
  }
  public async addPayment(payment: Payment): Promise<Payment> {
    return await this.repos.payments.insert(payment);
  }
  public async updatePayment(id: string, update: Partial<Payment>): Promise<Payment | null> {
    return await this.repos.payments.update(id, update);
  }

  // 7. Invoices
  public async getInvoices(): Promise<Invoice[]> {
    return await this.repos.invoices.getAll();
  }
  public async getInvoicesByOrg(orgId: string): Promise<Invoice[]> {
    return await this.repos.invoices.findByOrg(orgId);
  }
  public async addInvoice(invoice: Invoice): Promise<Invoice> {
    return await this.repos.invoices.insert(invoice);
  }

  // 8. Expenses
  public async getExpenses(): Promise<Expense[]> {
    return await this.repos.expenses.getAll();
  }
  public async getExpenseById(id: string): Promise<Expense | null> {
    return await this.repos.expenses.findById(id);
  }
  public async getExpensesByOrg(orgId: string): Promise<Expense[]> {
    return await this.repos.expenses.findByOrg(orgId);
  }
  public async addExpense(expense: Expense): Promise<Expense> {
    return await this.repos.expenses.insert(expense);
  }
  public async deleteExpense(id: string): Promise<boolean> {
    return await this.repos.expenses.delete(id);
  }

  // 9. Notifications
  public async getNotifications(): Promise<Notification[]> {
    return await this.repos.notifications.getAll();
  }
  public async getNotificationById(id: string): Promise<Notification | null> {
    return await this.repos.notifications.findById(id);
  }
  public async getNotificationsByOrg(orgId: string): Promise<Notification[]> {
    return await this.repos.notifications.findByOrg(orgId);
  }
  public async addNotification(notification: Notification): Promise<Notification> {
    return await this.repos.notifications.insert(notification);
  }
  public async updateNotification(id: string, update: Partial<Notification>): Promise<Notification | null> {
    return await this.repos.notifications.update(id, update);
  }

  // 10. WhatsApp Configs
  public async getWhatsAppConfigs(): Promise<WhatsAppConfig[]> {
    return await this.repos.whatsappConfigs.getAll();
  }
  public async getWhatsAppConfigByOrg(orgId: string): Promise<WhatsAppConfig | null> {
    const list = await this.repos.whatsappConfigs.findByOrg(orgId);
    return list.length > 0 ? list[0] : null;
  }
  public async updateWhatsAppConfig(orgId: string, update: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
    const existing = await this.getWhatsAppConfigByOrg(orgId);
    if (existing) {
      await this.repos.whatsappConfigs.update(existing.id, update);
      const updated = await this.getWhatsAppConfigByOrg(orgId);
      return updated!;
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
      return await this.repos.whatsappConfigs.insert(newConfig);
    }
  }

  // 11. WhatsApp Logs
  public async getWhatsAppLogs(): Promise<WhatsAppLog[]> {
    return await this.repos.whatsappLogs.getAll();
  }
  public async getWhatsAppLogsByOrg(orgId: string): Promise<WhatsAppLog[]> {
    return await this.repos.whatsappLogs.findByOrg(orgId);
  }
  public async addWhatsAppLog(log: WhatsAppLog): Promise<WhatsAppLog> {
    return await this.repos.whatsappLogs.insert(log);
  }

  // 12. Audit Logs
  public async getAuditLogs(): Promise<AuditLog[]> {
    return await this.repos.auditLogs.getAll();
  }
  public async getAuditLogsByOrg(orgId: string | null): Promise<AuditLog[]> {
    if (!orgId) return await this.repos.auditLogs.getAll();
    return await this.repos.auditLogs.find({
      $or: [{ organizationId: orgId }, { orgId: orgId }]
    } as any);
  }
  public async addAuditLog(log: AuditLog): Promise<AuditLog> {
    return await this.repos.auditLogs.insert(log);
  }

  // 13. Announcements
  public async getAnnouncements(): Promise<Announcement[]> {
    return await this.repos.announcements.getAll();
  }
  public async getAnnouncementById(id: string): Promise<Announcement | null> {
    return await this.repos.announcements.findById(id);
  }
  public async getAnnouncementsByOrg(orgId: string | null): Promise<Announcement[]> {
    if (!orgId) return await this.repos.announcements.getAll();
    return await this.repos.announcements.find({
      $or: [
        { organizationId: null },
        { orgId: null },
        { organizationId: orgId },
        { orgId: orgId },
        { organizationId: { $exists: false } }
      ]
    } as any);
  }
  public async addAnnouncement(announcement: Announcement): Promise<Announcement> {
    return await this.repos.announcements.insert(announcement);
  }
  public async deleteAnnouncement(id: string): Promise<boolean> {
    return await this.repos.announcements.delete(id);
  }

  // 14. Buildings
  public async getBuildings(): Promise<Building[]> {
    return await this.repos.buildings.getAll();
  }
  public async getBuildingsByOrg(orgId: string): Promise<Building[]> {
    return await this.repos.buildings.findByOrg(orgId);
  }
  public async addBuilding(bld: Building): Promise<Building> {
    return await this.repos.buildings.insert(bld);
  }
  public async deleteBuilding(id: string): Promise<boolean> {
    return await this.repos.buildings.delete(id);
  }

  // 15. Floors
  public async getFloors(): Promise<Floor[]> {
    return await this.repos.floors.getAll();
  }
  public async getFloorsByOrg(orgId: string): Promise<Floor[]> {
    return await this.repos.floors.findByOrg(orgId);
  }
  public async addFloor(flr: Floor): Promise<Floor> {
    return await this.repos.floors.insert(flr);
  }
  public async deleteFloor(id: string): Promise<boolean> {
    return await this.repos.floors.delete(id);
  }

  // 16. Rooms
  public async getRooms(): Promise<Room[]> {
    return await this.repos.rooms.getAll();
  }
  public async getRoomById(id: string): Promise<Room | null> {
    return await this.repos.rooms.findById(id);
  }
  public async getRoomsByOrg(orgId: string): Promise<Room[]> {
    return await this.repos.rooms.findByOrg(orgId);
  }
  public async addRoom(rm: Room): Promise<Room> {
    return await this.repos.rooms.insert(rm);
  }
  public async deleteRoom(id: string): Promise<boolean> {
    return await this.repos.rooms.delete(id);
  }

  // 17. Seats
  public async getSeats(): Promise<Seat[]> {
    return await this.repos.seats.getAll();
  }
  public async getSeatById(id: string): Promise<Seat | null> {
    return await this.repos.seats.findById(id);
  }
  public async getSeatsByOrg(orgId: string): Promise<Seat[]> {
    return await this.repos.seats.findByOrg(orgId);
  }
  public async addSeat(seat: Seat): Promise<Seat> {
    return await this.repos.seats.insert(seat);
  }
  public async updateSeat(id: string, update: Partial<Seat>): Promise<Seat | null> {
    return await this.repos.seats.update(id, update);
  }
  public async deleteSeat(id: string): Promise<boolean> {
    return await this.repos.seats.delete(id);
  }

  // 18. Seat History
  public async getSeatHistory(): Promise<SeatAssignmentHistory[]> {
    return await this.repos.seatHistory.getAll();
  }
  public async getSeatHistoryByOrg(orgId: string): Promise<SeatAssignmentHistory[]> {
    return await this.repos.seatHistory.findByOrg(orgId);
  }
  public async addSeatHistory(sh: SeatAssignmentHistory): Promise<SeatAssignmentHistory> {
    return await this.repos.seatHistory.insert(sh);
  }

  // 19. Attendances
  public async getAttendances(): Promise<Attendance[]> {
    return await this.repos.attendances.getAll();
  }
  public async getAttendancesByOrg(orgId: string, date?: string): Promise<Attendance[]> {
    if (date) {
      return await this.repos.attendances.findByOrg(orgId, { date } as any);
    }
    return await this.repos.attendances.findByOrg(orgId);
  }
  public async addAttendance(attendance: Attendance): Promise<Attendance> {
    return await this.repos.attendances.insert(attendance);
  }
  public async updateAttendance(id: string, update: Partial<Attendance>): Promise<Attendance | null> {
    return await this.repos.attendances.update(id, update);
  }
}

export const dbStore = new DBStore();

