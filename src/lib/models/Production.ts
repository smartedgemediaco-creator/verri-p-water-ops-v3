import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProduction extends Document {
  factoryId: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProductionSchema = new Schema<IProduction>(
  {
    factoryId: { type: Schema.Types.ObjectId, ref: "Factory", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Production =
  mongoose.models.Production ?? mongoose.model<IProduction>("Production", ProductionSchema);
