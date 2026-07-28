import mongoose, { Schema, Document, Types } from "mongoose";

export interface IGRNItem {
  rawMaterialId?: Types.ObjectId;
  itemName?: string;
  quantityReceived: number;
  quantityOrdered: number;
  condition: "good" | "damaged" | "partial";
}

export interface IGoodsReceivedNote extends Document {
  purchaseOrderId: Types.ObjectId;
  receivedDate: Date;
  items: IGRNItem[];
  receivedBy: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const GRNItemSchema = new Schema<IGRNItem>(
  {
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial" },
    itemName: { type: String, default: "" },
    quantityReceived: { type: Number, required: true, min: 0 },
    quantityOrdered: { type: Number, required: true, min: 0 },
    condition: {
      type: String,
      enum: ["good", "damaged", "partial"],
      default: "good",
    },
  },
  { _id: false }
);

const GoodsReceivedNoteSchema = new Schema<IGoodsReceivedNote>(
  {
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
    receivedDate: { type: Date, default: Date.now },
    items: { type: [GRNItemSchema], default: [] },
    receivedBy: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const GoodsReceivedNote =
  mongoose.models.GoodsReceivedNote ?? mongoose.model<IGoodsReceivedNote>("GoodsReceivedNote", GoodsReceivedNoteSchema);
