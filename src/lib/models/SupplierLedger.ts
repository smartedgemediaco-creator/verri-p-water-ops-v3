import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISupplierLedger extends Document {
  supplierId: Types.ObjectId;
  date: Date;
  type: "order" | "payment-sent" | "payment-received" | "adjustment" | "return" | "credit-note";
  description: string;
  orderId?: Types.ObjectId;
  batchId?: Types.ObjectId;
  debit: number;
  credit: number;
  amount: number;
  paymentMethod?: "cash" | "transfer" | "pos" | "cheque" | "other";
  reference: string;
  runningBalance: number;
  notes: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierLedgerSchema = new Schema<ISupplierLedger>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    date: { type: Date, default: Date.now, required: true },
    type: {
      type: String,
      enum: ["order", "payment-sent", "payment-received", "adjustment", "return", "credit-note"],
      required: true,
    },
    description: { type: String, default: "" },
    orderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", default: null },
    batchId: { type: Schema.Types.ObjectId, ref: "RawMaterialBatch", default: null },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    amount: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "transfer", "pos", "cheque", "other"],
      default: null,
    },
    reference: { type: String, default: "" },
    runningBalance: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

SupplierLedgerSchema.index({ supplierId: 1, date: -1 });

export const SupplierLedger =
  mongoose.models.SupplierLedger ??
  mongoose.model<ISupplierLedger>("SupplierLedger", SupplierLedgerSchema);
