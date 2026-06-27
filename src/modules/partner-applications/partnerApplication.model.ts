import { model, Schema } from "mongoose";

const partnerApplicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    occupation: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    reason: { type: String, required: true },
    skills: { type: String },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    reviewNote: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date }
  },
  { timestamps: true }
);

export const PartnerApplication = model("PartnerApplication", partnerApplicationSchema);
