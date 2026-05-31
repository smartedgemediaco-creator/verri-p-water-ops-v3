import mongoose, { Schema, Document } from "mongoose";

export interface IStaff extends Document {
  name: string;
  phone: string;
  email: string;
  salary: number;
  employmentType: "full-time" | "part-time" | "contract";
  startDate: Date;
  isActive: boolean;
  emergencyContact: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    name: { type: String, required: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    salary: { type: Number, default: 0 },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "contract"],
      default: "full-time",
    },
    startDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    emergencyContact: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Staff =
  mongoose.models.Staff ?? mongoose.model<IStaff>("Staff", StaffSchema);
