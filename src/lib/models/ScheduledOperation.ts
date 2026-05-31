import mongoose, { Schema, Document, Types } from "mongoose";

export interface IScheduledOperation extends Document {
  title: string;
  description: string;
  entityType: "truck" | "factory" | "depot" | "staff" | "customer" | "product" | "raw-material" | "general";
  entityId?: Types.ObjectId;
  frequency: "one-time" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  customDays?: number;
  dueDate: Date;
  leadDays: number;
  autoReschedule: boolean;
  completedAt?: Date;
  isActive: boolean;
  priority: "low" | "medium" | "high" | "critical";
  createdBy: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  tags: string[];
  result?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledOperationSchema = new Schema<IScheduledOperation>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    entityType: {
      type: String,
      required: true,
      enum: ["truck", "factory", "depot", "staff", "customer", "product", "raw-material", "general"],
    },
    entityId: { type: Schema.Types.ObjectId },
    frequency: {
      type: String,
      required: true,
      enum: ["one-time", "daily", "weekly", "monthly", "quarterly", "yearly", "custom"],
    },
    customDays: { type: Number },
    dueDate: { type: Date, required: true },
    leadDays: { type: Number, default: 3 },
    autoReschedule: { type: Boolean, default: false },
    completedAt: { type: Date },
    isActive: { type: Boolean, default: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    tags: { type: [String], default: [] },
    result: { type: String },
  },
  { timestamps: true }
);

export const ScheduledOperation =
  mongoose.models.ScheduledOperation ?? mongoose.model<IScheduledOperation>("ScheduledOperation", ScheduledOperationSchema);
