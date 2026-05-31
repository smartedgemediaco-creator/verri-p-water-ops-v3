import mongoose, { Schema, Document, Types } from "mongoose";

export interface IServiceRecord extends Document {
  truckId: Types.ObjectId;
  serviceType: "routine" | "repair" | "inspection" | "tyre" | "oil" | "other";
  description: string;
  date: Date;
  cost: number;
  mileage: number;
  serviceCenter: string;
  nextServiceDate?: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceRecordSchema = new Schema<IServiceRecord>(
  {
    truckId: { type: Schema.Types.ObjectId, ref: "Truck", required: true },
    serviceType: {
      type: String,
      enum: ["routine", "repair", "inspection", "tyre", "oil", "other"],
      default: "routine",
    },
    description: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    cost: { type: Number, default: 0 },
    mileage: { type: Number, default: 0 },
    serviceCenter: { type: String, default: "" },
    nextServiceDate: { type: Date },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const ServiceRecord =
  mongoose.models.ServiceRecord ?? mongoose.model<IServiceRecord>("ServiceRecord", ServiceRecordSchema);
