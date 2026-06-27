import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../../../middlewares/auth";
import { validate } from "../../../middlewares/validate";
import { sendSuccess } from "../../../utils/apiResponse";
import { ApiError } from "../../../utils/apiError";
import { asyncHandler } from "../../../utils/asyncHandler";
import { paginate } from "../../../utils/pagination";
import { objectIdSchema } from "../../../utils/schema";
import { Quiz, QuizSubmission } from "./quiz.model";

const router = Router();
router.use(requireAuth);

const quizBody = z.object({
  title: z.string().min(2),
  questions: z.array(
    z.object({
      prompt: z.string().min(1),
      options: z.array(z.object({ label: z.string(), value: z.string().optional() })).min(2),
      correctOptionId: z.string().min(1)
    })
  )
});

router.get("/", asyncHandler(async (req, res) => {
  const { items, meta } = await paginate(Quiz, {}, req);
  sendSuccess(res, "Quizzes loaded.", { data: items, meta });
}));

router.post("/", requireAdmin, validate(z.object({ body: quizBody })), asyncHandler(async (req, res) => {
  const quiz = await Quiz.create(req.body);
  sendSuccess(res, "Quiz created.", quiz, 201);
}));

router.get("/:id", validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).lean();
  if (!quiz) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Quiz loaded.", quiz);
}));

router.post("/:id/submissions", validate(z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({ answers: z.array(z.object({ questionId: z.string(), optionId: z.string() })) })
})), asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).lean();
  if (!quiz) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  const total = quiz.questions.length;
  const correct = quiz.questions.filter((question) =>
    req.body.answers.some((answer: { questionId: string; optionId: string }) => answer.questionId === String(question._id) && answer.optionId === question.correctOptionId)
  ).length;
  const score = total ? Math.round((correct / total) * 100) : 0;
  const submission = await QuizSubmission.create({ quizId: quiz._id, userId: req.user?.id, answers: req.body.answers, score, correct, total, progress: 100 });
  sendSuccess(res, "Quiz submitted.", { submission, score, correct, total, progress: 100 }, 201);
}));

router.patch("/:id", requireAdmin, validate(z.object({ params: z.object({ id: objectIdSchema }), body: quizBody.partial() })), asyncHandler(async (req, res) => {
  const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!quiz) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Quiz updated.", quiz);
}));

router.delete("/:id", requireAdmin, validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const quiz = await Quiz.findByIdAndDelete(req.params.id);
  if (!quiz) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Quiz deleted.");
}));

export default router;
