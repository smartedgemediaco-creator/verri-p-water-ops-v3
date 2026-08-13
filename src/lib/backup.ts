import mongoose from "mongoose";
import connectDB from "@/lib/db";

export interface BackupSummary {
  filename: string;
  generatedAt: string;
  sizeBytes: number;
  recordCount: number;
  collections: { name: string; count: number }[];
}

export interface BackupResult {
  json: string;
  summary: BackupSummary;
}

export async function generateBackup(): Promise<BackupResult> {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection");

  const collections = await db.listCollections().toArray();
  const dump: Record<string, unknown[]> = {};
  const summary: { name: string; count: number }[] = [];
  let recordCount = 0;

  for (const coll of collections) {
    if (coll.type !== "collection") continue;
    const docs = await db.collection(coll.name).find({}).toArray();
    const serialized = docs.map((d) => {
      const o = { ...d } as Record<string, unknown>;
      const id = o._id as { toString?: () => string } | null;
      o._id = id?.toString ? id.toString() : (o._id ?? null);
      return o;
    });
    dump[coll.name] = serialized;
    summary.push({ name: coll.name, count: serialized.length });
    recordCount += serialized.length;
  }

  const generatedAt = new Date().toISOString();
  const filename = `verrip-backup-${generatedAt.slice(0, 10)}.json`;
  const json = JSON.stringify({ generatedAt, version: 3, collections: dump });
  const sizeBytes = Buffer.byteLength(json, "utf8");

  return {
    json,
    summary: { filename, generatedAt, sizeBytes, recordCount, collections: summary },
  };
}
