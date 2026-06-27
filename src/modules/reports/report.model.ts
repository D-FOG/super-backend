import { model, Schema } from "mongoose";

const reportSchema = new Schema(
  {
    type: { type: String, enum: ["Weekly", "Monthly"], required: true },
    clusterCenterId: { type: Schema.Types.ObjectId, ref: "ClusterCenter", required: true },
    summary: { type: String, required: true },
    metrics: { type: Schema.Types.Mixed, default: {} },
    challenges: { type: String },
    needs: { type: String },
    status: { type: String, enum: ["Draft", "Submitted"], default: "Submitted" },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const Report = model("Report", reportSchema);
