import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBOMItem {
  rawMaterialId: Types.ObjectId;
  quantity: number;
  unit: string;
}

export interface IBillOfMaterials extends Document {
  productId: Types.ObjectId;
  items: IBOMItem[];
  outputQuantity: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const BOMItemSchema = new Schema<IBOMItem>(
  {
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: "kg" },
  },
  { _id: false }
);

const BillOfMaterialsSchema = new Schema<IBillOfMaterials>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, unique: true },
    items: { type: [BOMItemSchema], default: [] },
    outputQuantity: { type: Number, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const BillOfMaterials =
  mongoose.models.BillOfMaterials ?? mongoose.model<IBillOfMaterials>("BillOfMaterials", BillOfMaterialsSchema);
