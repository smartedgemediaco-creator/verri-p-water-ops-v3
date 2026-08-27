import mongoose, { Schema, Document } from "mongoose";

export interface ISalesLedger extends Document {
  date: string;
  locationType: "factory" | "depot" | "truck";
  locationId: string;
  productId: string;
  unitPrice: number;
  amountSold: number;
  stockLoaded: number;
  returnedStock: number;
  leakages: number;
  cashDelivered: number;
  transfers: { name: string; amount: number }[];
  debtors: { name: string; amount: number; bags?: number; settlements?: { amount: number; date?: string; note?: string }[]; bagSettlements?: { amount: number; date?: string; note?: string }[] }[];
  debts: number;
  debtStatus: "pending" | "partial" | "paid";
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const SalesLedgerSchema = new Schema<ISalesLedger>(
  {
    date: { type: String, required: true },
    locationType: { type: String, enum: ["factory", "depot", "truck"], required: true },
    locationId: { type: String, required: true },
    productId: { type: String, default: "" },
    unitPrice: { type: Number, default: 0 },
    amountSold: { type: Number, default: 0 },
    stockLoaded: { type: Number, default: 0 },
    returnedStock: { type: Number, default: 0 },
    leakages: { type: Number, default: 0 },
    cashDelivered: { type: Number, default: 0 },
    transfers: { type: Schema.Types.Mixed, default: [] },
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
