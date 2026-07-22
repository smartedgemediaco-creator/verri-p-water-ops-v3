import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPaymentEntry {
  type: "cash" | "transfer";
  amount: number;
  senderName: string;
  addAsCustomer: boolean;
  date: Date;
  notes: string;
}

export interface ICommissionedStaffRecord extends Document {
  staffId: Types.ObjectId;
  date: Date;
  stockLoaded: number;
  stockReturned: number;
  dealPrice: number;
  expectedAmount: number;
  payments: IPaymentEntry[];
  totalPaid: number;
  totalOwed: number;
  notes: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentEntrySchema = new Schema<IPaymentEntry>(
  {
    type: { type: String, enum: ["cash", "transfer"], required: true },
    amount: { type: Number, required: true, min: 0 },
    senderName: { type: String, default: "" },
    addAsCustomer: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
  },
  { _id: true }
);

const CommissionedStaffRecordSchema = new Schema<ICommissionedStaffRecord>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "CommissionedStaff", required: true },
    date: { type: Date, required: true },
    stockLoaded: { type: Number, required: true, min: 0 },
    stockReturned: { type: Number, default: 0, min: 0 },
    dealPrice: { type: Number, required: true, min: 0 },
    expectedAmount: { type: Number, required: true, min: 0 },
    payments: { type: [PaymentEntrySchema], default: [] },
    totalPaid: { type: Number, default: 0, min: 0 },
    totalOwed: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CommissionedStaffRecordSchema.index({ staffId: 1, date: -1 });
CommissionedStaffRecordSchema.index({ date: 1 });
CommissionedStaffRecordSchema.index({ staffId: 1, totalOwed: 1 });

export const CommissionedStaffRecord =
  mongoose.models.CommissionedStaffRecord ?? mongoose.model<ICommissionedStaffRecord>("CommissionedStaffRecord", CommissionedStaffRecordSchema);
