import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAttendance extends Document {
  staffId: Types.ObjectId;
  date: Date;
  clockIn: Date;
  clockOut?: Date;
  status: "present" | "absent" | "late" | "half-day" | "leave";
  lateAmount: number;
  absenceAmount: number;
  halfDayAmount: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    date: { type: Date, required: true },
    clockIn: { type: Date, required: true },
    clockOut: { type: Date },
    status: {
      type: String,
      enum: ["present", "absent", "late", "half-day", "leave"],
      default: "present",
    },
    lateAmount: { type: Number, default: 0 },
    absenceAmount: { type: Number, default: 0 },
    halfDayAmount: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

AttendanceSchema.index({ staffId: 1, date: -1 });
AttendanceSchema.index({ date: 1 });

export const Attendance =
  mongoose.models.Attendance ?? mongoose.model<IAttendance>("Attendance", AttendanceSchema);
