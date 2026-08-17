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
  try {
    console.log(" [MongoDB] Ensuring indexes across all 19 separate collections...");

    // 1. Organizations
    await db.collection(COLLECTION_NAMES.ORGANIZATIONS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.ORGANIZATIONS).createIndex({ email: 1 });
    await db.collection(COLLECTION_NAMES.ORGANIZATIONS).createIndex({ status: 1 });

    // 2. Users
    await db.collection(COLLECTION_NAMES.USERS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.USERS).createIndex({ email: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.USERS).createIndex({ organizationId: 1, role: 1 });
    await db.collection(COLLECTION_NAMES.USERS).createIndex({ orgId: 1 });

    // 3. Students
    await db.collection(COLLECTION_NAMES.STUDENTS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.STUDENTS).createIndex({ organizationId: 1, studentId: 1 }, { unique: true, sparse: true });
    await db.collection(COLLECTION_NAMES.STUDENTS).createIndex({ organizationId: 1, phone: 1 });
    await db.collection(COLLECTION_NAMES.STUDENTS).createIndex({ orgId: 1 });
    await db.collection(COLLECTION_NAMES.STUDENTS).createIndex({ organizationId: 1, status: 1 });

    // 4. Membership Plans
    await db.collection(COLLECTION_NAMES.MEMBERSHIP_PLANS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.MEMBERSHIP_PLANS).createIndex({ organizationId: 1, status: 1 });
    await db.collection(COLLECTION_NAMES.MEMBERSHIP_PLANS).createIndex({ orgId: 1 });

    // 5. Memberships
    await db.collection(COLLECTION_NAMES.MEMBERSHIPS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.MEMBERSHIPS).createIndex({ organizationId: 1, studentId: 1 });
    await db.collection(COLLECTION_NAMES.MEMBERSHIPS).createIndex({ orgId: 1 });
    await db.collection(COLLECTION_NAMES.MEMBERSHIPS).createIndex({ organizationId: 1, status: 1 });
    await db.collection(COLLECTION_NAMES.MEMBERSHIPS).createIndex({ organizationId: 1, endDate: 1 });

    // 6. Buildings
    await db.collection(COLLECTION_NAMES.BUILDINGS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.BUILDINGS).createIndex({ organizationId: 1 });
    await db.collection(COLLECTION_NAMES.BUILDINGS).createIndex({ orgId: 1 });

    // 7. Floors
    await db.collection(COLLECTION_NAMES.FLOORS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.FLOORS).createIndex({ organizationId: 1, buildingId: 1 });
    await db.collection(COLLECTION_NAMES.FLOORS).createIndex({ orgId: 1 });

    // 8. Rooms
    await db.collection(COLLECTION_NAMES.ROOMS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.ROOMS).createIndex({ organizationId: 1, floorId: 1 });
    await db.collection(COLLECTION_NAMES.ROOMS).createIndex({ orgId: 1 });

    // 9. Seats
    await db.collection(COLLECTION_NAMES.SEATS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.SEATS).createIndex({ organizationId: 1, roomId: 1, seatNumber: 1 });
    await db.collection(COLLECTION_NAMES.SEATS).createIndex({ orgId: 1 });
    await db.collection(COLLECTION_NAMES.SEATS).createIndex({ organizationId: 1, status: 1 });
    await db.collection(COLLECTION_NAMES.SEATS).createIndex({ organizationId: 1, assignedStudentId: 1 });

    // 10. Seat History
    await db.collection(COLLECTION_NAMES.SEAT_HISTORY).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.SEAT_HISTORY).createIndex({ organizationId: 1, seatId: 1 });
    await db.collection(COLLECTION_NAMES.SEAT_HISTORY).createIndex({ orgId: 1 });
    await db.collection(COLLECTION_NAMES.SEAT_HISTORY).createIndex({ organizationId: 1, studentId: 1 });
    await db.collection(COLLECTION_NAMES.SEAT_HISTORY).createIndex({ timestamp: -1 });

    // 11. Attendances
    await db.collection(COLLECTION_NAMES.ATTENDANCES).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.ATTENDANCES).createIndex({ organizationId: 1, studentId: 1, date: 1 });
    await db.collection(COLLECTION_NAMES.ATTENDANCES).createIndex({ orgId: 1 });
    await db.collection(COLLECTION_NAMES.ATTENDANCES).createIndex({ organizationId: 1, date: 1 });

    // 12. Payments
    await db.collection(COLLECTION_NAMES.PAYMENTS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.PAYMENTS).createIndex({ organizationId: 1, studentId: 1 });
    await db.collection(COLLECTION_NAMES.PAYMENTS).createIndex({ orgId: 1 });
    await db.collection(COLLECTION_NAMES.PAYMENTS).createIndex({ organizationId: 1, date: 1 });

    // 13. Invoices
    await db.collection(COLLECTION_NAMES.INVOICES).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.INVOICES).createIndex({ organizationId: 1, paymentId: 1 });
    await db.collection(COLLECTION_NAMES.INVOICES).createIndex({ orgId: 1 });
    await db.collection(COLLECTION_NAMES.INVOICES).createIndex({ organizationId: 1, invoiceNumber: 1 });

    // 14. Notifications
    await db.collection(COLLECTION_NAMES.NOTIFICATIONS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.NOTIFICATIONS).createIndex({ organizationId: 1, status: 1 });
    await db.collection(COLLECTION_NAMES.NOTIFICATIONS).createIndex({ orgId: 1 });
    await db.collection(COLLECTION_NAMES.NOTIFICATIONS).createIndex({ organizationId: 1, studentId: 1 });

    // 15. Audit Logs
    await db.collection(COLLECTION_NAMES.AUDIT_LOGS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.AUDIT_LOGS).createIndex({ organizationId: 1, timestamp: -1 });
    await db.collection(COLLECTION_NAMES.AUDIT_LOGS).createIndex({ orgId: 1 });

    // 16. Announcements
    await db.collection(COLLECTION_NAMES.ANNOUNCEMENTS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.ANNOUNCEMENTS).createIndex({ organizationId: 1 });
    await db.collection(COLLECTION_NAMES.ANNOUNCEMENTS).createIndex({ orgId: 1 });

    // 17. Expenses
    await db.collection(COLLECTION_NAMES.EXPENSES).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.EXPENSES).createIndex({ organizationId: 1, date: 1 });
    await db.collection(COLLECTION_NAMES.EXPENSES).createIndex({ orgId: 1 });
    await db.collection(COLLECTION_NAMES.EXPENSES).createIndex({ organizationId: 1, category: 1 });

    // 18. WhatsApp Configs
    await db.collection(COLLECTION_NAMES.WHATSAPP_CONFIGS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.WHATSAPP_CONFIGS).createIndex({ organizationId: 1 }, { unique: true, sparse: true });
    await db.collection(COLLECTION_NAMES.WHATSAPP_CONFIGS).createIndex({ orgId: 1 });

    // 19. WhatsApp Logs
    await db.collection(COLLECTION_NAMES.WHATSAPP_LOGS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.WHATSAPP_LOGS).createIndex({ organizationId: 1, timestamp: -1 });
    await db.collection(COLLECTION_NAMES.WHATSAPP_LOGS).createIndex({ orgId: 1 });

    console.log(" [MongoDB] All 19 collection indexes verified and ready.");
  } catch (error: any) {
    console.error(" [MongoDB] Failed while creating collection indexes:", error.message);
  }
}

