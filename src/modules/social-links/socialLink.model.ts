import { model, Schema } from "mongoose";

const socialLinkSchema = new Schema(
  {
    platform: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const SocialLink = model("SocialLink", socialLinkSchema);
