import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRawMaterialStockMovement extends Document {
  rawMaterialId: Types.ObjectId;
  type: "purchase" | "consumption" | "adjustment" | "waste" | "return" | "correction";
  quantity: number;
  unit: string;
  unitCost: number;
  reference: string;
  referenceId?: Types.ObjectId;
  notes: string;
  performedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const RawMaterialStockMovementSchema = new Schema<IRawMaterialStockMovement>(
  {
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true, index: true },
    type: {
      type: String,
      enum: ["purchase", "consumption", "adjustment", "waste", "return", "correction"],
      required: true,
    },
    quantity: { type: Number, required: true },
    unit: { type: String, default: "" },
    unitCost: { type: Number, default: 0 },
    reference: { type: String, default: "" },
    referenceId: { type: Schema.Types.ObjectId },
    notes: { type: String, default: "" },
    performedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

RawMaterialStockMovementSchema.index({ rawMaterialId: 1, createdAt: -1 });

export const RawMaterialStockMovement =
  mongoose.models.RawMaterialStockMovement ??
  mongoose.model<IRawMaterialStockMovement>("RawMaterialStockMovement", RawMaterialStockMovementSchema);
