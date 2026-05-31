import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILeave extends Document {
  staffId: Types.ObjectId;
  leaveType: "annual" | "sick" | "personal" | "maternity" | "other";
  startDate: Date;
  endDate: Date;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema = new Schema<ILeave>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    leaveType: {
      type: String,
      enum: ["annual", "sick", "personal", "maternity", "other"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

LeaveSchema.index({ staffId: 1, status: 1 });
LeaveSchema.index({ startDate: 1, endDate: 1 });

export const Leave =
  mongoose.models.Leave ?? mongoose.model<ILeave>("Leave", LeaveSchema);
