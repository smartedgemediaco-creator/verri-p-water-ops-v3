import mongoose, { Schema, Document, Types } from "mongoose";

export interface IStaffAssignment extends Document {
  staffId: Types.ObjectId;
  locationType: "factory" | "depot" | "truck";
  locationId: Types.ObjectId;
  role: "manager" | "supervisor" | "operator" | "driver" | "loader" | "security" | "cleaner" | "other";
  department: "production" | "logistics" | "sales" | "administration" | "maintenance";
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StaffAssignmentSchema = new Schema<IStaffAssignment>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    locationType: { type: String, enum: ["factory", "depot", "truck"], required: true },
    locationId: { type: Schema.Types.ObjectId, required: true },
    role: {
      type: String,
      enum: ["manager", "supervisor", "operator", "driver", "loader", "security", "cleaner", "other"],
      default: "operator",
    },
    department: {
      type: String,
      enum: ["production", "logistics", "sales", "administration", "maintenance"],
      default: "production",
    },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
  },
  { timestamps: true }
);

StaffAssignmentSchema.index({ staffId: 1, isActive: 1 });
StaffAssignmentSchema.index({ locationType: 1, locationId: 1 });

export const StaffAssignment =
  mongoose.models.StaffAssignment ?? mongoose.model<IStaffAssignment>("StaffAssignment", StaffAssignmentSchema);
