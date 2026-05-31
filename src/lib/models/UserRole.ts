import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUserRole extends Document {
  userId: Types.ObjectId;
  role: "admin" | "factory-manager" | "depot-manager" | "driver";
  scopeType?: "factory" | "depot" | "truck";
  scopeId?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserRoleSchema = new Schema<IUserRole>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["admin", "factory-manager", "depot-manager", "driver"],
      required: true,
    },
    scopeType: { type: String, enum: ["factory", "depot", "truck"] },
    scopeId: { type: Schema.Types.ObjectId },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserRoleSchema.index({ userId: 1, isActive: 1 });

export const UserRole =
  mongoose.models.UserRole ?? mongoose.model<IUserRole>("UserRole", UserRoleSchema);
