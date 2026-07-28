import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBatch extends Document {
  batchNumber: string;
  productionId: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  date: Date;
  expiryDate?: Date;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema = new Schema<IBatch>(
  {
    batchNumber: { type: String, required: true, unique: true },
    productionId: { type: Schema.Types.ObjectId, ref: "Production", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

BatchSchema.index({ productId: 1, date: -1 });

export const Batch =
  mongoose.models.Batch ?? mongoose.model<IBatch>("Batch", BatchSchema);
