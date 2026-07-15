import mongoose, { Schema, Document } from "mongoose";

export interface IDailyStock extends Document {
  date: string;
  locationType: "factory" | "depot";
  locationId: string;
  startStock: number;
  bagsProduced: number;
  factorySale: number;
  bigTruck: number;
  returnedBigTruck: number;
  smallTruck1: number;
  returnedSmallTruck1: number;
  smallTruck2: number;
  returnedSmallTruck2: number;
  depot: number;
  tricycle: number;
  shortage: number;
  wastage: number;
  leakages: number;
  totalSold: number;
  totalReturned: number;
  endStock: number;
  staffName: string;
  debtors: number;
  debts: number;
  debtStatus: "pending" | "partial" | "paid";
  cashDelivered: number;
  createdAt: Date;
  updatedAt: Date;
}

const DailyStockSchema = new Schema<IDailyStock>(
  {
    date: { type: String, required: true },
    locationType: { type: String, enum: ["factory", "depot"], required: true },
    locationId: { type: String, required: true },
    startStock: { type: Number, default: 0 },
    bagsProduced: { type: Number, default: 0 },
    factorySale: { type: Number, default: 0 },
    bigTruck: { type: Number, default: 0 },
    returnedBigTruck: { type: Number, default: 0 },
    smallTruck1: { type: Number, default: 0 },
    returnedSmallTruck1: { type: Number, default: 0 },
    smallTruck2: { type: Number, default: 0 },
    returnedSmallTruck2: { type: Number, default: 0 },
    depot: { type: Number, default: 0 },
    tricycle: { type: Number, default: 0 },
    shortage: { type: Number, default: 0 },
    wastage: { type: Number, default: 0 },
    leakages: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },
    totalReturned: { type: Number, default: 0 },
    endStock: { type: Number, default: 0 },
    staffName: { type: String, default: "" },
    debtors: { type: Number, default: 0 },
    debts: { type: Number, default: 0 },
    debtStatus: { type: String, enum: ["pending", "partial", "paid"], default: "pending" },
    cashDelivered: { type: Number, default: 0 },
  },
  { timestamps: true }
);

DailyStockSchema.index({ date: 1, locationType: 1, locationId: 1 }, { unique: true });

export const DailyStock =
  mongoose.models.DailyStock ?? mongoose.model<IDailyStock>("DailyStock", DailyStockSchema);
