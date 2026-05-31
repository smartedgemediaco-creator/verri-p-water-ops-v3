import mongoose, { Schema, Document, Types } from "mongoose";

export interface IQCParameter {
  name: string;
  value: number;
  acceptableMin: number;
  acceptableMax: number;
  passed: boolean;
}

export interface IQualityCheck extends Document {
  batchId: Types.ObjectId;
  productId: Types.ObjectId;
  checkedBy: string;
  date: Date;
  parameters: IQCParameter[];
  overallResult: "pass" | "fail" | "conditional";
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const QCParameterSchema = new Schema<IQCParameter>(
  {
    name: { type: String, required: true },
    value: { type: Number, required: true },
    acceptableMin: { type: Number, required: true },
    acceptableMax: { type: Number, required: true },
    passed: { type: Boolean, required: true },
  },
  { _id: false }
);

const QualityCheckSchema = new Schema<IQualityCheck>(
  {
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    checkedBy: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    parameters: { type: [QCParameterSchema], default: [] },
    overallResult: {
      type: String,
      enum: ["pass", "fail", "conditional"],
      required: true,
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

QualityCheckSchema.index({ batchId: 1 });
QualityCheckSchema.index({ productId: 1, date: -1 });

export const QualityCheck =
  mongoose.models.QualityCheck ?? mongoose.model<IQualityCheck>("QualityCheck", QualityCheckSchema);
