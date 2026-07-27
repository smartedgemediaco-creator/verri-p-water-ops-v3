import mongoose, { Schema, Document, Types } from "mongoose";

export interface IConsumptionAllocation {
  batchId: Types.ObjectId;
  quantity: number;
  unitCost: number;
  itemCount: number;
}

export interface IRawMaterialConsumption extends Document {
  rawMaterialId: Types.ObjectId;
  locationType: "factory" | "depot";
  locationId: Types.ObjectId;
  date: Date;
  purpose: "production" | "wastage" | "adjustment" | "transfer" | "other";
  referenceId?: Types.ObjectId;
  referenceModel?: string;
  allocations: IConsumptionAllocation[];
  totalQuantity: number;
  totalCost: number;
  notes: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConsumptionAllocationSchema = new Schema<IConsumptionAllocation>(
  {
    batchId: { type: Schema.Types.ObjectId, ref: "RawMaterialBatch", required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    itemCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const RawMaterialConsumptionSchema = new Schema<IRawMaterialConsumption>(
  {
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true, index: true },
    locationType: { type: String, enum: ["factory", "depot"], required: true },
    locationId: { type: Schema.Types.ObjectId, required: true },
    date: { type: Date, default: Date.now, required: true },
    purpose: {
      type: String,
      enum: ["production", "wastage", "adjustment", "transfer", "other"],
      default: "production",
    },
    referenceId: { type: Schema.Types.ObjectId, default: null },
    referenceModel: { type: String, default: "" },
    allocations: { type: [ConsumptionAllocationSchema], default: [] },
    totalQuantity: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

RawMaterialConsumptionSchema.index({ rawMaterialId: 1, date: -1 });
RawMaterialConsumptionSchema.index({ locationType: 1, locationId: 1 });
RawMaterialConsumptionSchema.index({ purpose: 1 });

export const RawMaterialConsumption =
  mongoose.models.RawMaterialConsumption ??
  mongoose.model<IRawMaterialConsumption>("RawMaterialConsumption", RawMaterialConsumptionSchema);
