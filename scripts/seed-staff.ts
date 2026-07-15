import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/water-ops-v3";

const staffData = [
  { name: "MR FEMI", position: "DRIVER", salary: 80000 },
  { name: "MR TUNDE", position: "DRIVER", salary: 80000 },
  { name: "AKUETE", position: "DRIVER", salary: 80000 },
  { name: "NIFEMI", position: "SALES BOY", salary: 50000 },
];

const payrollData = [
  { month: "2026-04", name: "MR FEMI", debt: 31550, absence: 6400, lateness: 0, bonus: 0 },
  { month: "2026-04", name: "MR TUNDE", debt: 55000, absence: 6400, lateness: 0, bonus: 0 },
  { month: "2026-04", name: "AKUETE", debt: 25000, absence: 0, lateness: 0, bonus: 0 },
  { month: "2026-04", name: "NIFEMI", debt: 0, absence: 0, lateness: 500, bonus: 0 },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db!;
  const Staff = db.collection("staffs");
  const StaffAssignments = db.collection("staffassignments");
  const PayrollRecords = db.collection("payrollrecords");

  // Create staff records
  const staffIds: Record<string, mongoose.Types.ObjectId> = {};

  for (const s of staffData) {
    const existing = await Staff.findOne({ name: s.name });
    if (existing) {
      console.log(`Staff "${s.name}" already exists, using existing`);
      staffIds[s.name] = existing._id;
    } else {
      const result = await Staff.insertOne({
        name: s.name,
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
      staffIds[s.name] = result.insertedId;
      console.log(`Created staff "${s.name}" (ID: ${result.insertedId})`);
    }
  }

  // Create staff assignments (role-based)
  const roleMap: Record<string, string> = {
    DRIVER: "driver",
    "SALES BOY": "other",
  };

  for (const s of staffData) {
    const staffId = staffIds[s.name];
    const existingAssignment = await StaffAssignments.findOne({
      staffId,
      isActive: true,
    });
    if (!existingAssignment) {
      await StaffAssignments.insertOne({
        staffId,
        locationType: "factory",
        locationId: new mongoose.Types.ObjectId(), // placeholder
        role: roleMap[s.position] || "other",
        department: s.position === "DRIVER" ? "logistics" : "sales",
        isActive: true,
        startDate: new Date("2025-01-01"),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`Created assignment for "${s.name}" as ${s.position}`);
    }
  }

  // Create payroll records
  for (const p of payrollData) {
    const staffId = staffIds[p.name];
    const staff = staffData.find((s) => s.name === p.name);
    if (!staff || !staffId) continue;

    const totalDeductions = p.debt + p.absence + p.lateness;
    const netPay = staff.salary + p.bonus - totalDeductions;

    const existing = await PayrollRecords.findOne({ staffId, month: p.month });
    if (existing) {
      console.log(`Payroll for "${p.name}" ${p.month} already exists, skipping`);
      continue;
    }

    await PayrollRecords.insertOne({
      staffId,
      month: p.month,
      baseSalary: staff.salary,
      deductions: {
        absence: p.absence,
        lateness: p.lateness,
        debt: p.debt,
        punishment: 0,
        other: 0,
      },
      bonus: p.bonus,
      netPay,
      status: "pending",
      paidAmount: 0,
      notes: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`Created payroll for "${p.name}" ${p.month}: ₦${netPay.toLocaleString()}`);
  }

  console.log("\nSeed complete!");
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
