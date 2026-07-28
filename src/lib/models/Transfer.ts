import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITransfer extends Document {
  fromType: "factory" | "depot" | "truck";
  fromId: Types.ObjectId;
  toType: "factory" | "depot" | "truck";
  toId: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  truckId: Types.ObjectId;
  status: "pending" | "in-transit" | "delivered" | "cancelled";
  date: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransferSchema = new Schema<ITransfer>(
  {
    fromType: { type: String, enum: ["factory", "depot", "truck"], required: true },
    fromId: { type: Schema.Types.ObjectId, required: true },
    toType: { type: String, enum: ["factory", "depot", "truck"], required: true },
    toId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 0 },
    truckId: { type: Schema.Types.ObjectId, ref: "Truck", required: true },
    status: {
      type: String,
      enum: ["pending", "in-transit", "delivered", "cancelled"],
      default: "pending",
    },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Transfer =
  mongoose.models.Transfer ?? mongoose.model<ITransfer>("Transfer", TransferSchema);
