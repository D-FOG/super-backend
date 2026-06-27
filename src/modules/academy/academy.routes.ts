import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginate } from "../../utils/pagination";
import { objectIdSchema, roleSchema } from "../../utils/schema";
import { Certificate } from "./certificates/certificate.model";
import { Exam } from "./exams/exam.model";
import { Quiz } from "./quizzes/quiz.model";
import { AcademyLesson, AcademyManual, LessonProgress } from "./academy.model";

const router = Router();
router.use(requireAuth);

const visibleTo = z.array(roleSchema).default([]);
const lessonBody = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  videoUrl: z.string().url(),
  visibleTo
});
const manualBody = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  fileUrl: z.string().url(),
  visibleTo
});

router.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const [lessons, manuals, quizzes, exams, certificates] = await Promise.all([
      AcademyLesson.countDocuments(),
      AcademyManual.countDocuments(),
      Quiz.countDocuments(),
      Exam.countDocuments(),
      Certificate.countDocuments()
    ]);
    sendSuccess(res, "Academy overview loaded.", { lessons, manuals, quizzes, exams, certificates });
  })
);

router.get(
  "/lessons",
  asyncHandler(async (req, res) => {
    const { items, meta } = await paginate(AcademyLesson, { $or: [{ visibleTo: { $size: 0 } }, { visibleTo: { $in: req.user?.roles ?? [] } }] }, req);
    sendSuccess(res, "Lessons loaded.", { data: items, meta });
  })
);

router.post(
  "/lessons",
  requireAdmin,
  validate(z.object({ body: lessonBody })),
  asyncHandler(async (req, res) => {
    const lesson = await AcademyLesson.create(req.body);
    sendSuccess(res, "Lesson created.", lesson, 201);
  })
);

router.patch(
  "/lessons/:id/progress",
  validate(z.object({ params: z.object({ id: objectIdSchema }), body: z.object({ progress: z.coerce.number().min(0).max(100) }) })),
  asyncHandler(async (req, res) => {
    const progress = await LessonProgress.findOneAndUpdate(
      { lessonId: req.params.id, userId: req.user?.id },
      { progress: req.body.progress },
      { upsert: true, new: true }
    );
    sendSuccess(res, "Lesson progress updated.", progress);
  })
);

router.get(
  "/manuals",
  asyncHandler(async (req, res) => {
    const { items, meta } = await paginate(AcademyManual, { $or: [{ visibleTo: { $size: 0 } }, { visibleTo: { $in: req.user?.roles ?? [] } }] }, req);
    sendSuccess(res, "Manuals loaded.", { data: items, meta });
  })
);

router.post(
  "/manuals",
  requireAdmin,
  validate(z.object({ body: manualBody })),
  asyncHandler(async (req, res) => {
    const manual = await AcademyManual.create(req.body);
    sendSuccess(res, "Manual created.", manual, 201);
  })
);

export default router;
