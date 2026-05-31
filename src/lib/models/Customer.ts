import mongoose, { Schema, Document } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  phone: string;
  email: string;
  address: string;
  coordinates: { lat: number; lng: number };
  placeId: string;
  businessName: string;
  customerType: "regular" | "wholesale" | "retailer" | "distributor";
  creditLimit: number;
  outstandingBalance: number;
  isActive: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    coordinates: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    placeId: { type: String, default: "" },
    businessName: { type: String, default: "" },
    customerType: {
      type: String,
      enum: ["regular", "wholesale", "retailer", "distributor"],
      default: "regular",
    },
    creditLimit: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Customer =
  mongoose.models.Customer ?? mongoose.model<ICustomer>("Customer", CustomerSchema);
