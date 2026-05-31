import mongoose, { Schema, Document, Types } from "mongoose";

export interface INAFDACRecord extends Document {
  productId: Types.ObjectId;
  registrationNumber: string;
  issueDate: Date;
  expiryDate: Date;
  status: "active" | "expired" | "pending-renewal";
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const NAFDACRecordSchema = new Schema<INAFDACRecord>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    registrationNumber: { type: String, required: true, unique: true },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "expired", "pending-renewal"],
      default: "active",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const NAFDACRecord =
  mongoose.models.NAFDACRecord ?? mongoose.model<INAFDACRecord>("NAFDACRecord", NAFDACRecordSchema);
