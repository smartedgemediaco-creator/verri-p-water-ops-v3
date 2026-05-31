import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAsset extends Document {
  name: string;
  type: "machinery" | "generator" | "vehicle" | "building" | "equipment" | "furniture" | "other";
  serialNumber?: string;
  purchaseDate?: Date;
  purchaseCost: number;
  currentValue: number;
  locationType?: "factory" | "depot";
  locationId?: Types.ObjectId;
  isActive: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["machinery", "generator", "vehicle", "building", "equipment", "furniture", "other"],
      required: true,
    },
    serialNumber: { type: String, default: "" },
    purchaseDate: { type: Date },
    purchaseCost: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },
    locationType: { type: String, enum: ["factory", "depot"] },
    locationId: { type: Schema.Types.ObjectId },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Asset =
  mongoose.models.Asset ?? mongoose.model<IAsset>("Asset", AssetSchema);
