import mongoose, { Schema, Document, Types } from "mongoose";

export interface IStock extends Document {
  locationType: "factory" | "depot" | "truck";
  locationId: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const StockSchema = new Schema<IStock>(
  {
    locationType: { type: String, enum: ["factory", "depot", "truck"], required: true },
    locationId: { type: Schema.Types.ObjectId, required: true, refPath: "locationType" },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

StockSchema.index({ locationType: 1, locationId: 1, productId: 1 }, { unique: true });

export const Stock =
  mongoose.models.Stock ?? mongoose.model<IStock>("Stock", StockSchema);
