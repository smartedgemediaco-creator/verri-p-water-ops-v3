import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPosDeviceAssignment extends Document {
  posDeviceId: Types.ObjectId;
  locationType: "factory" | "depot";
  locationId: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PosDeviceAssignmentSchema = new Schema<IPosDeviceAssignment>(
  {
    posDeviceId: { type: Schema.Types.ObjectId, ref: "PosDevice", required: true },
    locationType: { type: String, enum: ["factory", "depot"], required: true },
    locationId: { type: Schema.Types.ObjectId, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PosDeviceAssignmentSchema.index({ posDeviceId: 1, isActive: 1 });

export const PosDeviceAssignment =
  mongoose.models.PosDeviceAssignment ?? mongoose.model<IPosDeviceAssignment>("PosDeviceAssignment", PosDeviceAssignmentSchema);
