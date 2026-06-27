import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginate } from "../../utils/pagination";
import { storageProvider } from "../../utils/uploadStorage";
import { AcademyLesson, AcademyManual } from "../academy/academy.model";
import { LeaderApplication } from "../leader-applications/leaderApplication.model";
import { Meeting } from "../meetings/meeting.model";
import { PartnerApplication } from "../partner-applications/partnerApplication.model";
import { Report } from "../reports/report.model";
import { Resource } from "../resources/resource.model";
import { User } from "../users/user.model";
import { ClusterCenter } from "../cluster-centers/clusterCenter.model";
import { AuditLog } from "./auditLog.model";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/overview", asyncHandler(async (_req, res) => {
  const [users, centers, partnerApplications, leaderApplications, resources, meetings, reports, lessons, manuals] = await Promise.all([
    User.countDocuments(),
    ClusterCenter.countDocuments(),
    PartnerApplication.countDocuments(),
    LeaderApplication.countDocuments(),
    Resource.countDocuments(),
    Meeting.countDocuments(),
    Report.countDocuments(),
    AcademyLesson.countDocuments(),
    AcademyManual.countDocuments()
  ]);
  sendSuccess(res, "Admin overview loaded.", { users, centers, applications: partnerApplications + leaderApplications, resources, meetings, reports, lessons, manuals });
}));

router.get("/audit-logs", asyncHandler(async (req, res) => {
  const { items, meta } = await paginate(AuditLog, {}, req, ["actor"]);
  sendSuccess(res, "Audit logs loaded.", { data: items, meta });
}));

router.post("/uploads/sign", validate(z.object({ body: z.object({
  fileName: z.string().min(1),
  contentType: z.enum(["video/mp4", "application/pdf", "audio/mpeg"]),
  folder: z.enum(["resources", "academy", "certificates"])
}) })), asyncHandler(async (req, res) => {
  const signed = await storageProvider.createSignedUpload(req.body);
  sendSuccess(res, "Signed upload URL created.", signed, 201);
}));

export default router;
