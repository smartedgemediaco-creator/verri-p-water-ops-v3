import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICustomFieldDef {
  key: string;
  label: string;
  formula: string;
  format: "number" | "currency" | "percentage" | "text";
}

export interface IRawMaterial extends Document {
  name: string;
  unit: string;
  secondaryUnit: string;
  units: string[];
  category: "chemical" | "packaging" | "filter" | "label" | "other";
  currentStock: number;
  minimumStock: number;
  unitCost: number;
  supplierId: Types.ObjectId | null;
  notes: string;
  customFields: ICustomFieldDef[];
  createdAt: Date;
  updatedAt: Date;
}

const CustomFieldSchema = new Schema<ICustomFieldDef>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    formula: { type: String, required: true },
    format: {
      type: String,
      enum: ["number", "currency", "percentage", "text"],
      default: "number",
    },
  },
  { _id: false }
);

const RawMaterialSchema = new Schema<IRawMaterial>(
  {
    name: { type: String, required: true },
    unit: { type: String, required: true, default: "kg" },
    secondaryUnit: { type: String, default: "" },
    units: { type: [String], default: [] },
    category: {
      type: String,
      default: "other",
    },
    currentStock: { type: Number, default: 0 },
    minimumStock: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", default: null },
    notes: { type: String, default: "" },
    customFields: { type: [CustomFieldSchema], default: [] },
  },
  { timestamps: true }
);

export const RawMaterial =
  mongoose.models.RawMaterial ?? mongoose.model<IRawMaterial>("RawMaterial", RawMaterialSchema);
