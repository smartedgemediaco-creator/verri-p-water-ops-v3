import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDriverAssignment extends Document {
  staffId: Types.ObjectId;
  truckId: Types.ObjectId;
  licenseNumber?: string;
  licenseExpiry?: Date;
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DriverAssignmentSchema = new Schema<IDriverAssignment>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    truckId: { type: Schema.Types.ObjectId, ref: "Truck", required: true },
    licenseNumber: { type: String, default: "" },
    licenseExpiry: { type: Date },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
  },
  { timestamps: true }
);

DriverAssignmentSchema.index({ staffId: 1, isActive: 1 });
DriverAssignmentSchema.index({ truckId: 1, isActive: 1 });

export const DriverAssignment =
  mongoose.models.DriverAssignment ?? mongoose.model<IDriverAssignment>("DriverAssignment", DriverAssignmentSchema);
