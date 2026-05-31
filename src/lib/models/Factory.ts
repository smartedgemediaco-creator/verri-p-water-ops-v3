import mongoose, { Schema, Document } from "mongoose";

export interface IFactory extends Document {
  name: string;
  location: string;
  coordinates: { lat: number; lng: number };
  placeId: string;
  capacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FactorySchema = new Schema<IFactory>(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    coordinates: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    placeId: { type: String, default: "" },
    capacity: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Factory =
  mongoose.models.Factory ?? mongoose.model<IFactory>("Factory", FactorySchema);
