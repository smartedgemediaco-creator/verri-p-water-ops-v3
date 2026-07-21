import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPayrollRecord extends Document {
  staffId: Types.ObjectId;
  month: string; // e.g. "2026-04"
  baseSalary: number;
  deductions: {
    absence: number;
    lateness: number;
    halfDay: number;
    debt: number;
    punishment: number;
    other: number;
  };
  bonus: number;
  netPay: number;
  status: "pending" | "paid" | "partial";
  paidAmount: number;
  paidDate?: Date;
  notes: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollRecordSchema = new Schema<IPayrollRecord>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    month: { type: String, required: true }, // "YYYY-MM"
    baseSalary: { type: Number, required: true, min: 0 },
    deductions: {
      absence: { type: Number, default: 0, min: 0 },
      lateness: { type: Number, default: 0, min: 0 },
      halfDay: { type: Number, default: 0, min: 0 },
      debt: { type: Number, default: 0, min: 0 },
      punishment: { type: Number, default: 0, min: 0 },
      other: { type: Number, default: 0, min: 0 },
    },
    bonus: { type: Number, default: 0, min: 0 },
    netPay: { type: Number, required: true },
    status: { type: String, enum: ["pending", "paid", "partial"], default: "pending" },
    paidAmount: { type: Number, default: 0, min: 0 },
    paidDate: { type: Date },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

PayrollRecordSchema.index({ staffId: 1, month: 1 }, { unique: true });
PayrollRecordSchema.index({ month: 1 });
PayrollRecordSchema.index({ status: 1 });

export const PayrollRecord =
  mongoose.models.PayrollRecord ?? mongoose.model<IPayrollRecord>("PayrollRecord", PayrollRecordSchema);
