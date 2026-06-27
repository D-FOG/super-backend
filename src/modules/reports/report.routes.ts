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
import { Report } from "./report.model";

const router = Router();
router.use(requireAuth);

const body = z.object({
  type: z.enum(["Weekly", "Monthly"]),
  clusterCenterId: objectIdSchema,
  summary: z.string().min(1),
  metrics: z.record(z.unknown()).default({}),
  challenges: z.string().optional(),
  needs: z.string().optional(),
  status: z.enum(["Draft", "Submitted"]).default("Submitted")
});

router.get("/", requireRole(...LEADER_ROLES), asyncHandler(async (req, res) => {
  const filter = req.user?.roles.includes(ROLES.CLUSTER_SUPERVISOR) ? {} : { author: req.user?.id };
  const { items, meta } = await paginate(Report, filter, req, ["clusterCenterId", "author"]);
  sendSuccess(res, "Reports loaded.", { data: items, meta });
}));

router.post("/", requireRole(...LEADER_ROLES), validate(z.object({ body })), asyncHandler(async (req, res) => {
  const report = await Report.create({ ...req.body, author: req.user?.id });
  sendSuccess(res, "Report submitted.", report, 201);
}));

router.get("/:id", requireRole(...LEADER_ROLES), validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id).lean();
  if (!report) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  if (String(report.author) !== req.user?.id && !req.user?.roles.includes(ROLES.CLUSTER_SUPERVISOR)) throw new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN");
  sendSuccess(res, "Report loaded.", report);
}));

router.patch("/:id", requireRole(...LEADER_ROLES), validate(z.object({ params: z.object({ id: objectIdSchema }), body: body.partial() })), asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  if (String(report.author) !== req.user?.id) throw new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN");
  Object.assign(report, req.body);
  await report.save();
  sendSuccess(res, "Report updated.", report);
}));

router.delete("/:id", requireRole(...LEADER_ROLES), validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  if (String(report.author) !== req.user?.id && !req.user?.roles.includes(ROLES.CLUSTER_SUPERVISOR)) throw new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN");
  await report.deleteOne();
  sendSuccess(res, "Report deleted.");
}));

export default router;
