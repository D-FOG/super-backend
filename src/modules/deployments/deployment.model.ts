import { model, Schema } from "mongoose";

const outreachSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ["Scheduled", "In Progress", "Complete"], default: "Scheduled" },
    clusterCenterId: { type: Schema.Types.ObjectId, ref: "ClusterCenter", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ["Scheduled", "In Progress", "Complete"], default: "Scheduled" },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    clusterCenterId: { type: Schema.Types.ObjectId, ref: "ClusterCenter", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    impactReport: { type: String, trim: true },
    volunteers: [{ type: Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

export const OutreachActivity = model("OutreachActivity", outreachSchema);
export const CommunityProject = model("CommunityProject", projectSchema);
