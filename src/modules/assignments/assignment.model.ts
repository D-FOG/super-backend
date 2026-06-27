import { model, Schema } from "mongoose";

const assignmentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    dueDate: { type: Date, required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    clusterCenterId: { type: Schema.Types.ObjectId, ref: "ClusterCenter" },
    status: { type: String, enum: ["Open", "In Progress", "Complete"], default: "Open" },
    completion: { type: Number, min: 0, max: 100, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const Assignment = model("Assignment", assignmentSchema);
