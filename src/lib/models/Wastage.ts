import mongoose, { Schema, Document } from "mongoose";

export interface IWastage extends Document {
  locationType: "factory" | "depot" | "truck";
  locationId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  source: "production" | "transfer" | "sale" | "storage" | "other";
  deductFromStock: boolean;
  recordAsSale: boolean;
  saleUnitPrice: number;
  customerName: string;
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WastageSchema = new Schema<IWastage>(
  {
    locationType: { type: String, enum: ["factory", "depot", "truck"], required: true },
    locationId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    source: { type: String, enum: ["production", "transfer", "sale", "storage", "other"], required: true },
    deductFromStock: { type: Boolean, default: false },
    recordAsSale: { type: Boolean, default: false },
    saleUnitPrice: { type: Number, default: 0 },
    customerName: { type: String, default: "" },
    description: { type: String, default: "" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Wastage =
  mongoose.models.Wastage ?? mongoose.model<IWastage>("Wastage", WastageSchema);
