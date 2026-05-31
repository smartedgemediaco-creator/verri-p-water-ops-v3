import mongoose, { Schema, Document } from "mongoose";

export interface IScheduledReport extends Document {
  email: string;
  frequency: "weekly" | "monthly" | "yearly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  month?: number;
  scopeType?: "factory" | "depot" | "truck";
  scopeId?: string;
  isActive: boolean;
  lastSentAt?: Date;
  nextScheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledReportSchema = new Schema<IScheduledReport>(
  {
    email: { type: String, required: true },
    frequency: {
      type: String,
      enum: ["weekly", "monthly", "yearly"],
      required: true,
    },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    dayOfMonth: { type: Number, min: 1, max: 31 },
    month: { type: Number, min: 1, max: 12 },
    scopeType: { type: String, enum: ["factory", "depot", "truck"] },
    scopeId: { type: String },
    isActive: { type: Boolean, default: true },
    lastSentAt: { type: Date },
    nextScheduledAt: { type: Date },
  },
  { timestamps: true }
);

ScheduledReportSchema.index({ isActive: 1, nextScheduledAt: 1 });

export const ScheduledReport =
  mongoose.models.ScheduledReport ?? mongoose.model<IScheduledReport>("ScheduledReport", ScheduledReportSchema);
