import mongoose, { Schema, Document } from "mongoose";

export interface IDepot extends Document {
  name: string;
  location: string;
  manager: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepotSchema = new Schema<IDepot>(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    manager: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Depot =
  mongoose.models.Depot ?? mongoose.model<IDepot>("Depot", DepotSchema);
