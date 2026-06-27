import { Router, type Request } from "express";
import { z } from "zod";
import { LEADER_ROLES, ROLES } from "../../constants/roles";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { ApiError } from "../../utils/apiError";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginate } from "../../utils/pagination";
import { objectIdSchema } from "../../utils/schema";
import { Assignment } from "./assignment.model";

const router = Router();
router.use(requireAuth);

const body = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  dueDate: z.coerce.date(),
  assignedTo: objectIdSchema.optional(),
  clusterCenterId: objectIdSchema.optional(),
  status: z.enum(["Open", "In Progress", "Complete"]).default("Open"),
  completion: z.coerce.number().min(0).max(100).default(0)
});

function leaderFilter(req: Request) {
  if (req.user?.roles.includes(ROLES.CLUSTER_SUPERVISOR)) return {};
  return { createdBy: req.user?.id };
}

router.get(
  "/",
  requireRole(...LEADER_ROLES),
  asyncHandler(async (req, res) => {
    const { items, meta } = await paginate(Assignment, leaderFilter(req), req, ["assignedTo", "clusterCenterId", "createdBy"]);
    sendSuccess(res, "Assignments loaded.", { data: items, meta });
  })
);

router.post(
  "/",
  requireRole(...LEADER_ROLES),
  validate(z.object({ body })),
  asyncHandler(async (req, res) => {
    const assignment = await Assignment.create({ ...req.body, createdBy: req.user?.id });
    sendSuccess(res, "Assignment created.", assignment, 201);
  })
);

router.patch(
  "/:id",
  requireRole(...LEADER_ROLES),
  validate(z.object({ params: z.object({ id: objectIdSchema }), body: body.partial() })),
  asyncHandler(async (req, res) => {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
    if (String(assignment.createdBy) !== req.user?.id && !req.user?.roles.includes(ROLES.CLUSTER_SUPERVISOR)) {
      throw new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN");
    }
    Object.assign(assignment, req.body);
    await assignment.save();
    sendSuccess(res, "Assignment updated.", assignment);
  })
);

router.delete(
  "/:id",
  requireRole(...LEADER_ROLES),
  validate(z.object({ params: z.object({ id: objectIdSchema }) })),
  asyncHandler(async (req, res) => {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
    if (String(assignment.createdBy) !== req.user?.id && !req.user?.roles.includes(ROLES.CLUSTER_SUPERVISOR)) {
      throw new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN");
    }
    await assignment.deleteOne();
    sendSuccess(res, "Assignment deleted.");
  })
);

export default router;
