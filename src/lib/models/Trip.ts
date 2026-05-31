import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITrip extends Document {
  truckId: Types.ObjectId;
  driverId: Types.ObjectId;
  routeId?: Types.ObjectId;
  departureDate: Date;
  returnDate?: Date;
  status: "scheduled" | "in-transit" | "completed" | "cancelled";
  startingMileage: number;
  endingMileage?: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema = new Schema<ITrip>(
  {
    truckId: { type: Schema.Types.ObjectId, ref: "Truck", required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    routeId: { type: Schema.Types.ObjectId, ref: "DeliveryRoute" },
    departureDate: { type: Date, required: true },
    returnDate: { type: Date },
    status: {
      type: String,
      enum: ["scheduled", "in-transit", "completed", "cancelled"],
      default: "scheduled",
    },
    startingMileage: { type: Number, default: 0 },
    endingMileage: { type: Number },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

TripSchema.index({ truckId: 1, status: 1 });
TripSchema.index({ driverId: 1, departureDate: -1 });

export const Trip =
  mongoose.models.Trip ?? mongoose.model<ITrip>("Trip", TripSchema);
