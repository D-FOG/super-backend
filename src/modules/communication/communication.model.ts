import { model, Schema } from "mongoose";

const prayerNetworkSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    schedule: { type: String, required: true, trim: true },
    clusterCenterId: { type: Schema.Types.ObjectId, ref: "ClusterCenter", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

const projectUpdateSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "CommunityProject", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const PrayerNetwork = model("PrayerNetwork", prayerNetworkSchema);
export const ProjectUpdate = model("ProjectUpdate", projectUpdateSchema);
