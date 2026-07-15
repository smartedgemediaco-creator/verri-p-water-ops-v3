import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/water-ops-v3";

// Canonical staff list (latest salary used for the staff record)
const staffList = [
  { canonicalName: "MR FEMI", salary: 80000, position: "DRIVER" },
  { canonicalName: "MR TUNDE", salary: 100000, position: "DRIVER" },
  { canonicalName: "AKUETE", salary: 100000, position: "DRIVER" },
  { canonicalName: "NIFEMI", salary: 50000, position: "SALES BOY" },
  { canonicalName: "SUNKANMI", salary: 50000, position: "SALES BOY" },
  { canonicalName: "TOBILOBA", salary: 50000, position: "SALES BOY" },
  { canonicalName: "OPEYEMI", salary: 50000, position: "LOADER" },
  { canonicalName: "RECHEAL", salary: 40000, position: "LOADER" },
  { canonicalName: "ISLAMID", salary: 50000, position: "LOADER" },
  { canonicalName: "JOY ALICE", salary: 100000, position: "ASSISTANT" },
  { canonicalName: "JOSHUA", salary: 50000, position: "SALES BOY" },
  { canonicalName: "KAMORU", salary: 30000, position: "DEPO SALES BOY" },
  { canonicalName: "BLESSING", salary: 30000, position: "DEPO SALES GIRL" },
  { canonicalName: "BABA IBEJI", salary: 30000, position: "SECURITY" },
  { canonicalName: "MATTHEW", salary: 70000, position: "PERSONAL DRIVER" },
];

// Name → canonical name mapping
const nameMap: Record<string, string> = {
  "MR FEMI": "MR FEMI",
  "MR TUNDE": "MR TUNDE",
  "MR TUDE": "MR TUNDE",
  "AKUETE": "AKUETE",
  "NIFEMI": "NIFEMI",
  "SUNKANMI": "SUNKANMI",
  "TOBILOBA": "TOBILOBA",
  "TOBI": "TOBILOBA",
  "OPEYEMI": "OPEYEMI",
  "OPE": "OPEYEMI",
  "RECHEAL": "RECHEAL",
  "ISLAMID": "ISLAMID",
  "JOY": "JOY ALICE",
  "INYANG JOY ALICE": "JOY ALICE",
  "JOY ALICE": "JOY ALICE",
  "JOSHUA": "JOSHUA",
  "MR JOSHUA": "JOSHUA",
  "KAMORU": "KAMORU",
  "BLESSING": "BLESSING",
  "BABA IBEJI": "BABA IBEJI",
  "MATTHEW": "MATTHEW",
};

// Payroll data: { month, name (as in source), salary, debt, absence, lateness, bonus }
const payrollRaw = [
  // April
  { month: "2026-04", name: "MR FEMI", salary: 80000, debt: 31550, absence: 6400, lateness: 0, bonus: 0 },
  { month: "2026-04", name: "MR TUNDE", salary: 80000, debt: 55000, absence: 6400, lateness: 0, bonus: 0 },
  { month: "2026-04", name: "AKUETE", salary: 80000, debt: 25000, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-04", name: "NIFEMI", salary: 50000, debt: 0, absence: 5000, lateness: 0, bonus: 0 },
  { month: "2026-04", name: "SUNKANMI", salary: 50000, debt: 30700, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-04", name: "TOBILOBA", salary: 50000, debt: 31940, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-04", name: "OPEYEMI", salary: 50000, debt: 10500, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-04", name: "RECHEAL", salary: 40000, debt: 0, absence: 8000, lateness: 0, bonus: 0 },
  { month: "2026-04", name: "ISLAMID", salary: 40000, debt: 0, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-04", name: "JOY", salary: 70000, debt: 2000, absence: 0, lateness: 0, bonus: 10577 },
  // May
  { month: "2026-05", name: "MR FEMI", salary: 80000, debt: 50200, absence: 0, lateness: 3076.9, bonus: 0 },
  { month: "2026-05", name: "MR TUNDE", salary: 80000, debt: 78500, absence: 9230, lateness: 0, bonus: 0 },
  { month: "2026-05", name: "AKUETE", salary: 80000, debt: 37398, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-05", name: "TOBILOBA", salary: 50000, debt: 25200, absence: 0, lateness: 500, bonus: 0 },
  { month: "2026-05", name: "OPE", salary: 50000, debt: 8390, absence: 0, lateness: 500, bonus: 0 },
  { month: "2026-05", name: "SUNKANMI", salary: 50000, debt: 19550, absence: 17307.6, lateness: 0, bonus: 0 },
  { month: "2026-05", name: "NIFEMI", salary: 50000, debt: 0, absence: 0, lateness: 1000, bonus: 0 },
  { month: "2026-05", name: "ISLAMID", salary: 40000, debt: 0, absence: 0, lateness: 1538.4, bonus: 0 },
  { month: "2026-05", name: "INYANG JOY ALICE", salary: 70000, debt: 0, absence: 0, lateness: 0, bonus: 11469.5 },
  { month: "2026-05", name: "JOSHUA", salary: 50000, debt: 0, absence: 12307.6, lateness: 0, bonus: 0 },
  // June
  { month: "2026-06", name: "MR TUDE", salary: 100000, debt: 74000, absence: 3846.1, lateness: 0, bonus: 0 },
  { month: "2026-06", name: "AKUETE", salary: 100000, debt: 60700, absence: 0, lateness: 0, bonus: 13500 },
  { month: "2026-06", name: "TOBI", salary: 50000, debt: 21620, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-06", name: "JOSHUA", salary: 50000, debt: 9500, absence: 1923.1, lateness: 0, bonus: 0 },
  { month: "2026-06", name: "OPE", salary: 50000, debt: 15000, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-06", name: "ISLAMID", salary: 50000, debt: 0, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-06", name: "SUNKANMI", salary: 50000, debt: 15898, absence: 5769.2, lateness: 0, bonus: 1200 },
  { month: "2026-06", name: "JOY", salary: 100000, debt: 3900, absence: 0, lateness: 0, bonus: 3000 },
  { month: "2026-06", name: "KAMORU", salary: 30000, debt: 15400, absence: 2307.6, lateness: 0, bonus: 0 },
  { month: "2026-06", name: "BLESSING", salary: 30000, debt: 1300, absence: 13846.1, lateness: 500, bonus: 0 },
  { month: "2026-06", name: "BABA IBEJI", salary: 30000, debt: 10000, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-06", name: "NIFEMI", salary: 50000, debt: 0, absence: 36538.4, lateness: 0, bonus: 0 },
  // July
  { month: "2026-07", name: "MR TUNDE", salary: 100000, debt: 0, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-07", name: "AKUETE", salary: 100000, debt: 0, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-07", name: "TOBI", salary: 50000, debt: 0, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-07", name: "NIFEMI", salary: 50000, debt: 0, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-07", name: "OPE", salary: 50000, debt: 0, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-07", name: "ISLAMID", salary: 50000, debt: 0, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-07", name: "SUNKANMI", salary: 50000, debt: 0, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-07", name: "MR JOSHUA", salary: 50000, debt: 0, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-07", name: "KAMORU", salary: 30000, debt: 0, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-07", name: "BLESSING", salary: 30000, debt: 0, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-07", name: "BABA IBEJI", salary: 30000, debt: 0, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-07", name: "JOY ALICE", salary: 100000, debt: 0, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-07", name: "MATTHEW", salary: 70000, debt: 10000, absence: 0, lateness: 0, bonus: 0 },
];

const positionRoleMap: Record<string, { role: string; department: string }> = {
  DRIVER: { role: "driver", department: "logistics" },
  "PERSONAL DRIVER": { role: "driver", department: "logistics" },
  "SALES BOY": { role: "other", department: "sales" },
  "DEPO SALES BOY": { role: "other", department: "sales" },
  "DEPO SALES GIRL": { role: "other", department: "sales" },
  LOADER: { role: "loader", department: "logistics" },
  ASSISTANT: { role: "other", department: "administration" },
  SECURITY: { role: "security", department: "security" },
};

// Name → position map (use the position from the first occurrence or "–" entry)
const positionMap: Record<string, string> = {
  "MR FEMI": "DRIVER",
  "MR TUNDE": "DRIVER",
  "AKUETE": "DRIVER",
  "NIFEMI": "SALES BOY",
  "SUNKANMI": "SALES BOY",
  "TOBILOBA": "SALES BOY",
  "OPEYEMI": "LOADER",
  "RECHEAL": "LOADER",
  "ISLAMID": "LOADER",
  "JOY ALICE": "ASSISTANT",
  "JOSHUA": "SALES BOY",
  "KAMORU": "DEPO SALES BOY",
  "BLESSING": "DEPO SALES GIRL",
  "BABA IBEJI": "SECURITY",
  "MATTHEW": "PERSONAL DRIVER",
};

// Existing staff name → id (from DB check)
const existingStaff: Record<string, string> = {
  "Taiwo Lasile": "6a24365a18479ec80e6dad6e",
  "Akuete": "6a29672c0dda6ef975272707",
  "Oluwaseun Abajingin": "6a2968366a8a4afac5e80e30",
  "Joy Inyang": "6a56480ccbb88f6607f0bb9d",
  "MR FEMI": "6a57610a4d33f264634e8a5f",
  "MR TUNDE": "6a57610b4d33f264634e8a60",
  "AKUETE": "6a57610b4d33f264634e8a61",
  "NIFEMI": "6a57610b4d33f264634e8a62",
};

function resolveCanonical(rawName: string): string {
  return nameMap[rawName.toUpperCase().trim()] || rawName.toUpperCase().trim();
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");
  const db = mongoose.connection.db!;

  const Staff = db.collection("staffs");
  const StaffAssignments = db.collection("staffassignments");
  const PayrollRecords = db.collection("payrollrecords");

  // Delete previously seeded staff and their assignments/payroll (the 4 we created)
  const seededIds = ["6a57610a4d33f264634e8a5f", "6a57610b4d33f264634e8a60", "6a57610b4d33f264634e8a61", "6a57610b4d33f264634e8a62"].map(id => new mongoose.Types.ObjectId(id));
  await Staff.deleteMany({ _id: { $in: seededIds } });
  await StaffAssignments.deleteMany({ staffId: { $in: seededIds } });
  await PayrollRecords.deleteMany({ staffId: { $in: seededIds } });
  console.log("Cleaned up previously seeded staff");

  // Also handle "Joy Inyang" (existing) — merge into JOY ALICE if needed
  // and "Akuete" (existing lowercase) — merge into AKUETE
  const factory = await db.collection("factories").findOne({});
  if (!factory) { console.error("No factory found"); process.exit(1); }

  const staffIds: Record<string, mongoose.Types.ObjectId> = {};

  // Create or update staff
  for (const s of staffList) {
    const canonical = s.canonicalName;
    const position = positionMap[canonical] || s.position;
    const { role, department } = positionRoleMap[position] || { role: "other", department: "administration" };

    // Check if already exists (by canonical name or similar existing)
    let existing = await Staff.findOne({ name: canonical });
    if (!existing && canonical === "JOY ALICE") {
      existing = await Staff.findOne({ name: "Joy Inyang" });
      if (existing) {
        // Rename to canonical
        await Staff.updateOne({ _id: existing._id }, { $set: { name: "JOY ALICE", salary: s.salary } });
        console.log(`Renamed "Joy Inyang" → "JOY ALICE" and updated salary to ₦${s.salary}`);
      }
    }
    if (!existing && canonical === "AKUETE") {
      existing = await Staff.findOne({ name: "Akuete" });
      if (existing) {
        await Staff.updateOne({ _id: existing._id }, { $set: { name: "AKUETE", salary: s.salary } });
        console.log(`Renamed "Akuete" → "AKUETE" and updated salary to ₦${s.salary}`);
      }
    }

    if (existing) {
      staffIds[canonical] = existing._id;
      // Update salary to latest
      await Staff.updateOne({ _id: existing._id }, { $set: { salary: s.salary } });
      console.log(`Updated "${canonical}" salary to ₦${s.salary}`);
    } else {
      const result = await Staff.insertOne({
        name: canonical,
        phone: "",
        email: "",
        salary: s.salary,
        employmentType: "full-time",
        startDate: new Date("2025-01-01"),
        isActive: true,
        emergencyContact: "",
        notes: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      staffIds[canonical] = result.insertedId;
      console.log(`Created staff "${canonical}" (ID: ${result.insertedId})`);
    }

    // Ensure assignment exists
    const existingAssignment = await StaffAssignments.findOne({ staffId: staffIds[canonical], isActive: true });
    if (!existingAssignment) {
      await StaffAssignments.insertOne({
        staffId: staffIds[canonical],
        locationType: "factory",
        locationId: factory._id,
        role,
        department,
        isActive: true,
        startDate: new Date("2025-01-01"),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`Created assignment for "${canonical}" as ${role}/${department}`);
    }
  }

  // Create or update payroll records
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const p of payrollRaw) {
    const canonical = resolveCanonical(p.name);
    const staffId = staffIds[canonical];
    if (!staffId) {
      console.log(`WARNING: No staff ID for "${canonical}" (${p.month}), skipping`);
      skipped++;
      continue;
    }

    const totalDeductions = p.debt + p.absence + p.lateness;
    const netPay = p.salary - totalDeductions + p.bonus;

    const existing = await PayrollRecords.findOne({ staffId, month: p.month });
    if (existing) {
      // Update existing record
      await PayrollRecords.updateOne(
        { _id: existing._id },
        {
          $set: {
            baseSalary: p.salary,
            deductions: { absence: p.absence, lateness: p.lateness, debt: p.debt, punishment: 0, other: 0 },
            bonus: p.bonus,
            netPay,
            updatedAt: new Date(),
          },
        }
      );
      updated++;
    } else {
      await PayrollRecords.insertOne({
        staffId,
        month: p.month,
        baseSalary: p.salary,
        deductions: { absence: p.absence, lateness: p.lateness, debt: p.debt, punishment: 0, other: 0 },
        bonus: p.bonus,
        netPay,
        status: "pending",
        paidAmount: 0,
        notes: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      created++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Staff created/updated: ${staffList.length}`);
  console.log(`Payroll records created: ${created}`);
  console.log(`Payroll records updated: ${updated}`);
  console.log(`Payroll records skipped: ${skipped}`);

  await mongoose.disconnect();
}

seed().catch((e) => { console.error("Seed failed:", e); process.exit(1); });
