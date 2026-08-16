import fs from "fs";
import path from "path";
import { getMongoDb, initializeMongoIndexes } from "./db/mongo";
import { COLLECTION_NAMES, CollectionName } from "./db/schema";
import { runMigration } from "./db/migrate";
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

const DATA_DIR = path.join(process.cwd(), "data");
const LEGACY_DB_FILE = path.join(process.cwd(), "db.json");

/**
 * Multi-Tenant Collection Repository Store
 * Each entity resides in its own discrete Collection / File, completely eliminating monolithic giant document storage.
 */
class CollectionRepository<T extends { id: string; organizationId?: string | null; orgId?: string | null }> {
  private collectionName: string;
  private memoryCache: T[] = [];
  private isLoaded = false;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  private getFilePath(): string {
    return path.join(DATA_DIR, `${this.collectionName}.json`);
  }

  public load(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      const filePath = this.getFilePath();
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        this.memoryCache = JSON.parse(content);
      } else {
        this.memoryCache = [];
        this.persist();
      }
      this.isLoaded = true;
    } catch (error) {
      console.error(`Failed to load discrete collection ${this.collectionName}:`, error);
      this.memoryCache = [];
    }
  }

  private persist(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const filePath = this.getFilePath();
      fs.writeFileSync(filePath, JSON.stringify(this.memoryCache, null, 2), "utf-8");
    } catch (error) {
      console.error(`Failed to persist collection ${this.collectionName}:`, error);
    }
  }

  // Dual sync to live MongoDB if available
  private async syncMongo(doc: T, operation: "upsert" | "delete"): Promise<void> {
    try {
      const db = await getMongoDb();
      if (!db) return;
      const col = db.collection(this.collectionName);
      if (operation === "upsert") {
        const { _id, ...docWithoutId } = doc as any;
        await col.updateOne({ id: doc.id }, { $set: docWithoutId }, { upsert: true });
      } else if (operation === "delete") {
        await col.deleteOne({ id: doc.id });
      }
    } catch (err) {
      console.warn(`[MongoDB Sync] Warning on collection ${this.collectionName}:`, (err as Error).message);
    }
  }

  public getAll(): T[] {
    if (!this.isLoaded) this.load();
    return [...this.memoryCache];
  }

  public findByOrg(orgId: string): T[] {
    if (!this.isLoaded) this.load();
    return this.memoryCache.filter(item => {
      const itemOrg = item.organizationId ?? item.orgId;
      return itemOrg === orgId;
    });
  }

  public findById(id: string): T | undefined {
    if (!this.isLoaded) this.load();
    return this.memoryCache.find(item => item.id === id);
  }

  public insert(doc: T): void {
    if (!this.isLoaded) this.load();
    // Ensure both organizationId and orgId are set for backwards compatibility
    if (doc.orgId && !doc.organizationId) {
      doc.organizationId = doc.orgId;
    } else if (doc.organizationId && !doc.orgId) {
      doc.orgId = doc.organizationId;
    }
    this.memoryCache.push(doc);
    this.persist();
    this.syncMongo(doc, "upsert");
  }

  public update(id: string, update: Partial<T>): void {
    if (!this.isLoaded) this.load();
    const idx = this.memoryCache.findIndex(item => item.id === id);
    if (idx !== -1) {
      const cleanUpdate: any = {};
      for (const [k, v] of Object.entries(update)) {
        if (v !== undefined) {
          cleanUpdate[k] = v;
        }
      }
      this.memoryCache[idx] = { ...this.memoryCache[idx], ...cleanUpdate };
      this.persist();
      this.syncMongo(this.memoryCache[idx], "upsert");
    }
  }

  public delete(id: string): void {
    if (!this.isLoaded) this.load();
    const target = this.memoryCache.find(item => item.id === id);
    this.memoryCache = this.memoryCache.filter(item => item.id !== id);
    this.persist();
    if (target) {
      this.syncMongo(target, "delete");
    }
  }

  public count(filter?: (item: T) => boolean): number {
    if (!this.isLoaded) this.load();
    return filter ? this.memoryCache.filter(filter).length : this.memoryCache.length;
  }
}

class DBStore {
  // 19 Independent Collection Repositories
  private repos = {
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
    try {
      console.log(" Initializing StudySphere multi-collection database architecture...");

      // Check if legacy monolithic db.json exists and data/ is not yet populated
      const orgFile = path.join(DATA_DIR, `${COLLECTION_NAMES.ORGANIZATIONS}.json`);
      if (fs.existsSync(LEGACY_DB_FILE) && (!fs.existsSync(orgFile) || fs.readFileSync(orgFile, "utf-8").trim() === "[]")) {
        console.log(" Legacy monolithic database detected. Running automated migration to 19 separate collections...");
        await runMigration();
      }

      // Load all 19 separate collection repositories
      Object.values(this.repos).forEach(repo => repo.load());

      // Attempt live MongoDB index initialization if configured
      const db = await getMongoDb();
      if (db) {
        await initializeMongoIndexes(db);
      }

      console.log(" All 19 collections loaded successfully into discrete database models.");
    } catch (error) {
      console.error(" Failed to initialize database store:", error);
    }
  }

  public getStatus() {
    return {
      connected: "active",
      type: "Multi-Tenant Discrete Collections",
      collectionsCount: 19,
      details: `Active multi-collection storage. Total: ${this.repos.students.count()} students, ${this.repos.organizations.count()} organizations, ${this.repos.seats.count()} seats, ${this.repos.attendances.count()} attendance logs.`
    };
  }

  // 1. Organizations
  public getOrganizations(): Organization[] {
    return this.repos.organizations.getAll();
  }
  public getOrganizationById(id: string): Organization | undefined {
    return this.repos.organizations.findById(id);
  }
  public addOrganization(org: Organization): void {
    this.repos.organizations.insert(org);
  }
  public updateOrganization(id: string, update: Partial<Organization>): void {
    this.repos.organizations.update(id, update);
  }
  public deleteOrganization(id: string): void {
    this.repos.organizations.delete(id);
  }

  // 2. Users
  public getUsers(): User[] {
    return this.repos.users.getAll();
  }
  public getUsersByOrg(orgId: string): User[] {
    return this.repos.users.findByOrg(orgId);
  }
  public addUser(user: User): void {
    this.repos.users.insert(user);
  }
  public updateUser(id: string, update: Partial<User>): void {
    this.repos.users.update(id, update);
  }

  // 3. Students
  public getStudents(): Student[] {
    return this.repos.students.getAll();
  }
  public getStudentsByOrg(orgId: string): Student[] {
    return this.repos.students.findByOrg(orgId);
  }
  public addStudent(student: Student): void {
    this.repos.students.insert(student);
  }
  public updateStudent(id: string, update: Partial<Student>): void {
    this.repos.students.update(id, update);
  }
  public deleteStudent(id: string): void {
    this.repos.students.update(id, { status: "inactive" } as any);
  }
  public permanentlyDeleteStudent(id: string): void {
    this.repos.students.delete(id);
  }

  // 4. Membership Plans
  public getPlans(): MembershipPlan[] {
    return this.repos.membershipPlans.getAll();
  }
  public getPlansByOrg(orgId: string): MembershipPlan[] {
    return this.repos.membershipPlans.findByOrg(orgId);
  }
  public addPlan(plan: MembershipPlan): void {
    this.repos.membershipPlans.insert(plan);
  }
  public updatePlan(id: string, update: Partial<MembershipPlan>): void {
    this.repos.membershipPlans.update(id, update);
  }
  public deletePlan(id: string): void {
    this.repos.membershipPlans.delete(id);
  }

  // 5. Memberships
  public getMemberships(): Membership[] {
    return this.repos.memberships.getAll();
  }
  public getMembershipsByOrg(orgId: string): Membership[] {
    return this.repos.memberships.findByOrg(orgId);
  }
  public addMembership(memb: Membership): void {
    this.repos.memberships.insert(memb);
  }
  public updateMembership(id: string, update: Partial<Membership>): void {
    this.repos.memberships.update(id, update);
  }
  public deleteMembership(id: string): void {
    this.repos.memberships.delete(id);
  }

  // 6. Payments
  public getPayments(): Payment[] {
    return this.repos.payments.getAll();
  }
  public getPaymentsByOrg(orgId: string): Payment[] {
    return this.repos.payments.findByOrg(orgId);
  }
  public addPayment(payment: Payment): void {
    this.repos.payments.insert(payment);
  }
  public updatePayment(id: string, update: Partial<Payment>): void {
    this.repos.payments.update(id, update);
  }

  // 7. Invoices
  public getInvoices(): Invoice[] {
    return this.repos.invoices.getAll();
  }
  public getInvoicesByOrg(orgId: string): Invoice[] {
    return this.repos.invoices.findByOrg(orgId);
  }
  public addInvoice(invoice: Invoice): void {
    this.repos.invoices.insert(invoice);
  }

  // 8. Expenses
  public getExpenses(): Expense[] {
    return this.repos.expenses.getAll();
  }
  public getExpensesByOrg(orgId: string): Expense[] {
    return this.repos.expenses.findByOrg(orgId);
  }
  public addExpense(expense: Expense): void {
    this.repos.expenses.insert(expense);
  }
  public deleteExpense(id: string): void {
    this.repos.expenses.delete(id);
  }

  // 9. Notifications
  public getNotifications(): Notification[] {
    return this.repos.notifications.getAll();
  }
  public getNotificationsByOrg(orgId: string): Notification[] {
    return this.repos.notifications.findByOrg(orgId);
  }
  public addNotification(notification: Notification): void {
    this.repos.notifications.insert(notification);
  }
  public updateNotification(id: string, update: Partial<Notification>): void {
    this.repos.notifications.update(id, update);
  }

  // 10. WhatsApp Configs
  public getWhatsAppConfigs(): WhatsAppConfig[] {
    return this.repos.whatsappConfigs.getAll();
  }
  public getWhatsAppConfigByOrg(orgId: string): WhatsAppConfig | undefined {
    return this.repos.whatsappConfigs.findByOrg(orgId)[0];
  }
  public updateWhatsAppConfig(orgId: string, update: Partial<WhatsAppConfig>): void {
    const existing = this.getWhatsAppConfigByOrg(orgId);
    if (existing) {
      this.repos.whatsappConfigs.update(existing.id, update);
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
      this.repos.whatsappConfigs.insert(newConfig);
    }
  }

  // 11. WhatsApp Logs
  public getWhatsAppLogs(): WhatsAppLog[] {
    return this.repos.whatsappLogs.getAll();
  }
  public getWhatsAppLogsByOrg(orgId: string): WhatsAppLog[] {
    return this.repos.whatsappLogs.findByOrg(orgId);
  }
  public addWhatsAppLog(log: WhatsAppLog): void {
    this.repos.whatsappLogs.insert(log);
  }

  // 12. Audit Logs
  public getAuditLogs(): AuditLog[] {
    return this.repos.auditLogs.getAll();
  }
  public getAuditLogsByOrg(orgId: string | null): AuditLog[] {
    if (!orgId) return this.repos.auditLogs.getAll();
    return this.repos.auditLogs.getAll().filter(l => (l.orgId ?? (l as any).organizationId) === orgId);
  }
  public addAuditLog(log: AuditLog): void {
    this.repos.auditLogs.insert(log);
  }

  // 13. Announcements
  public getAnnouncements(): Announcement[] {
    return this.repos.announcements.getAll();
  }
  public getAnnouncementsByOrg(orgId: string | null): Announcement[] {
    return this.repos.announcements.getAll().filter(a => {
      const aOrg = a.orgId ?? (a as any).organizationId;
      return aOrg === null || aOrg === undefined || aOrg === orgId;
    });
  }
  public addAnnouncement(announcement: Announcement): void {
    this.repos.announcements.insert(announcement);
  }
  public deleteAnnouncement(id: string): void {
    this.repos.announcements.delete(id);
  }

  // 14. Buildings
  public getBuildings(): Building[] {
    return this.repos.buildings.getAll();
  }
  public getBuildingsByOrg(orgId: string): Building[] {
    return this.repos.buildings.findByOrg(orgId);
  }
  public addBuilding(bld: Building): void {
    this.repos.buildings.insert(bld);
  }
  public deleteBuilding(id: string): void {
    this.repos.buildings.delete(id);
  }

  // 15. Floors
  public getFloors(): Floor[] {
    return this.repos.floors.getAll();
  }
  public getFloorsByOrg(orgId: string): Floor[] {
    return this.repos.floors.findByOrg(orgId);
  }
  public addFloor(flr: Floor): void {
    this.repos.floors.insert(flr);
  }
  public deleteFloor(id: string): void {
    this.repos.floors.delete(id);
  }

  // 16. Rooms
  public getRooms(): Room[] {
    return this.repos.rooms.getAll();
  }
  public getRoomsByOrg(orgId: string): Room[] {
    return this.repos.rooms.findByOrg(orgId);
  }
  public addRoom(rm: Room): void {
    this.repos.rooms.insert(rm);
  }
  public deleteRoom(id: string): void {
    this.repos.rooms.delete(id);
  }

  // 17. Seats
  public getSeats(): Seat[] {
    return this.repos.seats.getAll();
  }
  public getSeatsByOrg(orgId: string): Seat[] {
    return this.repos.seats.findByOrg(orgId);
  }
  public addSeat(seat: Seat): void {
    this.repos.seats.insert(seat);
  }
  public updateSeat(id: string, update: Partial<Seat>): void {
    this.repos.seats.update(id, update);
  }
  public deleteSeat(id: string): void {
    this.repos.seats.delete(id);
  }

  // 18. Seat History
  public getSeatHistory(): SeatAssignmentHistory[] {
    return this.repos.seatHistory.getAll();
  }
  public getSeatHistoryByOrg(orgId: string): SeatAssignmentHistory[] {
    return this.repos.seatHistory.findByOrg(orgId);
  }
  public addSeatHistory(sh: SeatAssignmentHistory): void {
    this.repos.seatHistory.insert(sh);
  }

  // 19. Attendances
  public getAttendances(): Attendance[] {
    return this.repos.attendances.getAll();
  }
  public getAttendancesByOrg(orgId: string): Attendance[] {
    return this.repos.attendances.findByOrg(orgId);
  }
  public addAttendance(attendance: Attendance): void {
    this.repos.attendances.insert(attendance);
  }
  public updateAttendance(id: string, update: Partial<Attendance>): void {
    this.repos.attendances.update(id, update);
  }
}

export const dbStore = new DBStore();
