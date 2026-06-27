import { model, Schema } from "mongoose";

const replySchema = new Schema(
  {
    body: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const threadSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    replies: { type: [replySchema], default: [] }
  },
  { timestamps: true }
);

export const LeaderForumThread = model("LeaderForumThread", threadSchema);
