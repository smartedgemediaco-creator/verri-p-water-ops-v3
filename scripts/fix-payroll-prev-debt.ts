import mongoose from "mongoose";

// One-time migration: recompute previousDebt + netPay for every payroll record
// so netPay = baseSalary + bonus − deductions − previous month's outstanding debt.
// Safe to re-run (idempotent) — only updates records whose values changed.

function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return "";
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function totalDeductions(d: any): number {
  return (d?.absence || 0) + (d?.lateness || 0) + (d?.halfDay || 0) + (d?.debt || 0) + (d?.punishment || 0) + (d?.other || 0);
}

function totalSettled(settlements: any[]): number {
  return (settlements || []).reduce((s: number, x: any) => s + (x.amount || 0), 0);
}

async function main() {
  const uri = process.env.MONGODB_URI!;
  await mongoose.connect(uri);
  const coll = mongoose.connection.collection("payrollrecords");

  const months: string[] = (await coll.distinct("month")).sort();
  console.log(`Processing ${months.length} months: ${months.join(", ")}`);

  let updated = 0;
  let checked = 0;
  const prevCache = new Map<string, number>(); // staffId+month -> prevDebt

  for (const month of months) {
    const records = await coll.find({ month }).sort({ createdAt: 1 }).toArray();
    const prevMonth = previousMonth(month);
    const prevRecords = prevMonth
      ? await coll.find({ month: prevMonth }).toArray()
      : [];
    const prevByStaff = new Map(
      prevRecords.map((r) => [String(r.staffId), r])
    );

    for (const r of records) {
      checked++;
      const key = `${r.staffId}|${month}`;
      let prevDebt = prevCache.get(key);
      if (prevDebt === undefined) {
        const prev = prevByStaff.get(String(r.staffId));
        prevDebt = prev ? Math.round(Math.max(0, totalDeductions(prev.deductions) - totalSettled(prev.debtSettlements))) : 0;
        prevCache.set(key, prevDebt);
      }

      const d = r.deductions || {};
      const totalDed = totalDeductions(d);
      const bonus = r.bonus || 0;
      const base = r.baseSalary || 0;
      const netPay = Math.round(base + bonus - totalDed - prevDebt);
      const prevStored = r.previousDebt ?? 0;

      if (r.previousDebt === undefined || prevStored !== prevDebt || (r.netPay ?? 0) !== netPay) {
        await coll.updateOne(
          { _id: r._id },
          { $set: { previousDebt: prevDebt, netPay } }
        );
        updated++;
        const staff = await mongoose.connection
          .collection("staffs")
          .findOne({ _id: r.staffId }, { projection: { name: 1 } });
        console.log(
          `FIX ${staff?.name ?? String(r.staffId)} ${month}: prevDebt ${prevStored} -> ${prevDebt}, netPay ${r.netPay} -> ${netPay}`
        );
      }
    }
  }

  console.log(`\nDone. Checked ${checked} records, updated ${updated}.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
