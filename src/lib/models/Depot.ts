import mongoose, { Schema, Document } from "mongoose";

export interface IDepot extends Document {
  name: string;
  location: string;
  coordinates: { lat: number; lng: number };
  placeId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepotSchema = new Schema<IDepot>(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    coordinates: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    placeId: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Depot =
  mongoose.models.Depot ?? mongoose.model<IDepot>("Depot", DepotSchema);
