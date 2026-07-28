import mongoose, { Schema, Document, Types } from "mongoose";

export type PaymentMethod = "cash" | "pos" | "transfer" | "credit";

export interface ISale extends Document {
  locationType: "factory" | "depot" | "truck";
  locationId: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  customerName: string;
  date: Date;
  notes: string;
  paymentMethod: PaymentMethod;
  posDeviceId?: Types.ObjectId;
  posTransactionRef?: string;
  posAutoCreated?: boolean;
  isPaid: boolean;
  paidAt?: Date;
  paidAmount?: number;
  condition?: "ordinary" | "chilled";
  status: "active" | "cancelled";
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    locationType: { type: String, enum: ["factory", "depot", "truck"], required: true },
    locationId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    customerName: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
    paymentMethod: {
      type: String,
      enum: ["cash", "pos", "transfer", "credit"],
      default: "cash",
    },
    posDeviceId: { type: Schema.Types.ObjectId, ref: "PosDevice" },
    posTransactionRef: { type: String },
    posAutoCreated: { type: Boolean, default: false },
    isPaid: { type: Boolean, default: true },
    paidAt: { type: Date },
    paidAmount: { type: Number },
    condition: { type: String, enum: ["ordinary", "chilled"], default: "ordinary" },
    status: { type: String, enum: ["active", "cancelled"], default: "active" },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
    cancelReason: { type: String, default: "" },
  },
  { timestamps: true }
);

SaleSchema.index({ status: 1 });

export const Sale =
  mongoose.models.Sale ?? mongoose.model<ISale>("Sale", SaleSchema);
