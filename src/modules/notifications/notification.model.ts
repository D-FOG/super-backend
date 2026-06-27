import { model, Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Notification = model("Notification", notificationSchema);
