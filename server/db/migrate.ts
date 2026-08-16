import fs from "fs";
import path from "path";
import { getMongoDb, initializeMongoIndexes, closeMongoClient } from "./mongo";
import { COLLECTION_NAMES } from "./schema";

const LEGACY_DB_FILE = path.join(process.cwd(), "db.json");
const DATA_DIR = path.join(process.cwd(), "data");

export interface MigrationResult {
  success: boolean;
  timestamp: string;
  source: string;
  counts: Record<string, number>;
  relationshipChecks: {
    orphanedStudents: number;
    orphanedMemberships: number;
    orphanedSeats: number;
    orphanedPayments: number;
    orphanedAttendances: number;
  };
  errors: string[];
}

export async function runMigration(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    timestamp: new Date().toISOString(),
    source: "db.json",
    counts: {},
    relationshipChecks: {
      orphanedStudents: 0,
      orphanedMemberships: 0,
      orphanedSeats: 0,
      orphanedPayments: 0,
      orphanedAttendances: 0
    },
    errors: []
  };

  try {
    console.log("==================================================");
    console.log(" StudySphere Multi-Tenant Database Migration");
    console.log("==================================================");

    // Step 1: Check legacy source
    if (!fs.existsSync(LEGACY_DB_FILE)) {
      console.log("ℹ️ No legacy db.json file detected. Migration skipped.");
      result.success = true;
      return result;
    }

    const rawContent = fs.readFileSync(LEGACY_DB_FILE, "utf-8");
    let legacyData: any;
    try {
      legacyData = JSON.parse(rawContent);
    } catch (e: any) {
      result.errors.push(`Corrupt legacy JSON: ${e.message}`);
      return result;
    }

    // Support nested `{ data: { ... } }` or direct `{ organizations: [], ... }`
    const sourceObj = legacyData.data || legacyData;

    // Step 2: Ensure data/ directory exists for separate file stores
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Step 3: Extract and normalize each of the 19 collections
    const collections: Record<string, any[]> = {
      [COLLECTION_NAMES.ORGANIZATIONS]: (sourceObj.organizations || []).map((o: any) => ({
        _id: o.id,
        id: o.id,
        name: o.name || "Unnamed Organization",
        logo: o.logo || "",
        address: o.address || "",
        phone: o.phone || "",
        email: o.email || "",
        openingTime: o.openingTime || "06:00",
        closingTime: o.closingTime || "23:00",
        currency: o.currency || "INR",
        timezone: o.timezone || "Asia/Kolkata",
        status: o.status || "active",
        planId: o.planId || "basic",
        createdAt: o.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),

      [COLLECTION_NAMES.USERS]: (sourceObj.users || []).map((u: any) => ({
        _id: u.id,
        id: u.id,
        organizationId: u.organizationId || u.orgId || null,
        orgId: u.organizationId || u.orgId || null,
        email: (u.email || "").toLowerCase().trim(),
        name: u.name || "User",
        role: u.role || "RECEPTIONIST",
        phone: u.phone || "",
        status: u.status || "active",
        emailVerified: Boolean(u.emailVerified),
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),

      [COLLECTION_NAMES.STUDENTS]: (sourceObj.students || []).map((s: any) => ({
        _id: s.id,
        id: s.id,
        organizationId: s.organizationId || s.orgId,
        orgId: s.organizationId || s.orgId,
        studentId: s.studentId || `STUD-${s.id}`,
        name: s.name || "Student",
        gender: s.gender || "other",
        dob: s.dob || "2000-01-01",
        phone: s.phone || "",
        parentPhone: s.parentPhone || "",
        email: s.email || "",
        address: s.address || "",
        emergencyContact: s.emergencyContact || "",
        govIdType: s.govIdType || "Aadhaar",
        govIdNumber: s.govIdNumber || "",
        photo: s.photo || "",
        notes: s.notes || "",
        college: s.college || "",
        course: s.course || "",
        year: s.year || "",
        batch: s.batch || "",
        joinDate: s.joinDate || new Date().toISOString().split("T")[0],
        qrCode: s.qrCode || `${s.studentId}-${s.orgId}`,
        status: s.status || "active",
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),

      [COLLECTION_NAMES.MEMBERSHIP_PLANS]: (sourceObj.membershipPlans || sourceObj.plans || []).map((p: any) => ({
        _id: p.id,
        id: p.id,
        organizationId: p.organizationId || p.orgId,
        orgId: p.organizationId || p.orgId,
        name: p.name || "Plan",
        durationType: p.durationType || "monthly",
        durationDays: p.durationDays || 30,
        price: Number(p.price || 0),
        seatType: p.seatType || "AC",
        timing: p.timing || "Full Day",
        description: p.description || "",
        status: p.status || "active",
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),

      [COLLECTION_NAMES.MEMBERSHIPS]: (sourceObj.memberships || []).map((m: any) => ({
        _id: m.id,
        id: m.id,
        organizationId: m.organizationId || m.orgId,
        orgId: m.organizationId || m.orgId,
        studentId: m.studentId,
        planId: m.planId,
        startDate: m.startDate,
        endDate: m.endDate,
        price: Number(m.price || 0),
        paidAmount: Number(m.paidAmount || 0),
        status: m.status || "active",
        createdAt: m.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),

      [COLLECTION_NAMES.BUILDINGS]: (sourceObj.buildings || []).map((b: any) => ({
        _id: b.id,
        id: b.id,
        organizationId: b.organizationId || b.orgId,
        orgId: b.organizationId || b.orgId,
        name: b.name,
        createdAt: b.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),

      [COLLECTION_NAMES.FLOORS]: (sourceObj.floors || []).map((f: any) => ({
        _id: f.id,
        id: f.id,
        organizationId: f.organizationId || f.orgId,
        orgId: f.organizationId || f.orgId,
        buildingId: f.buildingId,
        name: f.name,
        createdAt: f.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),

      [COLLECTION_NAMES.ROOMS]: (sourceObj.rooms || []).map((r: any) => ({
        _id: r.id,
        id: r.id,
        organizationId: r.organizationId || r.orgId,
        orgId: r.organizationId || r.orgId,
        floorId: r.floorId,
        name: r.name,
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),

      [COLLECTION_NAMES.SEATS]: (sourceObj.seats || []).map((s: any) => ({
        _id: s.id,
        id: s.id,
        organizationId: s.organizationId || s.orgId,
        orgId: s.organizationId || s.orgId,
        roomId: s.roomId,
        seatNumber: s.seatNumber,
        type: s.type || "AC",
        status: s.status || "available",
        assignedStudentId: s.assignedStudentId || null,
        notes: s.notes || "",
        row: s.row || "",
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),

      [COLLECTION_NAMES.SEAT_HISTORY]: (sourceObj.seatHistory || []).map((sh: any) => ({
        _id: sh.id,
        id: sh.id,
        organizationId: sh.organizationId || sh.orgId,
        orgId: sh.organizationId || sh.orgId,
        seatId: sh.seatId,
        studentId: sh.studentId,
        action: sh.action,
        targetSeatId: sh.targetSeatId || null,
        timestamp: sh.timestamp || new Date().toISOString(),
        createdAt: sh.createdAt || new Date().toISOString()
      })),

      [COLLECTION_NAMES.ATTENDANCES]: (sourceObj.attendances || []).map((a: any) => ({
        _id: a.id,
        id: a.id,
        organizationId: a.organizationId || a.orgId,
        orgId: a.organizationId || a.orgId,
        studentId: a.studentId,
        date: a.date,
        checkInTime: a.checkInTime || null,
        checkOutTime: a.checkOutTime || null,
        method: a.method || "manual",
        status: a.status || "present",
        createdAt: a.createdAt || new Date().toISOString()
      })),

      [COLLECTION_NAMES.PAYMENTS]: (sourceObj.payments || []).map((p: any) => ({
        _id: p.id,
        id: p.id,
        organizationId: p.organizationId || p.orgId,
        orgId: p.organizationId || p.orgId,
        studentId: p.studentId,
        membershipId: p.membershipId,
        amount: Number(p.amount || 0),
        discount: Number(p.discount || 0),
        couponCode: p.couponCode || "",
        netPaid: Number(p.netPaid || 0),
        balance: Number(p.balance || 0),
        method: p.method || "cash",
        notes: p.notes || "",
        date: p.date || new Date().toISOString().split("T")[0],
        status: p.status || "paid",
        createdAt: p.createdAt || new Date().toISOString()
      })),

      [COLLECTION_NAMES.INVOICES]: (sourceObj.invoices || []).map((i: any) => ({
        _id: i.id,
        id: i.id,
        organizationId: i.organizationId || i.orgId,
        orgId: i.organizationId || i.orgId,
        paymentId: i.paymentId,
        invoiceNumber: i.invoiceNumber,
        receiptNumber: i.receiptNumber,
        issuedAt: i.issuedAt || new Date().toISOString(),
        createdAt: i.createdAt || new Date().toISOString()
      })),

      [COLLECTION_NAMES.NOTIFICATIONS]: (sourceObj.notifications || []).map((n: any) => ({
        _id: n.id,
        id: n.id,
        organizationId: n.organizationId || n.orgId,
        orgId: n.organizationId || n.orgId,
        title: n.title,
        message: n.message,
        type: n.type || "reminder",
        status: n.status || "unread",
        studentId: n.studentId || null,
        createdAt: n.createdAt || new Date().toISOString()
      })),

      [COLLECTION_NAMES.AUDIT_LOGS]: (sourceObj.auditLogs || []).map((al: any) => ({
        _id: al.id,
        id: al.id,
        organizationId: al.organizationId || al.orgId || null,
        orgId: al.organizationId || al.orgId || null,
        userId: al.userId,
        userName: al.userName,
        action: al.action,
        details: al.details,
        timestamp: al.timestamp || new Date().toISOString(),
        createdAt: al.createdAt || new Date().toISOString()
      })),

      [COLLECTION_NAMES.ANNOUNCEMENTS]: (sourceObj.announcements || []).map((an: any) => ({
        _id: an.id,
        id: an.id,
        organizationId: an.organizationId || an.orgId || null,
        orgId: an.organizationId || an.orgId || null,
        title: an.title,
        content: an.content,
        createdAt: an.createdAt || new Date().toISOString()
      })),

      [COLLECTION_NAMES.EXPENSES]: (sourceObj.expenses || []).map((e: any) => ({
        _id: e.id,
        id: e.id,
        organizationId: e.organizationId || e.orgId,
        orgId: e.organizationId || e.orgId,
        title: e.title,
        category: e.category || "Utilities",
        amount: Number(e.amount || 0),
        date: e.date,
        description: e.description || "",
        createdAt: e.createdAt || new Date().toISOString()
      })),

      [COLLECTION_NAMES.WHATSAPP_CONFIGS]: (sourceObj.whatsappConfigs || []).map((wc: any) => ({
        _id: wc.id,
        id: wc.id,
        organizationId: wc.organizationId || wc.orgId,
        orgId: wc.organizationId || wc.orgId,
        enabled: Boolean(wc.enabled),
        provider: wc.provider || "sandbox",
        apiKey: wc.apiKey || "",
        phoneId: wc.phoneId || "",
        senderNumber: wc.senderNumber || "",
        apiUrl: wc.apiUrl || "",
        apiToken: wc.apiToken || "",
        templates: wc.templates || {
          welcome: "Welcome!",
          upcomingRenewal: "Membership expiring soon.",
          expiredAlert: "Membership expired.",
          paymentReceipt: "Thank you for payment."
        },
        triggerDaysBefore: wc.triggerDaysBefore || 3,
        createdAt: wc.createdAt || new Date().toISOString()
      })),

      [COLLECTION_NAMES.WHATSAPP_LOGS]: (sourceObj.whatsappLogs || []).map((wl: any) => ({
        _id: wl.id,
        id: wl.id,
        organizationId: wl.organizationId || wl.orgId,
        orgId: wl.organizationId || wl.orgId,
        studentId: wl.studentId,
        studentName: wl.studentName,
        phone: wl.phone,
        type: wl.type,
        message: wl.message,
        status: wl.status || "sent",
        errorMessage: wl.errorMessage || "",
        timestamp: wl.timestamp || new Date().toISOString(),
        createdAt: wl.createdAt || new Date().toISOString()
      }))
    };

    // Step 4: Verification of Foreign Key Relationships
    const orgIds = new Set(collections[COLLECTION_NAMES.ORGANIZATIONS].map(o => o.id));
    const studentIds = new Set(collections[COLLECTION_NAMES.STUDENTS].map(s => s.id));
    const seatIds = new Set(collections[COLLECTION_NAMES.SEATS].map(s => s.id));
    const paymentIds = new Set(collections[COLLECTION_NAMES.PAYMENTS].map(p => p.id));

    // Check orphaned records
    collections[COLLECTION_NAMES.STUDENTS].forEach(s => {
      if (s.organizationId && !orgIds.has(s.organizationId)) result.relationshipChecks.orphanedStudents++;
    });
    collections[COLLECTION_NAMES.MEMBERSHIPS].forEach(m => {
      if (!studentIds.has(m.studentId)) result.relationshipChecks.orphanedMemberships++;
    });
    collections[COLLECTION_NAMES.SEATS].forEach(st => {
      if (st.assignedStudentId && !studentIds.has(st.assignedStudentId)) result.relationshipChecks.orphanedSeats++;
    });
    collections[COLLECTION_NAMES.PAYMENTS].forEach(p => {
      if (!studentIds.has(p.studentId)) result.relationshipChecks.orphanedPayments++;
    });
    collections[COLLECTION_NAMES.ATTENDANCES].forEach(a => {
      if (!studentIds.has(a.studentId)) result.relationshipChecks.orphanedAttendances++;
    });

    console.log(" Multi-Tenant Relationship Integrity Verification:");
    console.log(`   - Organizations: ${orgIds.size}`);
    console.log(`   - Students: ${studentIds.size}`);
    console.log(`   - Orphaned check result: ${JSON.stringify(result.relationshipChecks)}`);

    // Step 5: Save each collection to its own independent file store in data/
    for (const [colName, docs] of Object.entries(collections)) {
      const filePath = path.join(DATA_DIR, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf-8");
      result.counts[colName] = docs.length;
      console.log(`   [Collection] ${colName.padEnd(20)} -> ${docs.length.toString().padStart(4)} records saved to data/${colName}.json`);
    }

    // Step 6: If MongoDB is connected, push separate collections and build indexes
    const mongoDb = await getMongoDb();
    if (mongoDb) {
      console.log(" [MongoDB] Syncing collections to live MongoDB database...");
      await initializeMongoIndexes(mongoDb);

      for (const [colName, docs] of Object.entries(collections)) {
        if (docs.length > 0) {
          const col = mongoDb.collection(colName);
          // Perform upserts to guarantee idempotency and avoid duplicates
          for (const doc of docs) {
            const { _id, ...docWithoutId } = doc;
            if (colName === COLLECTION_NAMES.WHATSAPP_CONFIGS && doc.organizationId) {
              await col.updateOne({ organizationId: doc.organizationId }, { $set: docWithoutId }, { upsert: true });
            } else {
              await col.updateOne({ id: doc.id }, { $set: docWithoutId }, { upsert: true });
            }
          }
          console.log(`   [MongoDB] Synced ${docs.length} documents into '${colName}' collection.`);
        }
      }
    }

    // Step 7: Create safe legacy backup
    const backupPath = path.join(process.cwd(), "db.json.legacy_backup");
    if (fs.existsSync(LEGACY_DB_FILE)) {
      fs.copyFileSync(LEGACY_DB_FILE, backupPath);
      console.log(` [Backup] Legacy monolithic db.json safely backed up to ${backupPath}`);
    }

    result.success = true;
    console.log("==================================================");
    console.log(" Multi-Tenant Architecture Migration Complete!");
    console.log("==================================================");
    return result;
  } catch (error: any) {
    result.errors.push(error.message || String(error));
    console.error("❌ Migration failed:", error);
    return result;
  }
}

// Standalone execution support
if (process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js")) {
  runMigration().then(async (res) => {
    await closeMongoClient();
    if (!res.success) {
      console.error("Migration failed with errors:", res.errors);
      process.exit(1);
    }
    console.log("Migration executed successfully!");
    process.exit(0);
  }).catch(async (err) => {
    await closeMongoClient();
    console.error("Migration fatal error:", err);
    process.exit(1);
  });
}
