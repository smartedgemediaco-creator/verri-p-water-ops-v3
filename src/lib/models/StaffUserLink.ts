import mongoose, { Schema, Document, Types } from "mongoose";

export interface IStaffUserLink extends Document {
  staffId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StaffUserLinkSchema = new Schema<IStaffUserLink>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  },
  { timestamps: true }
);



export const StaffUserLink =
  mongoose.models.StaffUserLink ?? mongoose.model<IStaffUserLink>("StaffUserLink", StaffUserLinkSchema);
