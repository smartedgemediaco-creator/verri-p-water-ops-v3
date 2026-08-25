import mongoose, { Schema, Document } from "mongoose";

export interface IDashboardReset extends Document {
  key: string;
  resetAt: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DashboardResetSchema = new Schema<IDashboardReset>(
  {
    key: { type: String, required: true, unique: true },
    resetAt: { type: Date, required: true },
    note: { type: String },
  },
  { timestamps: true }
);

export const DashboardReset =
  mongoose.models.DashboardReset ?? mongoose.model<IDashboardReset>("DashboardReset", DashboardResetSchema);
