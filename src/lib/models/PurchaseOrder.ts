import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPurchaseOrderItem {
  rawMaterialId: Types.ObjectId;
  quantity: number;
  unitPrice: number;
}

export interface IPurchaseOrder extends Document {
  supplierId: Types.ObjectId;
  orderNumber: string;
  items: IPurchaseOrderItem[];
  status: "draft" | "sent" | "confirmed" | "received" | "cancelled";
  orderDate: Date;
  expectedDate?: Date;
  totalAmount: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderItemSchema = new Schema<IPurchaseOrderItem>(
  {
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
  },
  { _id: false }
);

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    orderNumber: { type: String, required: true, unique: true },
    items: { type: [PurchaseOrderItemSchema], default: [] },
    status: {
      type: String,
      enum: ["draft", "sent", "confirmed", "received", "cancelled"],
      default: "draft",
    },
    orderDate: { type: Date, default: Date.now },
    expectedDate: { type: Date },
    totalAmount: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const PurchaseOrder =
  mongoose.models.PurchaseOrder ?? mongoose.model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);
