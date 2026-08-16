import { MongoClient, Db, Collection } from "mongodb";
import { COLLECTION_NAMES } from "./schema";

let client: MongoClient | null = null;
let dbInstance: Db | null = null;
let isConnected = false;
let connectionAttempted = false;

export async function getMongoClient(): Promise<MongoClient | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return null;
  }

  if (client && isConnected) {
    return client;
  }

  if (!connectionAttempted) {
    connectionAttempted = true;
    try {
      client = new MongoClient(uri, {
        maxPoolSize: 20,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 3000
      });
      await client.connect();
      isConnected = true;
      console.log(" [MongoDB] Successfully connected to multi-tenant MongoDB cluster.");
    } catch (error) {
      console.warn(" [MongoDB] MongoDB connection failed or timed out. Falling back to discrete multi-collection storage.", (error as Error).message);
      client = null;
      isConnected = false;
    }
  }

  return client;
}

export async function closeMongoClient(): Promise<void> {
  if (client) {
    try {
      await client.close();
      client = null;
      isConnected = false;
      dbInstance = null;
    } catch (e) {
      // Ignore close error
    }
  }
}

export async function getMongoDb(): Promise<Db | null> {
  if (dbInstance && isConnected) return dbInstance;
  const mongoClient = await getMongoClient();
  if (!mongoClient) return null;
  
  try {
    dbInstance = mongoClient.db();
    return dbInstance;
  } catch (error) {
    console.error(" [MongoDB] Failed to retrieve database instance:", error);
    return null;
  }
}

export async function getCollection<T extends Document = any>(name: string): Promise<Collection<T> | null> {
  const db = await getMongoDb();
  if (!db) return null;
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

    // 3. Students
    await db.collection(COLLECTION_NAMES.STUDENTS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.STUDENTS).createIndex({ organizationId: 1, studentId: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.STUDENTS).createIndex({ organizationId: 1, phone: 1 });
    await db.collection(COLLECTION_NAMES.STUDENTS).createIndex({ organizationId: 1, status: 1 });

    // 4. Membership Plans
    await db.collection(COLLECTION_NAMES.MEMBERSHIP_PLANS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.MEMBERSHIP_PLANS).createIndex({ organizationId: 1, status: 1 });

    // 5. Memberships
    await db.collection(COLLECTION_NAMES.MEMBERSHIPS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.MEMBERSHIPS).createIndex({ organizationId: 1, studentId: 1 });
    await db.collection(COLLECTION_NAMES.MEMBERSHIPS).createIndex({ organizationId: 1, status: 1 });
    await db.collection(COLLECTION_NAMES.MEMBERSHIPS).createIndex({ organizationId: 1, endDate: 1 });

    // 6. Buildings
    await db.collection(COLLECTION_NAMES.BUILDINGS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.BUILDINGS).createIndex({ organizationId: 1 });

    // 7. Floors
    await db.collection(COLLECTION_NAMES.FLOORS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.FLOORS).createIndex({ organizationId: 1, buildingId: 1 });

    // 8. Rooms
    await db.collection(COLLECTION_NAMES.ROOMS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.ROOMS).createIndex({ organizationId: 1, floorId: 1 });

    // 9. Seats
    await db.collection(COLLECTION_NAMES.SEATS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.SEATS).createIndex({ organizationId: 1, roomId: 1, seatNumber: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.SEATS).createIndex({ organizationId: 1, status: 1 });
    await db.collection(COLLECTION_NAMES.SEATS).createIndex({ organizationId: 1, assignedStudentId: 1 });

    // 10. Seat History
    await db.collection(COLLECTION_NAMES.SEAT_HISTORY).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.SEAT_HISTORY).createIndex({ organizationId: 1, seatId: 1 });
    await db.collection(COLLECTION_NAMES.SEAT_HISTORY).createIndex({ organizationId: 1, studentId: 1 });
    await db.collection(COLLECTION_NAMES.SEAT_HISTORY).createIndex({ timestamp: -1 });

    // 11. Attendances
    await db.collection(COLLECTION_NAMES.ATTENDANCES).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.ATTENDANCES).createIndex({ organizationId: 1, studentId: 1, date: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.ATTENDANCES).createIndex({ organizationId: 1, date: 1 });

    // 12. Payments
    await db.collection(COLLECTION_NAMES.PAYMENTS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.PAYMENTS).createIndex({ organizationId: 1, studentId: 1 });
    await db.collection(COLLECTION_NAMES.PAYMENTS).createIndex({ organizationId: 1, date: 1 });

    // 13. Invoices
    await db.collection(COLLECTION_NAMES.INVOICES).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.INVOICES).createIndex({ organizationId: 1, paymentId: 1 });
    await db.collection(COLLECTION_NAMES.INVOICES).createIndex({ organizationId: 1, invoiceNumber: 1 });

    // 14. Notifications
    await db.collection(COLLECTION_NAMES.NOTIFICATIONS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.NOTIFICATIONS).createIndex({ organizationId: 1, status: 1 });
    await db.collection(COLLECTION_NAMES.NOTIFICATIONS).createIndex({ organizationId: 1, studentId: 1 });

    // 15. Audit Logs
    await db.collection(COLLECTION_NAMES.AUDIT_LOGS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.AUDIT_LOGS).createIndex({ organizationId: 1, timestamp: -1 });

    // 16. Announcements
    await db.collection(COLLECTION_NAMES.ANNOUNCEMENTS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.ANNOUNCEMENTS).createIndex({ organizationId: 1 });

    // 17. Expenses
    await db.collection(COLLECTION_NAMES.EXPENSES).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.EXPENSES).createIndex({ organizationId: 1, date: 1 });
    await db.collection(COLLECTION_NAMES.EXPENSES).createIndex({ organizationId: 1, category: 1 });

    // 18. WhatsApp Configs
    await db.collection(COLLECTION_NAMES.WHATSAPP_CONFIGS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.WHATSAPP_CONFIGS).createIndex({ organizationId: 1 }, { unique: true });

    // 19. WhatsApp Logs
    await db.collection(COLLECTION_NAMES.WHATSAPP_LOGS).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLLECTION_NAMES.WHATSAPP_LOGS).createIndex({ organizationId: 1, timestamp: -1 });

    console.log(" [MongoDB] All indexes verified and ready.");
  } catch (error) {
    console.error(" [MongoDB] Failed while creating collection indexes:", error);
  }
}
