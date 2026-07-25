import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRawMaterial extends Document {
  name: string;
  unit: string;
  stockUnit: string;
  conversionRate: number;
  category: "chemical" | "packaging" | "filter" | "label" | "other";
  currentStock: number;
  minimumStock: number;
  unitCost: number;
  supplierId: Types.ObjectId | null;
  totalReceived: number;
  totalConsumed: number;
  lastReceivedDate?: Date;
  lastConsumedDate?: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const RawMaterialSchema = new Schema<IRawMaterial>(
  {
    name: { type: String, required: true },
    unit: { type: String, required: true, default: "kg" },
    stockUnit: { type: String, default: "" },
    conversionRate: { type: Number, default: 1 },
    category: {
      type: String,
      enum: ["chemical", "packaging", "filter", "label", "other"],
      default: "other",
    },
    currentStock: { type: Number, default: 0 },
    minimumStock: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", default: null },
    totalReceived: { type: Number, default: 0 },
    totalConsumed: { type: Number, default: 0 },
    lastReceivedDate: { type: Date },
    lastConsumedDate: { type: Date },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const RawMaterial =
  mongoose.models.RawMaterial ?? mongoose.model<IRawMaterial>("RawMaterial", RawMaterialSchema);
