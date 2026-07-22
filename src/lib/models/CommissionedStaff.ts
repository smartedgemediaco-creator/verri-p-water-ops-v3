import mongoose, { Schema, Document } from "mongoose";

export interface ICommissionedStaff extends Document {
  name: string;
  phone: string;
  email: string;
  dealPrice: number;
  isActive: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommissionedStaffSchema = new Schema<ICommissionedStaff>(
  {
    name: { type: String, required: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    dealPrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

CommissionedStaffSchema.index({ name: 1 });
CommissionedStaffSchema.index({ isActive: 1 });

export const CommissionedStaff =
  mongoose.models.CommissionedStaff ?? mongoose.model<ICommissionedStaff>("CommissionedStaff", CommissionedStaffSchema);
