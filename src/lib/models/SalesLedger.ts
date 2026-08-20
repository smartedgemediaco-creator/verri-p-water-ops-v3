import mongoose, { Schema, Document } from "mongoose";

export interface ISalesLedger extends Document {
  date: string;
  locationType: "factory" | "depot";
  locationId: string;
  stockLoaded: number;
  returnedStock: number;
  cashDelivered: number;
  transferBy: string;
  amountTransferred: number;
  debtors: { name: string; amount: number; settlements?: { amount: number; date?: string; note?: string }[] }[];
  debts: number;
  debtStatus: "pending" | "partial" | "paid";
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const SalesLedgerSchema = new Schema<ISalesLedger>(
  {
    date: { type: String, required: true },
    locationType: { type: String, enum: ["factory", "depot"], required: true },
    locationId: { type: String, required: true },
    stockLoaded: { type: Number, default: 0 },
    returnedStock: { type: Number, default: 0 },
    cashDelivered: { type: Number, default: 0 },
    transferBy: { type: String, default: "" },
    amountTransferred: { type: Number, default: 0 },
    debtors: { type: Schema.Types.Mixed, default: [] },
    debts: { type: Number, default: 0 },
    debtStatus: { type: String, enum: ["pending", "partial", "paid"], default: "pending" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

SalesLedgerSchema.index({ date: 1, locationType: 1, locationId: 1 }, { unique: true });

export const SalesLedger =
  mongoose.models.SalesLedger ?? mongoose.model<ISalesLedger>("SalesLedger", SalesLedgerSchema);
