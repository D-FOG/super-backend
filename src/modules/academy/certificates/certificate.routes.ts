import { Router } from "express";
import { z } from "zod";
import { ROLES } from "../../../constants/roles";
import { requireAdmin, requireAuth } from "../../../middlewares/auth";
import { validate } from "../../../middlewares/validate";
import { sendSuccess } from "../../../utils/apiResponse";
import { ApiError } from "../../../utils/apiError";
import { asyncHandler } from "../../../utils/asyncHandler";
import { paginate } from "../../../utils/pagination";
import { objectIdSchema } from "../../../utils/schema";
import { Certificate } from "./certificate.model";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const filter = req.user?.roles.includes(ROLES.CLUSTER_SUPERVISOR) ? {} : { userId: req.user?.id };
  const { items, meta } = await paginate(Certificate, filter, req, ["userId"]);
  sendSuccess(res, "Certificates loaded.", { data: items, meta });
}));

router.post("/", requireAdmin, validate(z.object({ body: z.object({
  userId: objectIdSchema,
  title: z.string().min(2),
  level: z.string().min(1),
  issuedAt: z.coerce.date(),
  certificateUrl: z.string().url().optional()
}) })), asyncHandler(async (req, res) => {
  const certificate = await Certificate.create(req.body);
  sendSuccess(res, "Certificate issued.", certificate, 201);
}));

router.get("/:id/download", validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const certificate = await Certificate.findById(req.params.id).lean();
  if (!certificate) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  const isOwner = String(certificate.userId) === req.user?.id;
  if (!isOwner && !req.user?.roles.includes(ROLES.CLUSTER_SUPERVISOR)) throw new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN");
  sendSuccess(res, "Certificate download URL generated.", { downloadUrl: certificate.certificateUrl });
}));

router.delete("/:id", requireAdmin, validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const certificate = await Certificate.findByIdAndUpdate(req.params.id, { revokedAt: new Date() }, { new: true });
  if (!certificate) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Certificate revoked.", certificate);
}));

export default router;
