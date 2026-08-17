import { getMongoDb, initializeMongoIndexes, closeMongoClient } from "./mongo";
import { COLLECTION_NAMES } from "./schema";

export async function clearAllDemoData(): Promise<{ success: boolean; counts: Record<string, number> }> {
  console.log("==================================================");
  console.log(" Purging Demo Data from MongoDB Atlas");
  console.log("==================================================");

  const db = await getMongoDb();
  await initializeMongoIndexes(db);

  const counts: Record<string, number> = {};

  // Collections to completely empty
  const collectionsToClear = [
    COLLECTION_NAMES.STUDENTS,
    COLLECTION_NAMES.MEMBERSHIPS,
    COLLECTION_NAMES.MEMBERSHIP_PLANS,
    COLLECTION_NAMES.BUILDINGS,
    COLLECTION_NAMES.FLOORS,
    COLLECTION_NAMES.ROOMS,
    COLLECTION_NAMES.SEATS,
    COLLECTION_NAMES.SEAT_HISTORY,
    COLLECTION_NAMES.ATTENDANCES,
    COLLECTION_NAMES.PAYMENTS,
    COLLECTION_NAMES.INVOICES,
    COLLECTION_NAMES.NOTIFICATIONS,
    COLLECTION_NAMES.AUDIT_LOGS,
    COLLECTION_NAMES.ANNOUNCEMENTS,
    COLLECTION_NAMES.EXPENSES,
    COLLECTION_NAMES.WHATSAPP_CONFIGS,
    COLLECTION_NAMES.WHATSAPP_LOGS,
    COLLECTION_NAMES.ORGANIZATIONS
  ];

  for (const colName of collectionsToClear) {
    const col = db.collection(colName);
    const delRes = await col.deleteMany({});
    counts[colName] = delRes.deletedCount || 0;
    console.log(` Cleared collection '${colName}': ${counts[colName]} documents removed.`);
  }

  // Clear demo users and ensure single clean Super Admin remains
  const usersCol = db.collection(COLLECTION_NAMES.USERS);
  const userDelRes = await usersCol.deleteMany({});
  counts[COLLECTION_NAMES.USERS] = userDelRes.deletedCount || 0;
  console.log(` Cleared demo users: ${counts[COLLECTION_NAMES.USERS]} removed.`);

  // Create clean initial Platform Super Admin
  const superAdmin = {
    _id: "user-super",
    id: "user-super",
    organizationId: null,
    orgId: null,
    email: "superadmin@platform.com",
    password: "password",
    name: "Platform Administrator",
    role: "SUPER_ADMIN",
    phone: "+91 99999 99999",
    status: "active",
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await usersCol.updateOne(
    { id: "user-super" },
    { $set: superAdmin },
    { upsert: true }
  );
  console.log(" Seeded clean Platform Super Admin: superadmin@platform.com");

  console.log("==================================================");
  console.log(" Demo data purged successfully from MongoDB Atlas.");
  console.log("==================================================");

  return { success: true, counts };
}

// Standalone execution
if (process.argv[1] && process.argv[1].endsWith("clean.ts")) {
  clearAllDemoData()
    .then(() => closeMongoClient())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Clean error:", err);
      process.exit(1);
    });
}
