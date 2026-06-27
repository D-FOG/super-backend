import { model, Schema, type InferSchemaType } from "mongoose";

const optionSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, auto: true },
    label: { type: String, required: true },
    value: { type: String }
  },
  { _id: true }
);

const questionSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, auto: true },
    prompt: { type: String, required: true },
    options: { type: [optionSchema], default: [] },
    correctOptionId: { type: String, required: true }
  },
  { _id: true }
);

const quizSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    questions: { type: [questionSchema], default: [] }
  },
  { timestamps: true }
);

const quizSubmissionSchema = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    answers: { type: [{ questionId: String, optionId: String }], default: [] },
    score: { type: Number, required: true },
    correct: { type: Number, required: true },
    total: { type: Number, required: true },
    progress: { type: Number, default: 100 }
  },
  { timestamps: true }
);

export type QuizDocument = InferSchemaType<typeof quizSchema>;
export const Quiz = model<QuizDocument>("Quiz", quizSchema);
export const QuizSubmission = model("QuizSubmission", quizSubmissionSchema);
