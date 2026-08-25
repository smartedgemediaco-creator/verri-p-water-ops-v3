import connectDB from "@/lib/db";
import { DashboardReset } from "@/lib/models";

async function main() {
  await connectDB();
  const resetAt = new Date();
  await DashboardReset.findOneAndUpdate(
    { key: "stats" },
    { key: "stats", resetAt, note: "Reset Produced/Sold/Pending counters to zero (history preserved)" },
    { upsert: true }
  );
  console.log(`Dashboard stats reset baseline set to ${resetAt.toISOString()}`);
  console.log("Produced, Sold, and Pending Transfer now count only activity on/after this date.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
