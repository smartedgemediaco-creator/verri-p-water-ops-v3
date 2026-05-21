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
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    locationType: { type: String, enum: ["factory", "depot", "truck"], required: true },
    locationId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
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
  },
  { timestamps: true }
);

export const Sale =
  mongoose.models.Sale ?? mongoose.model<ISale>("Sale", SaleSchema);
