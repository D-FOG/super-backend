import { model, Schema } from "mongoose";

const leaderApplicationSchema = new Schema(
  {
    applicantUserId: { type: Schema.Types.ObjectId, ref: "User" },
    personalInfo: { type: Schema.Types.Mixed, required: true },
    background: { type: String, required: true },
    location: { type: Schema.Types.Mixed, required: true },
    skills: { type: [String], default: [] },
    callingInterests: { type: String },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    reviewNote: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date }
  },
  { timestamps: true }
);

export const LeaderApplication = model("LeaderApplication", leaderApplicationSchema);
