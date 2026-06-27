import { model, Schema } from "mongoose";
import { ROLE_VALUES } from "../../constants/roles";

const announcementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    audienceRoles: { type: [String], enum: ROLE_VALUES, default: [] },
    publishAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const Announcement = model("Announcement", announcementSchema);
