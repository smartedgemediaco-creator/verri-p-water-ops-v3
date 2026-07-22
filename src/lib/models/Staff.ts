import mongoose, { Schema, Document } from "mongoose";

export interface IStaffAddress {
  label: string;
  street: string;
  city: string;
  state: string;
  country: string;
}

export interface IStaffEmergencyContact {
  name: string;
  phone: string;
  relationship: string;
  photo?: string;
}

export interface IStaff extends Document {
  name: string;
  phone: string;
  email: string;
  salary: number;
  dailyRate: number;
  employmentType: "full-time" | "part-time" | "contract" | "daily";
  startDate: Date;
  isActive: boolean;
  emergencyContact: string;
  notes: string;
  avatar?: string;
  addresses: IStaffAddress[];
  emergencyContacts: IStaffEmergencyContact[];
  createdAt: Date;
  updatedAt: Date;
}

const StaffAddressSchema = new Schema<IStaffAddress>(
  {
    label: { type: String, default: "Home" },
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "Nigeria" },
  },
  { _id: false }
);

const StaffEmergencyContactSchema = new Schema<IStaffEmergencyContact>(
  {
    name: { type: String, required: true },
    phone: { type: String, default: "" },
    relationship: { type: String, default: "" },
    photo: { type: String, default: "" },
  },
  { _id: false }
);

const StaffSchema = new Schema<IStaff>(
  {
    name: { type: String, required: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    salary: { type: Number, default: 0 },
    dailyRate: { type: Number, default: 0 },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "daily"],
      default: "full-time",
    },
    startDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    emergencyContact: { type: String, default: "" },
    notes: { type: String, default: "" },
    avatar: { type: String, default: "" },
    addresses: { type: [StaffAddressSchema], default: [] },
    emergencyContacts: { type: [StaffEmergencyContactSchema], default: [] },
  },
  { timestamps: true }
);

export const Staff =
  mongoose.models.Staff ?? mongoose.model<IStaff>("Staff", StaffSchema);
