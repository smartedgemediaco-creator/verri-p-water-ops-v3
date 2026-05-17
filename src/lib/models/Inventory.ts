import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInventory extends Document {
  locationType: "factory" | "depot" | "truck";
  locationId: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    locationType: { type: String, enum: ["factory", "depot", "truck"], required: true },
    locationId: { type: Schema.Types.ObjectId, required: true, refPath: "locationType" },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

InventorySchema.index({ locationType: 1, locationId: 1, productId: 1 }, { unique: true });

export const Inventory =
  mongoose.models.Inventory ?? mongoose.model<IInventory>("Inventory", InventorySchema);
