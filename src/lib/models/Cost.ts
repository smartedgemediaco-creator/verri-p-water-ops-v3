import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICost extends Document {
  category: "production" | "transport" | "maintenance" | "salary" | "utility" | "other";
  amount: number;
  description: string;
  locationType: "factory" | "depot" | "truck";
  locationId: Types.ObjectId;
  staffId?: Types.ObjectId;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CostSchema = new Schema<ICost>(
  {
    category: {
      type: String,
      enum: ["production", "transport", "maintenance", "salary", "utility", "other"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" },
    locationType: { type: String, enum: ["factory", "depot", "truck"], required: true },
    locationId: { type: Schema.Types.ObjectId, required: true },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Cost =
  mongoose.models.Cost ?? mongoose.model<ICost>("Cost", CostSchema);
