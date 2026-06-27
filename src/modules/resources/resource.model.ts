import { model, Schema, type InferSchemaType } from "mongoose";
import { ROLE_VALUES } from "../../constants/roles";

const resourceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: ["Video", "PDF", "MP3", "video", "pdf", "audio"], required: true },
    fileUrl: { type: String, required: true },
    visibleTo: { type: [String], enum: ROLE_VALUES, default: [] },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export type ResourceDocument = InferSchemaType<typeof resourceSchema>;
export const Resource = model<ResourceDocument>("Resource", resourceSchema);
