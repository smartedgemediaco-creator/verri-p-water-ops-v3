import mongoose, { Schema, Document } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  phone: string;
  phone2: string;
  email: string;
  whatsapp: string;
  contactPerson: string;
  address: string;
  coordinates: { lat: number; lng: number };
  placeId: string;
  supplyType: "material" | "equipment" | "transport" | "service" | "other";
  materialProvided: string;
  totalOwedToUs: number;
  totalWeOwe: number;
  netBalance: number;
  isActive: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true },
    phone: { type: String, default: "" },
    phone2: { type: String, default: "" },
    email: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    contactPerson: { type: String, default: "" },
    address: { type: String, default: "" },
    coordinates: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    placeId: { type: String, default: "" },
    supplyType: {
      type: String,
      enum: ["material", "equipment", "transport", "service", "other"],
      default: "material",
    },
    materialProvided: { type: String, default: "" },
    totalOwedToUs: { type: Number, default: 0 },
    totalWeOwe: { type: Number, default: 0 },
    netBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Supplier =
  mongoose.models.Supplier ?? mongoose.model<ISupplier>("Supplier", SupplierSchema);
