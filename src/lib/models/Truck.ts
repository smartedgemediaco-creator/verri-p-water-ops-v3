import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITruck extends Document {
  plateNumber: string;
  driverName: string;
  capacity: number;
  isActive: boolean;
  assignedToType?: "factory" | "depot";
  assignedToId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TruckSchema = new Schema<ITruck>(
  {
    plateNumber: { type: String, required: true, unique: true },
    driverName: { type: String, default: "" },
    capacity: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    assignedToType: { type: String, enum: ["factory", "depot"] },
    assignedToId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

export const Truck =
  mongoose.models.Truck ?? mongoose.model<ITruck>("Truck", TruckSchema);
