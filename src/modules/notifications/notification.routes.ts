import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginate } from "../../utils/pagination";
import { objectIdSchema } from "../../utils/schema";
import { Notification } from "./notification.model";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const { items, meta } = await paginate(Notification, { userId: req.user?.id }, req);
  sendSuccess(res, "Notifications loaded.", { data: items, meta });
}));

router.patch("/:id/read", validate(z.object({ params: z.object({ id: objectIdSchema }) })), asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user?.id }, { read: true }, { new: true });
  if (!notification) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
  sendSuccess(res, "Notification marked read.", notification);
}));

router.patch("/read-all", asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user?.id }, { read: true });
  sendSuccess(res, "All notifications marked read.");
}));

export default router;
