import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRawMaterialBatch extends Document {
  rawMaterialId: Types.ObjectId;
  supplierId?: Types.ObjectId;
  purchaseOrderId?: Types.ObjectId;
  batchNumber: string;
  locationType: "factory" | "depot";
  locationId: Types.ObjectId;
  orderedQuantity: number;
  receivedQuantity: number;
  unit: string;
  itemCount: number;
  itemUnit: string;
  unitPrice: number;
  totalCost: number;
  status: "pending" | "partially-received" | "received" | "consumed" | "expired";
  receivedDate?: Date;
  expiryDate?: Date;
  availableQuantity: number;
  consumedQuantity: number;
  qualityNotes: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RawMaterialBatchSchema = new Schema<IRawMaterialBatch>(
  {
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", default: null },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", default: null },
    batchNumber: { type: String, required: true, unique: true },
    locationType: { type: String, enum: ["factory", "depot"], required: true },
    locationId: { type: Schema.Types.ObjectId, required: true, index: true },
    orderedQuantity: { type: Number, required: true, min: 0 },
    receivedQuantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "kg" },
    itemCount: { type: Number, default: 0, min: 0 },
    itemUnit: { type: String, default: "" },
    unitPrice: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "partially-received", "received", "consumed", "expired"],
      default: "pending",
    },
    receivedDate: { type: Date },
    expiryDate: { type: Date },
    availableQuantity: { type: Number, default: 0, min: 0 },
    consumedQuantity: { type: Number, default: 0, min: 0 },
    qualityNotes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

RawMaterialBatchSchema.index({ rawMaterialId: 1, status: 1 });
RawMaterialBatchSchema.index({ locationType: 1, locationId: 1 });
RawMaterialBatchSchema.index({ supplierId: 1 });
RawMaterialBatchSchema.index({ purchaseOrderId: 1 });

export const RawMaterialBatch =
  mongoose.models.RawMaterialBatch ??
  mongoose.model<IRawMaterialBatch>("RawMaterialBatch", RawMaterialBatchSchema);
