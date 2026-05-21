import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPaymentTransaction extends Document {
  posDeviceId?: Types.ObjectId;
  terminalSerial: string;
  transactionRef: string;
  merchantReference?: string;
  amount: number;
  paymentMethod: "CARD_PURCHASE" | "POS_TRANSFER" | "CARD_TRANSFER" | "UNKNOWN";
  responseCode: string;
  maskedPan?: string;
  cardScheme?: string;
  acquirer?: string;
  transactionDate: Date;
  saleId?: Types.ObjectId;
  status: "matched" | "unmatched" | "ignored";
  rawPayload?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    posDeviceId: { type: Schema.Types.ObjectId, ref: "PosDevice" },
    terminalSerial: { type: String, required: true },
    transactionRef: { type: String, required: true, unique: true },
    merchantReference: { type: String },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["CARD_PURCHASE", "POS_TRANSFER", "CARD_TRANSFER", "UNKNOWN"],
      default: "UNKNOWN",
    },
    responseCode: { type: String, required: true },
    maskedPan: { type: String },
    cardScheme: { type: String },
    acquirer: { type: String },
    transactionDate: { type: Date, required: true },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale" },
    status: {
      type: String,
      enum: ["matched", "unmatched", "ignored"],
      default: "unmatched",
    },
    rawPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const PaymentTransaction =
  mongoose.models.PaymentTransaction ??
  mongoose.model<IPaymentTransaction>("PaymentTransaction", PaymentTransactionSchema);
