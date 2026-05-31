import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPaymentReceipt extends Document {
  receiptNumber: string;
  invoiceId?: Types.ObjectId;
  saleId?: Types.ObjectId;
  customerId: Types.ObjectId;
  amount: number;
  paymentMethod: "cash" | "pos" | "transfer" | "cheque";
  reference?: string;
  receivedDate: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentReceiptSchema = new Schema<IPaymentReceipt>(
  {
    receiptNumber: { type: String, required: true, unique: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale" },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "pos", "transfer", "cheque"],
      required: true,
    },
    reference: { type: String, default: "" },
    receivedDate: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

PaymentReceiptSchema.index({ customerId: 1, receivedDate: -1 });
PaymentReceiptSchema.index({ invoiceId: 1 });

export const PaymentReceipt =
  mongoose.models.PaymentReceipt ?? mongoose.model<IPaymentReceipt>("PaymentReceipt", PaymentReceiptSchema);
