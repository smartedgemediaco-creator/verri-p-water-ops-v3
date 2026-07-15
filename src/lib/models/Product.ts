import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  unit: string;
  category: "sachet" | "bottle";
  description: string;
  unitPrice: number;
  chilledPrice?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    unit: { type: String, required: true, default: "bag" },
    category: { type: String, enum: ["sachet", "bottle"], required: true },
    description: { type: String, default: "" },
    unitPrice: { type: Number, min: 0, default: 0 },
    chilledPrice: { type: Number, min: 0 },
  },
  { timestamps: true }
);

export const Product =
  mongoose.models.Product ?? mongoose.model<IProduct>("Product", ProductSchema);
