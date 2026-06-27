import { model, Schema, type InferSchemaType } from "mongoose";

const attendanceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },
    checkInTime: { type: Date, required: true },
    date: { type: Date, required: true }
  },
  { timestamps: true }
);

attendanceSchema.index({ userId: 1, meetingId: 1 }, { unique: true });

export type AttendanceDocument = InferSchemaType<typeof attendanceSchema>;
export const Attendance = model<AttendanceDocument>("Attendance", attendanceSchema);
