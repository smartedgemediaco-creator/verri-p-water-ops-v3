import mongoose, { Schema, Document } from "mongoose";

export interface IActivityLog extends Document {
  action: string;
  entity: string;
  entityId: string;
  description: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  domainType?: "factory" | "depot" | "truck";
  domainId?: string;
  productId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
    description: { type: String, required: true },
    userId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    domainType: { type: String, enum: ["factory", "depot", "truck"] },
    domainId: { type: String },
    productId: { type: String },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ entity: 1, createdAt: -1 });
ActivityLogSchema.index({ domainType: 1, domainId: 1, createdAt: -1 });
ActivityLogSchema.index({ productId: 1, createdAt: -1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });

export const ActivityLog =
  mongoose.models.ActivityLog ??
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
