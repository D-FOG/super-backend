import { Router } from "express";
import { z } from "zod";
import { LEADER_ROLES, ROLES } from "../../constants/roles";
import { requireAdmin, requireAuth, requireRole } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginate } from "../../utils/pagination";
import { objectIdSchema } from "../../utils/schema";
import { normalizeLeaderApplicationPayload } from "../../utils/leaderApplication";
import { sendLeaderApplicationDecisionEmail, sendLeaderApplicationSubmittedEmail } from "../../utils/mail";
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

const seedLeader = asyncHandler(async (_req, res) => {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(403, "Seed endpoint is disabled in production.", "FORBIDDEN");
  }

  const existing = await User.findOne({ email: "leader@example.com" });
  if (existing) {
    sendSuccess(res, "Seed leader already exists.", { user: existing });
    return;
  }

  const user = await User.create({
    name: "Seed Leader",
    email: "leader@example.com",
    password: "Leader123!",
    roles: [ROLES.CLUSTER_LEADER],
    trainingLevel: "Lead Ready",
    certificationLevel: "Cluster Leader"
  });

  sendSuccess(res, "Seed leader created.", { user });
});

leaderApplicationsRouter.route("/seed-leader").get(seedLeader).post(seedLeader);

leaderApplicationsRouter.post("/", validate(z.object({ body: z.object({
  personalInfo: z.record(z.unknown()).optional(),
  background: z.string().optional(),
  location: z.union([z.record(z.unknown()), z.string()]).optional(),
  skills: z.union([z.array(z.string()), z.string()]).optional(),
  callingInterests: z.string().optional(),
  applicantUserId: objectIdSchema.optional()
}).passthrough() })), asyncHandler(async (req, res) => {
  const normalized = normalizeLeaderApplicationPayload(req.body as Record<string, unknown>);
  const application = await LeaderApplication.create(normalized);
  const applicantEmail = application.personalInfo?.email ? String(application.personalInfo.email) : undefined;
  if (applicantEmail) {
    await sendLeaderApplicationSubmittedEmail(applicantEmail);
  }
  sendSuccess(res, "Leader application submitted.", { id: application._id, status: application.status, submittedAt: application.createdAt }, 201);
}));

leaderApplicationsRouter.get("/", requireAuth, requireRole(...LEADER_ROLES), asyncHandler(async (req, res) => {
  const { items, meta } = await paginate(LeaderApplication, {}, req, ["applicantUserId", "reviewedBy"]);
  sendSuccess(res, "Leader applications loaded.", { data: items, meta });
}));

leaderApplicationsRouter.get("/:id", requireAuth, validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const application = await LeaderApplication.findById(req.params.id).lean();
  if (!application) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  const canReviewLeaders = req.user?.roles.some((role) => LEADER_ROLES.includes(role));
  if (String(application.applicantUserId ?? "") !== req.user?.id && !canReviewLeaders) {
    throw new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN");
  }
  sendSuccess(res, "Leader application loaded.", application);
}));

leaderApplicationsRouter.patch("/:id/status", requireAuth, requireRole(...LEADER_ROLES), validate(z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({ status: z.enum(["Approved", "Rejected"]), reviewNote: z.string().optional() })
})), asyncHandler(async (req, res) => {
  const application = await LeaderApplication.findByIdAndUpdate(req.params.id, { ...req.body, reviewedBy: req.user?.id, reviewedAt: new Date() }, { new: true });
  if (!application) throw new ApiError(404, "Resource not found.", "NOT_FOUND");

  const applicantEmail = application.personalInfo?.email ? String(application.personalInfo.email) : undefined;
  if (req.body.status === "Approved" && application.applicantUserId) {
    await User.findByIdAndUpdate(application.applicantUserId, { $addToSet: { roles: ROLES.CLUSTER_LEADER } });
  }

  if (applicantEmail) {
    await sendLeaderApplicationDecisionEmail(applicantEmail, req.body.status, req.body.reviewNote);
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
