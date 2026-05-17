import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin" | "factory-manager" | "depot-manager" | "driver";
  factoryId?: Types.ObjectId;
  depotId?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "factory-manager", "depot-manager", "driver"],
      default: "admin",
    },
    factoryId: { type: Schema.Types.ObjectId, ref: "Factory" },
    depotId: { type: Schema.Types.ObjectId, ref: "Depot" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
