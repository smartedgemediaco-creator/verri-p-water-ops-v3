import mongoose, { Schema, Document, Types } from "mongoose";

export interface IFuelLog extends Document {
  truckId: Types.ObjectId;
  tripId?: Types.ObjectId;
  driverId: Types.ObjectId;
  date: Date;
  liters: number;
  cost: number;
  fuelStation: string;
  mileage: number;
  createdAt: Date;
  updatedAt: Date;
}

const FuelLogSchema = new Schema<IFuelLog>(
  {
    truckId: { type: Schema.Types.ObjectId, ref: "Truck", required: true },
    tripId: { type: Schema.Types.ObjectId, ref: "Trip" },
    driverId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    date: { type: Date, default: Date.now },
    liters: { type: Number, required: true },
    cost: { type: Number, required: true },
    fuelStation: { type: String, default: "" },
    mileage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

FuelLogSchema.index({ truckId: 1, date: -1 });

export const FuelLog =
  mongoose.models.FuelLog ?? mongoose.model<IFuelLog>("FuelLog", FuelLogSchema);
