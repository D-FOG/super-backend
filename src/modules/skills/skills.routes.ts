import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginate } from "../../utils/pagination";
import { objectIdSchema } from "../../utils/schema";
import { User } from "../users/user.model";

const router = Router();
router.use(requireAuth);

const body = z.object({
  skills: z.array(z.string()).default([]),
  profession: z.string().optional(),
  trainingLevel: z.string().optional(),
  availability: z.string().optional(),
  category: z.string().optional()
});

router.get("/profiles", asyncHandler(async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (typeof req.query.search === "string") {
    filter.$or = [
      { name: new RegExp(req.query.search, "i") },
      { profession: new RegExp(req.query.search, "i") },
      { skills: new RegExp(req.query.search, "i") }
    ];
  }
  ["category", "trainingLevel", "availability", "profession"].forEach((field) => {
    if (typeof req.query[field] === "string") filter[field] = req.query[field];
  });
  const { items, meta } = await paginate(User, filter, req);
  sendSuccess(res, "Skills profiles loaded.", { data: items, meta });
}));

router.patch("/profiles/me", validate(z.object({ body })), asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user?.id, req.body, { new: true });
  sendSuccess(res, "Skills profile updated.", user);
}));

router.patch("/profiles/:userId", requireAdmin, validate(z.object({ params: z.object({ userId: objectIdSchema }), body })), asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.userId, req.body, { new: true });
  if (!user) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Skills profile updated.", user);
}));

export default router;
