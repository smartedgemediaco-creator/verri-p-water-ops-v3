import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISupplierContract extends Document {
  supplierId: Types.ObjectId;
  contractStart?: Date;
  contractEnd?: Date;
  paymentTerms: string;
  leadTimeDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierContractSchema = new Schema<ISupplierContract>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, unique: true },
    contractStart: { type: Date },
    contractEnd: { type: Date },
    paymentTerms: { type: String, default: "net-30" },
    leadTimeDays: { type: Number, default: 7 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const SupplierContract =
  mongoose.models.SupplierContract ?? mongoose.model<ISupplierContract>("SupplierContract", SupplierContractSchema);
