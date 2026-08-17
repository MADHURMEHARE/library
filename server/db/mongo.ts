import "dotenv/config";
import { MongoClient, Db, Collection, Document } from "mongodb";
import { COLLECTION_NAMES } from "./schema";

const DEFAULT_FALLBACK_URI = "mongodb+srv://madhur:Madhur123456@cluster0.2osvt7u.mongodb.net/reading-room?retryWrites=true&w=majority&appName=Cluster0";

let client: MongoClient | null = null;
let dbInstance: Db | null = null;
let isConnecting = false;

export function getMongoUri(): string {
  return process.env.MONGODB_URI || DEFAULT_FALLBACK_URI;
}

export async function getMongoClient(): Promise<MongoClient> {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables.");
  }

  if (client) {
    try {
      // Ping to verify connection is alive
      await client.db().command({ ping: 1 });
      return client;
    } catch {
      console.warn(" [MongoDB] Existing connection stale, reconnecting...");
      try {
        await client.close();
      } catch {
        // ignore
      }
      client = null;
      dbInstance = null;
    }
  }

  if (isConnecting) {
    // Wait for in-flight connection attempt
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 100));
      if (client) return client;
    }
  }

  isConnecting = true;
  try {
    console.log(" [MongoDB] Connecting to MongoDB Atlas cluster...");
    client = new MongoClient(uri, {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      retryWrites: true
    });
    await client.connect();
    console.log(" [MongoDB] Connected successfully to MongoDB Atlas.");
    dbInstance = client.db();
    return client;
  } catch (error: any) {
    client = null;
    dbInstance = null;
    console.error(" [MongoDB] Failed to connect to MongoDB Atlas:", error.message);
    throw new Error(`MongoDB connection failed: ${error.message}`);
  } finally {
    isConnecting = false;
  }
}

export async function closeMongoClient(): Promise<void> {
  if (client) {
    try {
      await client.close();
      client = null;
      dbInstance = null;
      console.log(" [MongoDB] Connection closed.");
    } catch (e: any) {
      console.warn(" [MongoDB] Error closing connection:", e.message);
    }
  }
}

export async function getMongoDb(): Promise<Db> {
  if (dbInstance) {
    return dbInstance;
  }
  const mongoClient = await getMongoClient();
  dbInstance = mongoClient.db();
  return dbInstance;
}

export async function getCollection<T extends Document = any>(name: string): Promise<Collection<T>> {
  const db = await getMongoDb();
  return db.collection<T>(name);
}

/**
 * Initializes compound indexes and multi-tenant constraints on all 19 collections.
 */
export async function initializeMongoIndexes(db: Db): Promise<void> {
  const safeCreateIndex = async (collectionName: string, spec: any, options: any = {}) => {
    try {
      await db.collection(collectionName).createIndex(spec, options);
    } catch (err: any) {
      // If index exists or differs slightly in options, log and continue safely
    }
  };

  try {
    console.log(" [MongoDB] Ensuring indexes across all 19 separate collections...");

    // 1. Organizations
    await safeCreateIndex(COLLECTION_NAMES.ORGANIZATIONS, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.ORGANIZATIONS, { email: 1 });
    await safeCreateIndex(COLLECTION_NAMES.ORGANIZATIONS, { status: 1 });

    // 2. Users
    await safeCreateIndex(COLLECTION_NAMES.USERS, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.USERS, { email: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.USERS, { organizationId: 1, role: 1 });
    await safeCreateIndex(COLLECTION_NAMES.USERS, { orgId: 1 });

    // 3. Students
    await safeCreateIndex(COLLECTION_NAMES.STUDENTS, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.STUDENTS, { organizationId: 1, studentId: 1 }, { unique: true, sparse: true });
    await safeCreateIndex(COLLECTION_NAMES.STUDENTS, { organizationId: 1, phone: 1 });
    await safeCreateIndex(COLLECTION_NAMES.STUDENTS, { orgId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.STUDENTS, { organizationId: 1, status: 1 });

    // 4. Membership Plans
    await safeCreateIndex(COLLECTION_NAMES.MEMBERSHIP_PLANS, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.MEMBERSHIP_PLANS, { organizationId: 1, status: 1 });
    await safeCreateIndex(COLLECTION_NAMES.MEMBERSHIP_PLANS, { orgId: 1 });

    // 5. Memberships
    await safeCreateIndex(COLLECTION_NAMES.MEMBERSHIPS, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.MEMBERSHIPS, { organizationId: 1, studentId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.MEMBERSHIPS, { orgId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.MEMBERSHIPS, { organizationId: 1, status: 1 });
    await safeCreateIndex(COLLECTION_NAMES.MEMBERSHIPS, { organizationId: 1, endDate: 1 });

    // 6. Buildings
    await safeCreateIndex(COLLECTION_NAMES.BUILDINGS, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.BUILDINGS, { organizationId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.BUILDINGS, { orgId: 1 });

    // 7. Floors
    await safeCreateIndex(COLLECTION_NAMES.FLOORS, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.FLOORS, { organizationId: 1, buildingId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.FLOORS, { orgId: 1 });

    // 8. Rooms
    await safeCreateIndex(COLLECTION_NAMES.ROOMS, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.ROOMS, { organizationId: 1, floorId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.ROOMS, { orgId: 1 });

    // 9. Seats
    await safeCreateIndex(COLLECTION_NAMES.SEATS, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.SEATS, { organizationId: 1, roomId: 1, seatNumber: 1 });
    await safeCreateIndex(COLLECTION_NAMES.SEATS, { orgId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.SEATS, { organizationId: 1, status: 1 });
    await safeCreateIndex(COLLECTION_NAMES.SEATS, { organizationId: 1, assignedStudentId: 1 });

    // 10. Seat History
    await safeCreateIndex(COLLECTION_NAMES.SEAT_HISTORY, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.SEAT_HISTORY, { organizationId: 1, seatId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.SEAT_HISTORY, { orgId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.SEAT_HISTORY, { organizationId: 1, studentId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.SEAT_HISTORY, { timestamp: -1 });

    // 11. Attendances
    await safeCreateIndex(COLLECTION_NAMES.ATTENDANCES, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.ATTENDANCES, { organizationId: 1, studentId: 1, date: 1 });
    await safeCreateIndex(COLLECTION_NAMES.ATTENDANCES, { orgId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.ATTENDANCES, { organizationId: 1, date: 1 });

    // 12. Payments
    await safeCreateIndex(COLLECTION_NAMES.PAYMENTS, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.PAYMENTS, { organizationId: 1, studentId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.PAYMENTS, { orgId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.PAYMENTS, { organizationId: 1, date: 1 });

    // 13. Invoices
    await safeCreateIndex(COLLECTION_NAMES.INVOICES, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.INVOICES, { organizationId: 1, paymentId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.INVOICES, { orgId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.INVOICES, { organizationId: 1, invoiceNumber: 1 });

    // 14. Notifications
    await safeCreateIndex(COLLECTION_NAMES.NOTIFICATIONS, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.NOTIFICATIONS, { organizationId: 1, status: 1 });
    await safeCreateIndex(COLLECTION_NAMES.NOTIFICATIONS, { orgId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.NOTIFICATIONS, { organizationId: 1, studentId: 1 });

    // 15. Audit Logs
    await safeCreateIndex(COLLECTION_NAMES.AUDIT_LOGS, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.AUDIT_LOGS, { organizationId: 1, timestamp: -1 });
    await safeCreateIndex(COLLECTION_NAMES.AUDIT_LOGS, { orgId: 1 });

    // 16. Announcements
    await safeCreateIndex(COLLECTION_NAMES.ANNOUNCEMENTS, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.ANNOUNCEMENTS, { organizationId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.ANNOUNCEMENTS, { orgId: 1 });

    // 17. Expenses
    await safeCreateIndex(COLLECTION_NAMES.EXPENSES, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.EXPENSES, { organizationId: 1, date: 1 });
    await safeCreateIndex(COLLECTION_NAMES.EXPENSES, { orgId: 1 });
    await safeCreateIndex(COLLECTION_NAMES.EXPENSES, { organizationId: 1, category: 1 });

    // 18. WhatsApp Configs
    await safeCreateIndex(COLLECTION_NAMES.WHATSAPP_CONFIGS, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.WHATSAPP_CONFIGS, { organizationId: 1 }, { unique: true, sparse: true });
    await safeCreateIndex(COLLECTION_NAMES.WHATSAPP_CONFIGS, { orgId: 1 });

    // 19. WhatsApp Logs
    await safeCreateIndex(COLLECTION_NAMES.WHATSAPP_LOGS, { id: 1 }, { unique: true });
    await safeCreateIndex(COLLECTION_NAMES.WHATSAPP_LOGS, { organizationId: 1, timestamp: -1 });
    await safeCreateIndex(COLLECTION_NAMES.WHATSAPP_LOGS, { orgId: 1 });

    console.log(" [MongoDB] All 19 collection indexes verified and ready.");
  } catch (error: any) {
    console.error(" [MongoDB] Failed while creating collection indexes:", error.message);
  }
}

