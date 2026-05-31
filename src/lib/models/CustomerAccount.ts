import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICustomerAccount extends Document {
  customerId: Types.ObjectId;
  creditLimit: number;
  outstandingBalance: number;
  priceTier: "regular" | "wholesale" | "retailer" | "distributor";
  paymentTerms: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerAccountSchema = new Schema<ICustomerAccount>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, unique: true },
    creditLimit: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    priceTier: {
      type: String,
      enum: ["regular", "wholesale", "retailer", "distributor"],
      default: "regular",
    },
    paymentTerms: { type: String, default: "cash-on-delivery" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const CustomerAccount =
  mongoose.models.CustomerAccount ?? mongoose.model<ICustomerAccount>("CustomerAccount", CustomerAccountSchema);
