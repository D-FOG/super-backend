import { model, Schema, type InferSchemaType } from "mongoose";

const examSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    durationMinutes: { type: Number, required: true },
    questions: { type: [Schema.Types.Mixed], default: [] }
  },
  { timestamps: true }
);

const examSessionSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    submittedAt: { type: Date },
    answers: { type: [Schema.Types.Mixed], default: [] },
    score: { type: Number }
  },
  { timestamps: true }
);

examSessionSchema.index({ examId: 1, userId: 1, submittedAt: 1 });

export type ExamDocument = InferSchemaType<typeof examSchema>;
export const Exam = model<ExamDocument>("Exam", examSchema);
export const ExamSession = model("ExamSession", examSessionSchema);
