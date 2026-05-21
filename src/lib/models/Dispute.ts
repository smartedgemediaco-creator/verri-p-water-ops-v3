import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDispute extends Document {
  entity: string;
  entityId: Types.ObjectId;
  entityLabel: string;
  reason: string;
  description: string;
  status: "pending" | "resolved" | "dismissed";
  resolution?: string;
  createdBy: Types.ObjectId;
  resolvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DisputeSchema = new Schema<IDispute>(
  {
    entity: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    entityLabel: { type: String, default: "" },
    reason: { type: String, required: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
    },
    resolution: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Dispute =
  mongoose.models.Dispute ?? mongoose.model<IDispute>("Dispute", DisputeSchema);
