import { Router } from "express";
import { z } from "zod";
import { LEADER_ROLES, ROLES } from "../../constants/roles";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginate } from "../../utils/pagination";
import { objectIdSchema } from "../../utils/schema";
import { LeaderForumThread } from "./leaderForum.model";

const router = Router();
router.use(requireAuth, requireRole(...LEADER_ROLES));

const body = z.object({ title: z.string().min(2), body: z.string().min(1) });

router.get("/threads", asyncHandler(async (req, res) => {
  const { items, meta } = await paginate(LeaderForumThread, {}, req, ["author"]);
  sendSuccess(res, "Leader forum threads loaded.", { data: items, meta });
}));

router.post("/threads", validate(z.object({ body })), asyncHandler(async (req, res) => {
  const thread = await LeaderForumThread.create({ ...req.body, author: req.user?.id });
  sendSuccess(res, "Leader forum thread created.", thread, 201);
}));

router.get("/threads/:id", validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const thread = await LeaderForumThread.findById(req.params.id).populate("author replies.author").lean();
  if (!thread) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Leader forum thread loaded.", thread);
}));

router.post("/threads/:id/replies", validate(z.object({ params: z.object({ id: objectIdSchema }), body: z.object({ body: z.string().min(1) }) })), asyncHandler(async (req, res) => {
  const thread = await LeaderForumThread.findByIdAndUpdate(req.params.id, { $push: { replies: { body: req.body.body, author: req.user?.id } } }, { new: true });
  if (!thread) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Reply added.", thread, 201);
}));

router.delete("/threads/:id", requireRole(ROLES.CLUSTER_SUPERVISOR), validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const thread = await LeaderForumThread.findByIdAndDelete(req.params.id);
  if (!thread) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Leader forum thread deleted.");
}));

export default router;
