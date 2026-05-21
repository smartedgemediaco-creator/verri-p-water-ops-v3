import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPosDevice extends Document {
  terminalSerial: string;
  name: string;
  provider: "moniepoint" | "opay" | "palmpay" | "other";
  locationType: "factory" | "depot" | "truck";
  locationId: Types.ObjectId;
  isActive: boolean;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PosDeviceSchema = new Schema<IPosDevice>(
  {
    terminalSerial: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    provider: {
      type: String,
      enum: ["moniepoint", "opay", "palmpay", "other"],
      default: "moniepoint",
    },
    locationType: {
      type: String,
      enum: ["factory", "depot", "truck"],
      required: true,
    },
    locationId: { type: Schema.Types.ObjectId, required: true },
    isActive: { type: Boolean, default: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const PosDevice =
  mongoose.models.PosDevice ?? mongoose.model<IPosDevice>("PosDevice", PosDeviceSchema);
