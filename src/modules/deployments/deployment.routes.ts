import { Router } from "express";
import { z } from "zod";
import { LEADER_ROLES } from "../../constants/roles";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginate } from "../../utils/pagination";
import { objectIdSchema } from "../../utils/schema";
import { CommunityProject, OutreachActivity } from "./deployment.model";

const router = Router();
router.use(requireAuth);

const outreachBody = z.object({
  name: z.string().min(2),
  date: z.coerce.date(),
  status: z.enum(["Scheduled", "In Progress", "Complete"]).default("Scheduled"),
  clusterCenterId: objectIdSchema
});

const projectBody = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  status: z.enum(["Scheduled", "In Progress", "Complete"]).default("Scheduled"),
  progress: z.coerce.number().min(0).max(100).default(0),
  clusterCenterId: objectIdSchema,
  impactReport: z.string().optional()
});

router.get("/overview", asyncHandler(async (_req, res) => {
  const [outreach, projects, completeProjects] = await Promise.all([
    OutreachActivity.countDocuments(),
    CommunityProject.countDocuments(),
    CommunityProject.countDocuments({ status: "Complete" })
  ]);
  sendSuccess(res, "Deployment overview loaded.", { outreach, projects, completeProjects });
}));

router.get("/outreach", asyncHandler(async (req, res) => {
  const { items, meta } = await paginate(OutreachActivity, {}, req, ["clusterCenterId", "createdBy"]);
  sendSuccess(res, "Outreach activities loaded.", { data: items, meta });
}));

router.post("/outreach", requireRole(...LEADER_ROLES), validate(z.object({ body: outreachBody })), asyncHandler(async (req, res) => {
  const item = await OutreachActivity.create({ ...req.body, createdBy: req.user?.id });
  sendSuccess(res, "Outreach activity created.", item, 201);
}));

router.patch("/outreach/:id", requireRole(...LEADER_ROLES), validate(z.object({ params: z.object({ id: objectIdSchema }), body: outreachBody.partial() })), asyncHandler(async (req, res) => {
  const item = await OutreachActivity.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!item) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Outreach activity updated.", item);
}));

router.get("/projects", asyncHandler(async (req, res) => {
  const { items, meta } = await paginate(CommunityProject, {}, req, ["clusterCenterId", "createdBy", "volunteers"]);
  sendSuccess(res, "Community projects loaded.", { data: items, meta });
}));

router.post("/projects", requireRole(...LEADER_ROLES), validate(z.object({ body: projectBody })), asyncHandler(async (req, res) => {
  const item = await CommunityProject.create({ ...req.body, createdBy: req.user?.id });
  sendSuccess(res, "Community project created.", item, 201);
}));

router.patch("/projects/:id", requireRole(...LEADER_ROLES), validate(z.object({ params: z.object({ id: objectIdSchema }), body: projectBody.partial() })), asyncHandler(async (req, res) => {
  const item = await CommunityProject.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!item) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Community project updated.", item);
}));

export default router;
