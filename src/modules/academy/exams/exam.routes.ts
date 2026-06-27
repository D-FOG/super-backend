import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../../../middlewares/auth";
import { validate } from "../../../middlewares/validate";
import { sendSuccess } from "../../../utils/apiResponse";
import { ApiError } from "../../../utils/apiError";
import { asyncHandler } from "../../../utils/asyncHandler";
import { paginate } from "../../../utils/pagination";
import { objectIdSchema } from "../../../utils/schema";
import { Exam, ExamSession } from "./exam.model";

const router = Router();
router.use(requireAuth);

const examBody = z.object({
  title: z.string().min(2),
  durationMinutes: z.coerce.number().int().positive(),
  questions: z.array(z.unknown()).default([])
});

router.get("/", asyncHandler(async (req, res) => {
  const { items, meta } = await paginate(Exam, {}, req);
  sendSuccess(res, "Exams loaded.", { data: items, meta });
}));

router.post("/", requireAdmin, validate(z.object({ body: examBody })), asyncHandler(async (req, res) => {
  const exam = await Exam.create(req.body);
  sendSuccess(res, "Exam created.", exam, 201);
}));

router.get("/:id/session", validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id).lean();
  if (!exam) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  const existing = await ExamSession.findOne({ examId: exam._id, userId: req.user?.id, submittedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
  const session = existing ?? await ExamSession.create({
    examId: exam._id,
    userId: req.user?.id,
    expiresAt: new Date(Date.now() + exam.durationMinutes * 60 * 1000)
  });
  sendSuccess(res, "Exam session loaded.", { sessionId: session._id, expiresAt: session.expiresAt, questions: exam.questions });
}));

router.post("/:id/submissions", validate(z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({ answers: z.array(z.unknown()) })
})), asyncHandler(async (req, res) => {
  const session = await ExamSession.findOneAndUpdate(
    { examId: req.params.id, userId: req.user?.id, submittedAt: { $exists: false } },
    { answers: req.body.answers, submittedAt: new Date() },
    { new: true }
  );
  if (!session) throw new ApiError(404, "No active exam session found.", "NOT_FOUND");
  sendSuccess(res, "Exam submitted.", session, 201);
}));

router.patch("/:id", requireAdmin, validate(z.object({ params: z.object({ id: objectIdSchema }), body: examBody.partial() })), asyncHandler(async (req, res) => {
  const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!exam) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Exam updated.", exam);
}));

router.delete("/:id", requireAdmin, validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const exam = await Exam.findByIdAndDelete(req.params.id);
  if (!exam) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Exam deleted.");
}));

export default router;
