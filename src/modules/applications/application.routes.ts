import { Router } from "express";
import { z } from "zod";
import { ROLES } from "../../constants/roles";
import { requireAdmin, requireAuth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginate } from "../../utils/pagination";
import { objectIdSchema } from "../../utils/schema";
import { User } from "../users/user.model";
import { LeaderApplication } from "../leader-applications/leaderApplication.model";
import { PartnerApplication } from "../partner-applications/partnerApplication.model";

export const partnerApplicationsRouter = Router();
partnerApplicationsRouter.use(requireAuth);

partnerApplicationsRouter.post("/", validate(z.object({ body: z.object({
  occupation: z.string().min(2),
  location: z.string().min(1),
  reason: z.string().min(1),
  skills: z.string().optional()
}) })), asyncHandler(async (req, res) => {
  const application = await PartnerApplication.create({ ...req.body, userId: req.user?.id });
  sendSuccess(res, "Partner application submitted.", application, 201);
}));

partnerApplicationsRouter.get("/", requireAdmin, asyncHandler(async (req, res) => {
  const { items, meta } = await paginate(PartnerApplication, {}, req, ["userId", "reviewedBy"]);
  sendSuccess(res, "Partner applications loaded.", { data: items, meta });
}));

partnerApplicationsRouter.get("/:id", validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const application = await PartnerApplication.findById(req.params.id).lean();
  if (!application) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  if (String(application.userId) !== req.user?.id && !req.user?.roles.includes(ROLES.CLUSTER_SUPERVISOR)) {
    throw new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN");
  }
  sendSuccess(res, "Partner application loaded.", application);
}));

partnerApplicationsRouter.patch("/:id/status", requireAdmin, validate(z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({ status: z.enum(["Approved", "Rejected"]), reviewNote: z.string().optional() })
})), asyncHandler(async (req, res) => {
  const application = await PartnerApplication.findByIdAndUpdate(req.params.id, { ...req.body, reviewedBy: req.user?.id, reviewedAt: new Date() }, { new: true });
  if (!application) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  if (req.body.status === "Approved") await User.findByIdAndUpdate(application.userId, { $addToSet: { roles: ROLES.REGISTERED_PARTNER } });
  sendSuccess(res, "Partner application reviewed.", application);
}));

export const leaderApplicationsRouter = Router();

leaderApplicationsRouter.post("/", validate(z.object({ body: z.object({
  personalInfo: z.record(z.unknown()),
  background: z.string().min(1),
  location: z.record(z.unknown()),
  skills: z.array(z.string()).default([]),
  callingInterests: z.string().optional(),
  applicantUserId: objectIdSchema.optional()
}) })), asyncHandler(async (req, res) => {
  const application = await LeaderApplication.create(req.body);
  sendSuccess(res, "Leader application submitted.", { id: application._id, status: application.status, submittedAt: application.createdAt }, 201);
}));

leaderApplicationsRouter.get("/", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { items, meta } = await paginate(LeaderApplication, {}, req, ["applicantUserId", "reviewedBy"]);
  sendSuccess(res, "Leader applications loaded.", { data: items, meta });
}));

leaderApplicationsRouter.get("/:id", requireAuth, validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const application = await LeaderApplication.findById(req.params.id).lean();
  if (!application) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  if (String(application.applicantUserId ?? "") !== req.user?.id && !req.user?.roles.includes(ROLES.CLUSTER_SUPERVISOR)) {
    throw new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN");
  }
  sendSuccess(res, "Leader application loaded.", application);
}));

leaderApplicationsRouter.patch("/:id/status", requireAuth, requireAdmin, validate(z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({ status: z.enum(["Approved", "Rejected"]), reviewNote: z.string().optional() })
})), asyncHandler(async (req, res) => {
  const application = await LeaderApplication.findByIdAndUpdate(req.params.id, { ...req.body, reviewedBy: req.user?.id, reviewedAt: new Date() }, { new: true });
  if (!application) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  if (req.body.status === "Approved" && application.applicantUserId) {
    await User.findByIdAndUpdate(application.applicantUserId, { $addToSet: { roles: ROLES.CLUSTER_LEADER } });
  }
  sendSuccess(res, "Leader application reviewed.", application);
}));

const applicationsRouter = Router();
applicationsRouter.use(requireAuth);
applicationsRouter.get("/overview", requireAdmin, asyncHandler(async (_req, res) => {
  const [partners, leaders] = await Promise.all([PartnerApplication.countDocuments(), LeaderApplication.countDocuments()]);
  sendSuccess(res, "Applications overview loaded.", { partners, leaders });
}));

export default applicationsRouter;
