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
import { PrayerNetwork, ProjectUpdate } from "./communication.model";

export const prayerRouter = Router();
prayerRouter.use(requireAuth);

const prayerBody = z.object({ title: z.string().min(2), schedule: z.string().min(1), clusterCenterId: objectIdSchema });
prayerRouter.get("/", asyncHandler(async (req, res) => {
  const { items, meta } = await paginate(PrayerNetwork, {}, req, ["clusterCenterId", "createdBy"]);
  sendSuccess(res, "Prayer networks loaded.", { data: items, meta });
}));
prayerRouter.post("/", requireRole(...LEADER_ROLES), validate(z.object({ body: prayerBody })), asyncHandler(async (req, res) => {
  const item = await PrayerNetwork.create({ ...req.body, createdBy: req.user?.id });
  sendSuccess(res, "Prayer network created.", item, 201);
}));
prayerRouter.patch("/:id", requireRole(...LEADER_ROLES), validate(z.object({ params: z.object({ id: objectIdSchema }), body: prayerBody.partial() })), asyncHandler(async (req, res) => {
  const item = await PrayerNetwork.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!item) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Prayer network updated.", item);
}));
prayerRouter.delete("/:id", requireRole(ROLES.CLUSTER_SUPERVISOR), validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const item = await PrayerNetwork.findByIdAndDelete(req.params.id);
  if (!item) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Prayer network deleted.");
}));

export const projectUpdateRouter = Router();
projectUpdateRouter.use(requireAuth);
const updateBody = z.object({ title: z.string().min(2), body: z.string().min(1), projectId: objectIdSchema });
projectUpdateRouter.get("/", asyncHandler(async (req, res) => {
  const { items, meta } = await paginate(ProjectUpdate, {}, req, ["author", "projectId"]);
  sendSuccess(res, "Project updates loaded.", { data: items, meta });
}));
projectUpdateRouter.post("/", requireRole(...LEADER_ROLES), validate(z.object({ body: updateBody })), asyncHandler(async (req, res) => {
  const item = await ProjectUpdate.create({ ...req.body, author: req.user?.id });
  sendSuccess(res, "Project update created.", item, 201);
}));
projectUpdateRouter.patch("/:id", validate(z.object({ params: z.object({ id: objectIdSchema }), body: updateBody.partial() })), asyncHandler(async (req, res) => {
  const existing = await ProjectUpdate.findById(req.params.id);
  if (!existing) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  if (String(existing.author) !== req.user?.id && !req.user?.roles.includes(ROLES.CLUSTER_SUPERVISOR)) {
    throw new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN");
  }
  Object.assign(existing, req.body);
  await existing.save();
  sendSuccess(res, "Project update updated.", existing);
}));
projectUpdateRouter.delete("/:id", requireRole(ROLES.CLUSTER_SUPERVISOR), validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const item = await ProjectUpdate.findByIdAndDelete(req.params.id);
  if (!item) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Project update deleted.");
}));

const communicationRouter = Router();
communicationRouter.use(requireAuth);
communicationRouter.get("/overview", (_req, res) => sendSuccess(res, "Communication modules loaded.", { modules: ["announcements", "prayer-networks", "project-updates", "leader-forums"] }));

export default communicationRouter;
