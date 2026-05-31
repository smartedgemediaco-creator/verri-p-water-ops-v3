import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITruckLoad extends Document {
  fromType: "factory" | "depot" | "truck";
  fromId: Types.ObjectId;
  toType: "factory" | "depot" | "truck" | "customer";
  toId?: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  truckId: Types.ObjectId;
  loadedBy?: string;
  loadAmount?: number;
  capacityUsed?: number;
  status: "pending" | "loading" | "in-transit" | "delivered" | "cancelled";
  date: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const TruckLoadSchema = new Schema<ITruckLoad>(
  {
    fromType: { type: String, enum: ["factory", "depot", "truck"], required: true },
    fromId: { type: Schema.Types.ObjectId, required: true },
    toType: { type: String, enum: ["factory", "depot", "truck", "customer"], required: true },
    toId: { type: Schema.Types.ObjectId },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    truckId: { type: Schema.Types.ObjectId, ref: "Truck", required: true },
    loadedBy: { type: String, default: "" },
    loadAmount: { type: Number, default: 0 },
    capacityUsed: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "loading", "in-transit", "delivered", "cancelled"],
      default: "pending",
    },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// In development, force schema recompile on hot reload so enum/field changes take effect
if (process.env.NODE_ENV === "development" && mongoose.models.TruckLoad) {
  delete mongoose.models.TruckLoad;
}
export const TruckLoad =
  mongoose.models.TruckLoad ?? mongoose.model<ITruckLoad>("TruckLoad", TruckLoadSchema);
