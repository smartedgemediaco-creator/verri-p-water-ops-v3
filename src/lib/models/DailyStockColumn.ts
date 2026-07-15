import mongoose, { Schema, Document } from "mongoose";

export interface IDailyStockColumn extends Document {
  key: string;
  label: string;
  type: "sale" | "return" | "custom";
  order: number;
  locationType: "factory" | "depot";
  locationId: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyStockColumnSchema = new Schema<IDailyStockColumn>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ["sale", "return", "custom"], default: "custom" },
    order: { type: Number, default: 0 },
    locationType: { type: String, enum: ["factory", "depot"], required: true },
    locationId: { type: String, required: true },
  },
  { timestamps: true }
);

DailyStockColumnSchema.index({ key: 1, locationType: 1, locationId: 1 }, { unique: true });

export const DailyStockColumn =
  mongoose.models.DailyStockColumn ?? mongoose.model<IDailyStockColumn>("DailyStockColumn", DailyStockColumnSchema);
