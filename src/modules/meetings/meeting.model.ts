import { model, Schema, type InferSchemaType } from "mongoose";

const meetingSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    clusterCenterId: { type: Schema.Types.ObjectId, ref: "ClusterCenter", required: true },
    checkInWindowMinutes: { type: Number, default: 30 }
  },
  { timestamps: true }
);

export type MeetingDocument = InferSchemaType<typeof meetingSchema>;
export const Meeting = model<MeetingDocument>("Meeting", meetingSchema);
