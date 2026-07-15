const mongoose = require("mongoose");

const MONGODB_URI = "mongodb+srv://verrip_db_user:l3CJNgUug80Y2rNm@water-ops-cluster.18hzrlq.mongodb.net/water-ops-prod?appName=water-ops-cluster";

const days = [
  { date: "2026-07-01", startStock: 1364, bagsProduced: 1080, factorySale: 11, bigTruck: 302, returnedBigTruck: 33, smallTruck1: 200, returnedSmallTruck1: 33, smallTruck2: 393, returnedSmallTruck2: 12, depot: 276, tricycle: 0, shortage: 0, wastage: 4 },
  { date: "2026-07-02", startStock: 1336, bagsProduced: 1600, factorySale: 11, bigTruck: 452, returnedBigTruck: 1, smallTruck1: 160, returnedSmallTruck1: 5, smallTruck2: 590, returnedSmallTruck2: 10, depot: 340, tricycle: 20, shortage: 0, wastage: 12 },
  { date: "2026-07-03", startStock: 1367, bagsProduced: 1200, factorySale: 0, bigTruck: 402, returnedBigTruck: 0, smallTruck1: 432, returnedSmallTruck1: 0, smallTruck2: 460, returnedSmallTruck2: 153, depot: 480, tricycle: 0, shortage: 0, wastage: 1 },
  { date: "2026-07-04", startStock: 945, bagsProduced: 2071, factorySale: 5, bigTruck: 530, returnedBigTruck: 0, smallTruck1: 552, returnedSmallTruck1: 8, smallTruck2: 529, returnedSmallTruck2: 22, depot: 481, tricycle: 0, shortage: 0, wastage: 22 },
  { date: "2026-07-05", startStock: 927, bagsProduced: 0, factorySale: 4, bigTruck: 0, returnedBigTruck: 0, smallTruck1: 121, returnedSmallTruck1: 0, smallTruck2: 0, returnedSmallTruck2: 0, depot: 0, tricycle: 0, shortage: 0, wastage: 0 },
  { date: "2026-07-06", startStock: 802, bagsProduced: 2270, factorySale: 7, bigTruck: 682, returnedBigTruck: 4, smallTruck1: 450, returnedSmallTruck1: 11, smallTruck2: 532, returnedSmallTruck2: 2, depot: 669, tricycle: 0, shortage: 0, wastage: 32 },
  { date: "2026-07-07", startStock: 717, bagsProduced: 1802, factorySale: 5, bigTruck: 400, returnedBigTruck: 6, smallTruck1: 513, returnedSmallTruck1: 10, smallTruck2: 468, returnedSmallTruck2: 4, depot: 248, tricycle: 0, shortage: 0, wastage: 0 },
  { date: "2026-07-08", startStock: 905, bagsProduced: 1410, factorySale: 3, bigTruck: 405, returnedBigTruck: 3, smallTruck1: 467, returnedSmallTruck1: 0, smallTruck2: 0, returnedSmallTruck2: 0, depot: 245, tricycle: 0, shortage: 0, wastage: 5 },
  { date: "2026-07-09", startStock: 1193, bagsProduced: 1200, factorySale: 9, bigTruck: 250, returnedBigTruck: 0, smallTruck1: 665, returnedSmallTruck1: 0, smallTruck2: 0, returnedSmallTruck2: 0, depot: 200, tricycle: 0, shortage: 0, wastage: 0 },
  { date: "2026-07-10", startStock: 1269, bagsProduced: 1200, factorySale: 0, bigTruck: 352, returnedBigTruck: 0, smallTruck1: 0, returnedSmallTruck1: 0, smallTruck2: 704, returnedSmallTruck2: 0, depot: 250, tricycle: 0, shortage: 0, wastage: 8 },
  { date: "2026-07-11", startStock: 1155, bagsProduced: 1400, factorySale: 0, bigTruck: 440, returnedBigTruck: 1, smallTruck1: 814, returnedSmallTruck1: 44, smallTruck2: 0, returnedSmallTruck2: 0, depot: 352, tricycle: 0, shortage: 0, wastage: 9 },
  { date: "2026-07-12", startStock: 985, bagsProduced: 0, factorySale: 17, bigTruck: 0, returnedBigTruck: 0, smallTruck1: 0, returnedSmallTruck1: 0, smallTruck2: 0, returnedSmallTruck2: 0, depot: 100, tricycle: 0, shortage: 0, wastage: 0 },
  { date: "2026-07-13", startStock: 868, bagsProduced: 1700, factorySale: 5, bigTruck: 503, returnedBigTruck: 41, smallTruck1: 358, returnedSmallTruck1: 4, smallTruck2: 239, returnedSmallTruck2: 0, depot: 431, tricycle: 0, shortage: 0, wastage: 4 },
];

function calcTotals(d) {
  const totalSold = (d.factorySale || 0) + (d.bigTruck || 0) + (d.smallTruck1 || 0) + (d.smallTruck2 || 0) + (d.depot || 0) + (d.tricycle || 0);
  const totalReturned = (d.returnedBigTruck || 0) + (d.returnedSmallTruck1 || 0) + (d.returnedSmallTruck2 || 0);
  const endStock = (d.startStock || 0) + (d.bagsProduced || 0) + totalReturned - totalSold - (d.shortage || 0) - (d.wastage || 0);
  return { totalSold, totalReturned, endStock };
}

mongoose.connect(MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  await db.collection("dailystocks").deleteMany({});
  console.log("Cleared existing daily stock records");

  for (const day of days) {
    const totals = calcTotals(day);
    const doc = { ...day, ...totals, createdAt: new Date(), updatedAt: new Date() };
    const r = await db.collection("dailystocks").insertOne(doc);
    console.log(`${day.date}: start=${day.startStock} produced=${day.bagsProduced} sold=${totals.totalSold} returned=${totals.totalReturned} end=${totals.endStock} [${r.insertedId}]`);
  }

  console.log(`\nSeeded ${days.length} daily stock records`);
  await mongoose.disconnect();
}).catch(e => { console.error(e); process.exit(1); });
