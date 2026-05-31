import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInvoiceItem {
  productId: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  saleId?: Types.ObjectId;
  customerId: Types.ObjectId;
  items: IInvoiceItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  amountPaid: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  dueDate: Date;
  issuedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale" },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    items: { type: [InvoiceItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "cancelled"],
      default: "draft",
    },
    dueDate: { type: Date, required: true },
    issuedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

InvoiceSchema.index({ customerId: 1, status: 1 });
InvoiceSchema.index({ dueDate: 1, status: 1 });

export const Invoice =
  mongoose.models.Invoice ?? mongoose.model<IInvoice>("Invoice", InvoiceSchema);
