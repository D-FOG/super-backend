import { model, Schema, type InferSchemaType } from "mongoose";

const clusterCenterSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    leaderContact: { type: String, trim: true },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  { timestamps: true }
);

export type ClusterCenterDocument = InferSchemaType<typeof clusterCenterSchema>;
export const ClusterCenter = model<ClusterCenterDocument>("ClusterCenter", clusterCenterSchema);
