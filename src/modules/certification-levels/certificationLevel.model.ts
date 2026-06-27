import { model, Schema } from "mongoose";

const certificationLevelSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
    requirements: { type: [Schema.Types.Mixed], default: [] }
  },
  { timestamps: true }
);

export const CertificationLevel = model("CertificationLevel", certificationLevelSchema);
