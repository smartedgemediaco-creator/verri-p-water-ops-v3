import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRouteWaypoint {
  name: string;
  address: string;
  order: number;
}

export interface IDeliveryRoute extends Document {
  name: string;
  description: string;
  depotId: Types.ObjectId;
  waypoints: IRouteWaypoint[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RouteWaypointSchema = new Schema<IRouteWaypoint>(
  {
    name: { type: String, required: true },
    address: { type: String, default: "" },
    order: { type: Number, required: true },
  },
  { _id: false }
);

const DeliveryRouteSchema = new Schema<IDeliveryRoute>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    depotId: { type: Schema.Types.ObjectId, ref: "Depot", required: true },
    waypoints: { type: [RouteWaypointSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const DeliveryRoute =
  mongoose.models.DeliveryRoute ?? mongoose.model<IDeliveryRoute>("DeliveryRoute", DeliveryRouteSchema);
