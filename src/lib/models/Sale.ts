import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISale extends Document {
  depotId: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  customerName: string;
  date: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    depotId: { type: Schema.Types.ObjectId, ref: "Depot", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    customerName: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Sale =
  mongoose.models.Sale ?? mongoose.model<ISale>("Sale", SaleSchema);
