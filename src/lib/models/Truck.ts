import mongoose, { Schema, Document } from "mongoose";

export interface ITruck extends Document {
  name: string;
  plateNumber: string;
  chassisNumber?: string;
  engineNumber?: string;
  capacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TruckSchema = new Schema<ITruck>(
  {
    name: { type: String, default: "" },
    plateNumber: { type: String, required: true, unique: true },
    chassisNumber: { type: String, default: "" },
    engineNumber: { type: String, default: "" },
    capacity: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Truck =
  mongoose.models.Truck ?? mongoose.model<ITruck>("Truck", TruckSchema);
