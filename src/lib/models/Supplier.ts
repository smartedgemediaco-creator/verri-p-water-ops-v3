import mongoose, { Schema, Document } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  phone: string;
  email: string;
  address: string;
  coordinates: { lat: number; lng: number };
  placeId: string;
  supplyType: "material" | "equipment" | "transport" | "service" | "other";
  materialProvided: string;
  isActive: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
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
    supplyType: {
      type: String,
      enum: ["material", "equipment", "transport", "service", "other"],
      default: "material",
    },
    materialProvided: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Supplier =
  mongoose.models.Supplier ?? mongoose.model<ISupplier>("Supplier", SupplierSchema);
