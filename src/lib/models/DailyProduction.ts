import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDailyProduction extends Document {
  staffId: Types.ObjectId;
  date: Date;
  productId: Types.ObjectId;
  bagsProduced: number;
  rate: number;
  totalEarned: number;
  notes: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DailyProductionSchema = new Schema<IDailyProduction>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    date: { type: Date, required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    bagsProduced: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    totalEarned: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

DailyProductionSchema.index({ staffId: 1, date: -1 });
DailyProductionSchema.index({ date: 1 });
DailyProductionSchema.index({ staffId: 1, date: 1, productId: 1 });

export const DailyProduction =
  mongoose.models.DailyProduction ?? mongoose.model<IDailyProduction>("DailyProduction", DailyProductionSchema);
