import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPurchaseOrderItem {
  rawMaterialId?: Types.ObjectId;
  itemName?: string;
  itemDescription?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  quantityReceived: number;
}

export interface IPaymentEntry {
  amount: number;
  method: "cash" | "transfer" | "pos" | "cheque" | "other";
  date: Date;
  reference: string;
  notes: string;
  recordedBy: string;
}

export interface IPurchaseOrder extends Document {
  supplierId?: Types.ObjectId;
  supplierName?: string;
  orderNumber: string;
  items: IPurchaseOrderItem[];
  status: "draft" | "sent" | "confirmed" | "partially-received" | "received" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
  amountPaid: number;
  payments: IPaymentEntry[];
  deliveryStatus: "pending" | "in-transit" | "delivered" | "partial";
  orderDate: Date;
  expectedDate?: Date;
  receivedDate?: Date;
  totalAmount: number;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentEntrySchema = new Schema<IPaymentEntry>(
  {
    amount: { type: Number, required: true },
    method: { type: String, enum: ["cash", "transfer", "pos", "cheque", "other"], default: "transfer" },
    date: { type: Date, default: Date.now },
    reference: { type: String, default: "" },
    notes: { type: String, default: "" },
    recordedBy: { type: String, default: "" },
  },
  { _id: false }
);

const PurchaseOrderItemSchema = new Schema<IPurchaseOrderItem>(
  {
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial" },
    itemName: { type: String, default: "" },
    itemDescription: { type: String, default: "" },
    quantity: { type: Number, required: true },
    unit: { type: String, default: "" },
    unitPrice: { type: Number, required: true },
    quantityReceived: { type: Number, default: 0 },
  },
  { _id: false }
);

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    supplierName: { type: String, default: "" },
    orderNumber: { type: String, required: true, unique: true },
    items: { type: [PurchaseOrderItemSchema], default: [] },
    status: {
      type: String,
      enum: ["draft", "sent", "confirmed", "partially-received", "received", "cancelled"],
      default: "draft",
    },
    paymentStatus: { type: String, enum: ["unpaid", "partial", "paid"], default: "unpaid" },
    amountPaid: { type: Number, default: 0 },
    payments: { type: [PaymentEntrySchema], default: [] },
    deliveryStatus: { type: String, enum: ["pending", "in-transit", "delivered", "partial"], default: "pending" },
    orderDate: { type: Date, default: Date.now },
    expectedDate: { type: Date },
    receivedDate: { type: Date },
    totalAmount: { type: Number, default: 0 },
    contactPhone: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const PurchaseOrder =
  mongoose.models.PurchaseOrder ?? mongoose.model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);
