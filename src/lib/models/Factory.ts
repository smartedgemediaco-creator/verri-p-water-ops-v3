import mongoose, { Schema, Document } from "mongoose";

export interface IFactory extends Document {
  name: string;
  location: string;
  capacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FactorySchema = new Schema<IFactory>(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    capacity: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Factory =
  mongoose.models.Factory ?? mongoose.model<IFactory>("Factory", FactorySchema);
