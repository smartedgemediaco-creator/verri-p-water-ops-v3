import mongoose, { Schema, Document } from "mongoose";

export interface IDailyStockColumn extends Document {
  key: string;
  label: string;
  type: "sale" | "return" | "custom";
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const DailyStockColumnSchema = new Schema<IDailyStockColumn>(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    type: { type: String, enum: ["sale", "return", "custom"], default: "custom" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const DailyStockColumn =
  mongoose.models.DailyStockColumn ?? mongoose.model<IDailyStockColumn>("DailyStockColumn", DailyStockColumnSchema);
