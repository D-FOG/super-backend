import { model, Schema, type InferSchemaType } from "mongoose";
import { ROLE_VALUES } from "../../constants/roles";

const lessonSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    thumbnailUrl: { type: String, trim: true },
    videoUrl: { type: String, required: true, trim: true },
    visibleTo: { type: [String], enum: ROLE_VALUES, default: [] }
  },
  { timestamps: true }
);

const manualSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    visibleTo: { type: [String], enum: ROLE_VALUES, default: [] }
  },
  { timestamps: true }
);

const lessonProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: "AcademyLesson", required: true },
    progress: { type: Number, min: 0, max: 100, default: 0 }
  },
  { timestamps: true }
);

lessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export type AcademyLessonDocument = InferSchemaType<typeof lessonSchema>;
export type AcademyManualDocument = InferSchemaType<typeof manualSchema>;
export type LessonProgressDocument = InferSchemaType<typeof lessonProgressSchema>;

export const AcademyLesson = model<AcademyLessonDocument>("AcademyLesson", lessonSchema);
export const AcademyManual = model<AcademyManualDocument>("AcademyManual", manualSchema);
export const LessonProgress = model<LessonProgressDocument>("LessonProgress", lessonProgressSchema);
